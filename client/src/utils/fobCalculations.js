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

  ["freight", "insurance", "discount", "otherDeduction", "commission"].forEach(k => {
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
