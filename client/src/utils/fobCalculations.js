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

export const calculateInvoiceFob = (activeInvoice, invoiceExchangeRate) => {
  if (!activeInvoice) return { totalFobInr: 0, totalFobInvCurr: 0 };
  let invToInrRate = parseFloat(invoiceExchangeRate) || 1;
  const invCurr = String(activeInvoice.currency || "").toUpperCase();
  if ((invCurr === "JPY" || invCurr === "KRW") && invToInrRate > 5) {
    invToInrRate = invToInrRate / 100;
  }
  const grossInvoiceValue = parseFloat(activeInvoice.invoiceValue || activeInvoice.productValue || 0);
  const totalValueInr = grossInvoiceValue * invToInrRate;
  let totalDeductionInr = 0;
  const charges = activeInvoice.freightInsuranceCharges || {};
  const invoiceTerms = String(activeInvoice.termsOfInvoice || "").toUpperCase();
  const deductFreightInsurance =
    ["CIF", "C&F", "C&I", "CIP", "CPT", "DAP", "DDP", "DPU"].includes(invoiceTerms) ||
    invoiceTerms.includes("CIF") ||
    invoiceTerms.includes("C&F");

  ["freight", "insurance", "commission"].forEach((k) => {
    const row = charges[k] || {};
    const rowCurr = String(row.currency || activeInvoice.currency || "INR").toUpperCase();
    const fallbackRate = rowCurr === "INR" ? 1 : invToInrRate;
    let rowRate = parseFloat(row.exchangeRate) || fallbackRate;
    if ((rowCurr === "JPY" || rowCurr === "KRW") && rowRate > 5) {
      rowRate = rowRate / 100;
    }
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
        totalDeductionInr += rowAmountInr - threshold;
      }
    } else if (k === "freight" || k === "insurance") {
      if (deductFreightInsurance) {
        totalDeductionInr += rowAmountInr;
      }
    }
  });

  const totalFobInr = Math.max(0, totalValueInr - totalDeductionInr);
  const totalFobInvCurr = invToInrRate > 0 ? totalFobInr / invToInrRate : totalFobInr;
  return {
    totalFobInr: parseFloat(totalFobInr.toFixed(2)),
    totalFobInvCurr: parseFloat(totalFobInvCurr.toFixed(2)),
  };
};

export const calculateProductFobINR = (
  product,
  activeInvoice,
  invoiceExchangeRate
) => {
  if (!product || !activeInvoice) return 0;

  const A = parseFloat(product.amount || 0);

  // Derive total product amount across all products belonging to this invoice
  let B = 0;
  if (Array.isArray(activeInvoice.products) && activeInvoice.products.length > 0) {
    B = activeInvoice.products.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  }
  if (!B || B <= 0) {
    B = parseFloat(activeInvoice.productValue || activeInvoice.invoiceValue || 0);
  }

  if (B <= 0 || A <= 0) return 0;

  const C = A / B;
  const { totalFobInr } = calculateInvoiceFob(activeInvoice, invoiceExchangeRate);
  const productFobInr = C * totalFobInr;
  return parseFloat(productFobInr.toFixed(2));
};

export const calculateDbkAmount = (fob, qty, rate, cap) => {
  const a = (fob * rate) / 100;
  const b = qty * cap;
  let calcAmt = 0;
  if (rate > 0 && cap > 0) {
    calcAmt = Math.min(a, b);
  } else if (rate > 0) {
    calcAmt = a;
  } else if (cap > 0) {
    calcAmt = b;
  }
  if (calcAmt < 50) return "0.00";
  return calcAmt.toFixed(2);
};

export const calculateRosctlAmount = (fob, qty, slRate, ctlRate, slCap, ctlCap) => {
  const a = (fob * (slRate + ctlRate)) / 100;
  const b = qty * (slCap + ctlCap);
  if (slCap + ctlCap > 0) return Math.min(a, b).toFixed(2);
  return a.toFixed(2);
};

