const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const normalizeChargeCategory = (category) =>
  (category || "").toString().trim().toUpperCase();

export const getDefaultTdsCategory = (tdsPercent) => {
  const percent = round2(tdsPercent);
  if (!percent) return "U/S N/A 0.00 %";
  if (percent === 1) return "U/S 194C 1.00 %";
  if (percent === 2) return "U/S 194C 2.00 %";
  if (percent === 5) return "U/S 194H 5.00 %";
  if (percent === 10) return "U/S 194J 10.00 %";
  return `U/S N/A ${percent.toFixed(2)} %`;
};

export const buildPurchaseBookDraft = ({
  row,
  cost = {},
  partyName,
  partyDetails,
  branch = {},
  branchIndex = 0,
  jobCthNo = "",
  jobDisplayNumber = "",
  parentId = "",
}) => {
  const category = normalizeChargeCategory(row?.category);
  const amount = round2(cost.amount);
  const gstRate = round2(cost.gstRate || 18);
  const includeGst = cost.isGst !== false;

  let taxableValue = includeGst ? round2(cost.basicAmount) : amount;
  let gstAmount = includeGst ? round2(cost.gstAmount) : round2((taxableValue * gstRate) / 100);
  let cgst = round2(cost.cgst);
  let sgst = round2(cost.sgst);
  let igst = round2(cost.igst);

  if (!includeGst && !cgst && !sgst && !igst && gstAmount) {
    const gstin = branch?.gst || branch?.GST || branch?.gstin || "";
    if (gstin.startsWith("24")) {
      cgst = round2(gstAmount / 2);
      sgst = round2(gstAmount / 2);
    } else {
      igst = gstAmount;
    }
  }

  // Business assumption:
  // Reimbursement entries should carry the actual vendor GST breakup.
  // Margin entries should default to non-taxable unless GST is explicitly present on the cost row.
  if (category === "MARGIN" && !cost.isGst) {
    gstAmount = 0;
    cgst = 0;
    sgst = 0;
    igst = 0;
    taxableValue = amount;
  }

  const grossAmount = round2(taxableValue + gstAmount);
  const tdsAmount = round2(cost.tdsAmount);
  const total = round2(cost.netPayable || grossAmount - tdsAmount);

  return {
    category,
    partyName,
    partyDetails,
    branch,
    branchIndex,
    amount,
    basicAmount: taxableValue,
    gstAmount,
    gstRate,
    cgst,
    sgst,
    igst,
    tdsAmount,
    grossAmount,
    totalAmount: grossAmount,
    netPayable: total,
    chargeHead: row?.chargeHead || "",
    invoice_number: row?.invoice_number || "",
    invoice_date: row?.invoice_date || "",
    cthNo: row?.hsnCode || jobCthNo,
    categoryLabel: row?.category || "",
    jobDisplayNumber,
    chargeId: row?._id || "",
    jobId: parentId,
  };
};

export const buildPaymentRequestDraft = ({
  row,
  cost = {},
  partyName,
  partyDetails,
  branchIndex = 0,
  jobDisplayNumber = "",
  parentId = "",
}) => ({
  partyName,
  partyDetails,
  jobDisplayNumber,
  branchIndex,
  netPayable: round2(cost.netPayable),
  grossAmount: round2(cost.isGst !== false ? cost.amount : (cost.basicAmount || 0) + (cost.gstAmount || 0)),
  tdsAmount: round2(cost.tdsAmount),
  tdsCategory: getDefaultTdsCategory(cost.tdsPercent),
  chargeHead: row?.chargeHead || "",
  category: row?.category || "",
  chargeId: row?._id || "",
  jobId: parentId,
});
