/**
 * Utility for calculating Product FOB in INR based on pro-rated Total FOB.
 *
 * Formula:
 * A = Product Amount (Invoice Currency)
 * B = Total Product Value for Invoice (Invoice Currency)
 * C (Ratio) = A / B
 * TotalFOB_INR = Total FOB gathered from activeInvoice.freightInsuranceCharges
 * Product_FOB_INR = C * TotalFOB_INR
 */

export const calculateProductFobINR = (
  product,
  activeInvoice,
  invoiceExchangeRate
) => {
  if (!product || !activeInvoice) return 0;

  const A = parseFloat(product.amount || 0);
  const B = parseFloat(activeInvoice.productValue || 0);

  if (B <= 0 || A <= 0) return 0;

  const C = A / B;
  const charges = activeInvoice.freightInsuranceCharges || {};
  const invToInrRate = parseFloat(invoiceExchangeRate) || 1;

  // The base gross value for evaluating Total FOB is the INVOICE VALUE (matching InvoiceFreightTab.js)
  const grossInvoiceValue = parseFloat(activeInvoice.invoiceValue || activeInvoice.productValue || 0);

  // Calculate Total FOB natively to avoid relying on InvoiceFreightTab being mounted
  const totalValueInr = grossInvoiceValue * invToInrRate;
  let totalDeductionInr = 0;

  ["freight", "insurance", "commission"].forEach(k => {
    const row = charges[k] || {};

    const fallbackRate = (row.currency || activeInvoice.currency || "INR").toUpperCase() === "INR" ? 1 : invToInrRate;
    const rowRate = parseFloat(row.exchangeRate) || fallbackRate;

    const ratePercent = parseFloat(row.rate) || 0;
    let rowAmountInr = 0;

    if (ratePercent > 0) {
      rowAmountInr = totalValueInr * (ratePercent / 100);
    } else {
      const explicitAmount = parseFloat(row.amount) || 0;
      rowAmountInr = explicitAmount * rowRate;
    }

    if (k === "commission") {
      const threshold = 0.125 * totalValueInr;
      if (rowAmountInr > threshold) {
        totalDeductionInr += (rowAmountInr - threshold);
      }
    } else {
      totalDeductionInr += rowAmountInr;
    }
  });

  const totalFobInr = totalValueInr - totalDeductionInr;

  const productFobInr = C * totalFobInr;
  return parseFloat(productFobInr.toFixed(2));
};

export const calculateDbkAmount = (fob, qty, rate, cap) => {
  const a = (fob * rate) / 100;
  const b = qty * cap;
  if (cap > 0) return Math.min(a, b).toFixed(2);
  return a.toFixed(2);
};

export const calculateRosctlAmount = (fob, qty, slRate, ctlRate, slCap, ctlCap) => {
  const a = (fob * (slRate + ctlRate)) / 100;
  const b = qty * (slCap + ctlCap);
  if (slCap + ctlCap > 0) return Math.min(a, b).toFixed(2);
  return a.toFixed(2);
};

export const calculateRodtepAmount = (fob, qty, rate, cap) => {
  const a = (fob * rate) / 100;
  const b = qty * cap;
  if (cap > 0) return Math.min(a, b).toFixed(2);
  return a.toFixed(2);
};

export const syncAllProductsDrawbackAndRodtep = (invoices, exchange_rate) => {
  if (!invoices || !Array.isArray(invoices)) return invoices;

  return invoices.map((inv) => {
    if (!inv.products || !Array.isArray(inv.products)) return inv;

    const updatedProducts = inv.products.map((product) => {
      const pQty = product.isSqcQuantityManual ? (parseFloat(product.socQuantity) || 0) : (parseFloat(product.socQuantity || product.quantity) || 0);
      const pUnit = product.isSqcUnitManual ? (product.socunit || "") : (product.socunit || product.qtyUnit || "");
      const fobAmountInr = calculateProductFobINR(product, inv, exchange_rate);

      // Re-map Drawback & RoSCTL Details completely
      let newDbkDetails = product.drawbackDetails;
      if (Array.isArray(newDbkDetails)) {
        newDbkDetails = newDbkDetails.map(item => {
          let newItem = { ...item };
          const qty = item.manualQuantity ? (item.quantity || 0) : pQty;
          const unit = item.manualUnit ? (item.unit || "") : pUnit;

          newItem.quantity = qty;
          newItem.unit = unit;
          newItem.dbkCapunit = unit;
          newItem.fobValue = fobAmountInr.toFixed(2);

          newItem.dbkAmount = calculateDbkAmount(fobAmountInr, qty, parseFloat(newItem.dbkRate || 0), parseFloat(newItem.dbkCap || 0));

          if (newItem.showRosctl) {
            newItem.rosctlAmount = calculateRosctlAmount(
              fobAmountInr, qty,
              parseFloat(newItem.slRate || 0), parseFloat(newItem.ctlRate || 0),
              parseFloat(newItem.slCap || 0), parseFloat(newItem.ctlCap || 0)
            );
          }
          return newItem;
        });
      }

      // Re-calculate RoSCTL product total
      let newRosctlInfo = product.rosctlInfo;
      if (Array.isArray(newDbkDetails)) {
        const totalRosctlAmount = newDbkDetails.reduce((sum, item) => sum + (parseFloat(item.rosctlAmount) || 0), 0);
        const hasRosctl = newDbkDetails.some((item) => item.showRosctl);
        const firstRosctl = newDbkDetails.find((item) => item.showRosctl) || {};

        newRosctlInfo = {
          ...newRosctlInfo,
          claim: hasRosctl ? "Yes" : "No",
          amountINR: totalRosctlAmount.toFixed(2),
          slRate: String(firstRosctl.slRate || "0"),
          slCap: String(firstRosctl.slCap || "0"),
          ctlRate: String(firstRosctl.ctlRate || "0"),
          ctlCap: String(firstRosctl.ctlCap || "0"),
          category: firstRosctl.rosctlCategory || "",
        };
      }

      // Re-calculate RoDTEP product total
      let newRodtepInfo = product.rodtepInfo;
      if (newRodtepInfo && newRodtepInfo.rate) {
        newRodtepInfo = { ...newRodtepInfo };
        newRodtepInfo.quantity = pQty;
        newRodtepInfo.unit = pUnit;
        if (!newRodtepInfo.isCapUnitManual) {
          newRodtepInfo.capUnit = pUnit;
        }
        newRodtepInfo.fobValue = fobAmountInr.toFixed(2);

        newRodtepInfo.amountINR = calculateRodtepAmount(
          fobAmountInr,
          pQty,
          parseFloat(newRodtepInfo.rate || 0),
          parseFloat(newRodtepInfo.cap || 0)
        );
      }

      return {
        ...product,
        drawbackDetails: newDbkDetails,
        rosctlInfo: newRosctlInfo,
        rodtepInfo: newRodtepInfo
      };
    });

    return { ...inv, products: updatedProducts };
  });
};