export const calculateRodtepAmount = (fob, qty, rate, cap) => {
  const rateAmount = fob * (rate / 100);
  let capAmount = Infinity;
  if (cap > 0) {
    capAmount = qty * cap;
  }
  if (rateAmount === 0 && capAmount === Infinity) {
    return 0;
  }
  const finalAmount = Math.min(
    rateAmount,
    capAmount === Infinity ? rateAmount : capAmount
  );
  return parseFloat(finalAmount.toFixed(2));
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
          const qty = item.manualQuantity ? (parseFloat(item.quantity) || 0) : pQty;
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
      if (newRodtepInfo) {
        newRodtepInfo = { ...newRodtepInfo };
        const rodRate = parseFloat(newRodtepInfo.ratePercent ?? newRodtepInfo.rate ?? 0);
        const rodCap = parseFloat(newRodtepInfo.capValuePerUnits ?? newRodtepInfo.cap ?? 0);
        const rodQty = parseFloat(newRodtepInfo.quantity ?? pQty ?? 0);

        newRodtepInfo.quantity = rodQty;
        if (!newRodtepInfo.unit) newRodtepInfo.unit = pUnit;
        if (!newRodtepInfo.isCapUnitManual) {
          newRodtepInfo.capUnit = pUnit;
        }
        newRodtepInfo.fobValue = fobAmountInr.toFixed(2);

        if (newRodtepInfo.claim === "No" || newRodtepInfo.claim === "Not Applicable") {
          newRodtepInfo.amountINR = 0;
        } else {
          newRodtepInfo.amountINR = calculateRodtepAmount(
            fobAmountInr,
            rodQty,
            rodRate,
            rodCap
          );
        }
      }

      // Re-calculate PMV if method is percentage
      let newPmvInfo = product.pmvInfo;
      if (newPmvInfo && (newPmvInfo.calculationMethod || "percentage") === "percentage") {
        const pmvCurrency = newPmvInfo.currency || "INR";
        const percentage = parseFloat(newPmvInfo.percentage) || 110;
        const quantity = parseFloat(product.quantity) || 1;

        let rate = 1;
        if (pmvCurrency.toUpperCase() !== "INR") {
          if (pmvCurrency.toUpperCase() === String(inv.currency || "").toUpperCase()) {
            rate = parseFloat(exchange_rate) || 1;
            const pmvCurrUpper = pmvCurrency.toUpperCase();
            if ((pmvCurrUpper === "JPY" || pmvCurrUpper === "KRW") && rate > 5) {
              rate = rate / 100;
            }
          }
        }

        const effectiveRate = rate > 0 ? rate : 1;

        // Convert Product FOB to PMV currency, compute unit PMV, then total
        const fobInPmvCurrency = fobAmountInr / effectiveRate;
        const unitFobInPmvCurrency = fobInPmvCurrency / quantity;
        let pmvPerUnit = (unitFobInPmvCurrency * percentage) / 100;

        pmvPerUnit = parseFloat(pmvPerUnit.toFixed(2));
        let totalPMV = parseFloat((pmvPerUnit * quantity).toFixed(2));

        newPmvInfo = {
          ...newPmvInfo,
          pmvPerUnit: String(pmvPerUnit),
          totalPMV: String(totalPMV)
        };
      }

      // Sync IGST fields if taxableBasis is set to FOB
      let newIgst = product.igstCompensationCess;
      if (newIgst && newIgst.taxableBasis === "fob") {
        const igstRate = parseFloat(newIgst.igstRate) || 0;
        const newTaxable = fobAmountInr;
        newIgst = {
          ...newIgst,
          taxableValueINR: newTaxable,
          igstAmountINR: !newIgst.isIgstManual
            ? parseFloat(((newTaxable * igstRate) / 100).toFixed(2))
            : newIgst.igstAmountINR,
        };
      }

      return {
        ...product,
        pmvInfo: newPmvInfo,
        drawbackDetails: newDbkDetails,
        rosctlInfo: newRosctlInfo,
        rodtepInfo: newRodtepInfo,
        igstCompensationCess: newIgst,
      };
    });

    const { totalFobInr, totalFobInvCurr } = calculateInvoiceFob(inv, exchange_rate);
    const existingFob = inv.freightInsuranceCharges?.fobValue || {};
    const updatedCharges = {
      ...(inv.freightInsuranceCharges || {}),
      fobValue: {
        ...existingFob,
        amount: totalFobInvCurr,
        amountINR: totalFobInr,
        currency: existingFob.currency || inv.currency || "INR",
        exchangeRate: existingFob.exchangeRate || exchange_rate || 1,
      },
    };

    return { ...inv, freightInsuranceCharges: updatedCharges, products: updatedProducts };
  });
};
