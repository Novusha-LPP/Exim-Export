/**
 * Utility for calculating Product FOB in INR based on pro-rated freight and insurance.
 *
 * Formula:
 * A = Product Amount (Invoice Currency)
 * B = Total Product Value for Invoice (Invoice Currency)
 * C (Ratio) = A / B
 * K = Freight (Converted to Invoice Currency)
 * J = Insurance (Converted to Invoice Currency)
 * Z (Deduction) = C * (K + J)
 * FOB (INR) = (A - Z) * InvoiceToINRRate
 */

export const calculateProductFobINR = (
  product,
  activeInvoice,
  invoiceExchangeRate
) => {
  if (!product || !activeInvoice) return 0;

  const charges = activeInvoice.freightInsuranceCharges || {};
  const freight = charges.freight || {};
  const insurance = charges.insurance || {};
  const invToInrRate = parseFloat(invoiceExchangeRate) || 1;

  // Helper: Convert row amount (in row currency) to invoice currency using INR as pivot
  const getAmountInInvoiceCurrency = (row) => {
    const amt = parseFloat(row.amount || 0);
    // If amount is zero, return zero
    if (!amt) return 0;

    const rowToInrRate = parseFloat(row.exchangeRate);

    // If exchange rate is present, use standard conversion:
    // Amount (RowCurr) * Rate (Row->INR) / Rate (Inv->INR) = Amount (InvCurr)
    if (rowToInrRate && invToInrRate) {
      return (amt * rowToInrRate) / invToInrRate;
    }

    // Fallback: If exchange rate is missing, assume the amount is ALREADY in Invoice Currency.
    // This is common for imported data where explicit currency/rate for charges might be missing.
    return amt;
  };

  const K = getAmountInInvoiceCurrency(freight);
  const J = getAmountInInvoiceCurrency(insurance);
  const totalChargesInInvoice = K + J;

  const A = parseFloat(product.amount || 0);
  const B = parseFloat(
    activeInvoice.productValue || activeInvoice.invoiceValue || 0
  );

  // Step 1: Ratio C = A / B
  let C = 0;
  if (B > 0) {
    C = A / B;
  }

  // Step 2: Deduction Z = C * (K + J)
  const Z = C * totalChargesInInvoice;

  // Step 3: FOB in Invoice Currency = A - Z
  const fobInInvoiceCurrency = A - Z;

  // Step 4: Final FOB always in INR
  const fobInINR = fobInInvoiceCurrency * invToInrRate;

  return parseFloat(fobInINR.toFixed(2));
};
