import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import QueryModel from "../../model/export/QueryModel.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

const PAYMENT_TABS = [
  "billing-pending",
  "payment-requested",
  "payment",
  "payment-completed",
  "export-completed-billing",
];

const PURCHASE_TABS = [
  "billing-pending",
  "purchase-book-requested",
  "purchase-book",
  "purchase-book-completed",
  "export-completed-billing",
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueNonEmpty(values) {
  return [...new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean))];
}

function summarizeJob(job) {
  const opStatus = job.operations?.[0]?.statusDetails?.[0] || {};
  const charges = Array.isArray(job.charges) ? job.charges : [];
  const apInvoices = Array.isArray(job.ap_invoices) ? job.ap_invoices : [];
  const containers = Array.isArray(job.containers) ? job.containers : [];

  const pbCharges = charges.filter((c) => Boolean(c.purchase_book_no));
  const prCharges = charges.filter((c) => Boolean(c.payment_request_no));

  const paymentRequestNos = uniqueNonEmpty(prCharges.map((c) => c.payment_request_no));
  const paymentStatuses = uniqueNonEmpty(prCharges.map((c) => c.payment_request_status));
  const purchaseBookNos = uniqueNonEmpty(pbCharges.map((c) => c.purchase_book_no));
  const purchaseBookStatuses = uniqueNonEmpty(pbCharges.map((c) => c.purchase_book_status));

  const hasPurchaseBook = pbCharges.length > 0;
  const hasPaymentRequest = prCharges.length > 0;
  const allPbApproved = hasPurchaseBook && pbCharges.every((c) => c.purchase_book_is_approved);
  const allPrApproved = hasPaymentRequest && prCharges.every((c) => c.payment_request_is_approved);
  const pbCompleted = hasPurchaseBook && pbCharges.every((c) => /complete|completed|done|paid/i.test(c.purchase_book_status));
  const prCompleted = hasPaymentRequest && prCharges.every((c) => /complete|completed|done|paid/i.test(c.payment_request_status));

  const supplierNames = uniqueNonEmpty([
    ...charges.map((c) => c.cost?.partyName),
    ...apInvoices.map((i) => i.organization),
  ]);
  const supplierInvoiceNos = uniqueNonEmpty([
    ...charges.map((c) => c.invoice_number),
    ...apInvoices.map((i) => i.vendor_bill_no),
  ]);
  const chargeHeads = uniqueNonEmpty(
    charges.flatMap((c) => [c.chargeHead, c.cost?.chargeDescription, c.revenue?.chargeDescription])
  );

  return {
    _id: job._id,
    job_no: job.job_no,
    year: job.year,
    exporter: job.exporter || "",
    custom_house: job.custom_house || "",
    consignment_type: job.consignment_type || "",
    branch_code: job.branch_code || "",
    detailedStatus: job.detailedStatus || "",
    status: job.status || "",
    invoice_numbers: uniqueNonEmpty((job.invoices || []).map((inv) => inv.invoiceNumber)),
    container_summary: containers
      .map((container) => [container.containerNo, container.type].filter(Boolean).join(" | "))
      .filter(Boolean),
    handover_date: opStatus.handoverForwardingNoteDate || "",
    billing_date: opStatus.billingDocsSentDt || "",
    billing_docs_count: Array.isArray(opStatus.billingDocsSentUpload)
      ? opStatus.billingDocsSentUpload.length
      : 0,
    booking_no: job.booking_no || "",
    sb_no: job.sb_no || "",
    payment_request_nos: paymentRequestNos,
    payment_request_statuses: paymentStatuses,
    purchase_book_nos: purchaseBookNos,
    purchase_book_statuses: purchaseBookStatuses,
    supplier_names: supplierNames,
    supplier_invoice_nos: supplierInvoiceNos,
    charge_heads: chargeHeads,
    charge_count: charges.length,
    financial_lock: Boolean(job.financial_lock),
    send_for_billing: Boolean(job.send_for_billing),
    unresolved_queries: 0,
    // Add flags for tab logic
    hasPurchaseBook,
    allPbApproved,
    pbCompleted,
    hasPaymentRequest,
    allPrApproved,
    prCompleted,
    hasUnprocessedPb: charges.some((c) => !c.purchase_book_no),
    hasUnprocessedPr: charges.some((c) => !c.payment_request_no),
  };
}

function matchesTab(job, workMode, tab) {
  const hasHandover = Boolean(job.handover_date);
  const hasBillingDone = Boolean(job.billing_date);

  if (tab === "billing-pending") {
    // Show in billing-pending if flagged, regardless of partial progress
    return job.send_for_billing;
  }

  if (tab === "export-completed-billing") {
    return hasBillingDone || job.financial_lock || /billing done|completed/i.test(job.detailedStatus);
  }

  if (workMode === "payment") {
    if (tab === "payment-requested") return job.hasPaymentRequest && !job.allPrApproved && !job.prCompleted;
    if (tab === "payment") return job.hasPaymentRequest && job.allPrApproved && !job.prCompleted;
    if (tab === "payment-completed") return job.prCompleted;
  }

  if (workMode === "purchase-book") {
    if (tab === "purchase-book-requested") return job.hasPurchaseBook && !job.allPbApproved && !job.pbCompleted;
    if (tab === "purchase-book") return job.hasPurchaseBook && job.allPbApproved && !job.pbCompleted;
    if (tab === "purchase-book-completed") return job.pbCompleted;
  }

  return true;
}

async function buildUserRestrictionFilter(req) {
  const filter = { $and: [] };
  const requesterUsername = req.headers["username"] || req.headers["x-username"];

  if (!requesterUsername) {
    filter.$and.push({ _id: null });
    return filter;
  }

  const requester = await UserModel.findOne({ username: requesterUsername }).lean();
  if (!requester && requesterUsername !== "Admin") {
    filter.$and.push({ _id: null });
    return filter;
  }

  if (!requester || requester.role === "Admin") {
    return filter;
  }

  let branchRestrictions = requester.selected_branches || [];
  const BRANCH_MAP = {
    AHMEDABAD: "AMD",
    BARODA: "BRD",
    GANDHIDHAM: "GIM",
    COCHIN: "COK",
    HAZIRA: "HAZ",
  };
  branchRestrictions = branchRestrictions.map((branch) => BRANCH_MAP[String(branch).toUpperCase()] || branch);

  if (branchRestrictions.length > 0) {
    filter.$and.push({ branch_code: { $in: branchRestrictions } });
  }

  const portRestrictions = requester.selected_ports || [];
  const icdRestrictions = requester.selected_icd_codes || [];
  const combinedRestrictions = [...new Set([...portRestrictions, ...icdRestrictions])];

  if (combinedRestrictions.length > 0) {
    const finalRestrictions = [];
    combinedRestrictions.forEach((item) => {
      finalRestrictions.push(item);
      if (String(item).includes(" - ")) {
        finalRestrictions.push(String(item).split(" - ")[0].trim());
      }
    });

    const combinedRegexStr = finalRestrictions
      .map((value) => `^${escapeRegex(value)}$`)
      .join("|");

    filter.$and.push({
      $or: [
        { custom_house: { $regex: combinedRegexStr, $options: "i" } },
        { port_of_loading: { $regex: combinedRegexStr, $options: "i" } },
      ],
    });
  }

  return filter;
}

router.get("/api/export-billing-jobs", async (req, res) => {
  try {
    const {
      workMode = "payment",
      tab = "export-billing",
      page = 1,
      limit = 50,
      search = "",
      exporter = "",
      year = "",
      unresolvedOnly = "false",
    } = req.query;

    const normalizedWorkMode = String(workMode).trim().toLowerCase();
    const normalizedTab = String(tab).trim().toLowerCase();
    const allowedTabs = normalizedWorkMode === "purchase-book" ? PURCHASE_TABS : PAYMENT_TABS;

    if (!allowedTabs.includes(normalizedTab)) {
      return res.status(400).json({ success: false, message: "Invalid tab for work mode" });
    }

    const baseFilter = await buildUserRestrictionFilter(req);

    if (year && String(year).trim() !== "all") {
      baseFilter.$and.push({ year: String(year).trim() });
    }

    if (exporter) {
      baseFilter.$and.push({ exporter: { $regex: escapeRegex(String(exporter).trim()), $options: "i" } });
    }

    if (search) {
      const regex = new RegExp(escapeRegex(String(search).trim()), "i");
      baseFilter.$and.push({
        $or: [
          { job_no: regex },
          { exporter: regex },
          { custom_house: regex },
          { sb_no: regex },
          { booking_no: regex },
          { "charges.chargeHead": regex },
          { "charges.cost.partyName": regex },
          { "charges.invoice_number": regex },
          { "charges.payment_request_no": regex },
          { "charges.purchase_book_no": regex },
          { "ap_invoices.organization": regex },
          { "ap_invoices.vendor_bill_no": regex },
        ],
      });
    }

    if (baseFilter.$and.length === 0) {
      delete baseFilter.$and;
    }

    const projection = {
      job_no: 1,
      year: 1,
      exporter: 1,
      custom_house: 1,
      consignment_type: 1,
      branch_code: 1,
      detailedStatus: 1,
      status: 1,
      booking_no: 1,
      sb_no: 1,
      financial_lock: 1,
      send_for_billing: 1,
      "invoices.invoiceNumber": 1,
      "containers.containerNo": 1,
      "containers.type": 1,
      "operations.statusDetails.handoverForwardingNoteDate": 1,
      "operations.statusDetails.billingDocsSentDt": 1,
      "operations.statusDetails.billingDocsSentUpload": 1,
      "charges.chargeHead": 1,
      "charges.invoice_number": 1,
      "charges.purchase_book_no": 1,
      "charges.purchase_book_status": 1,
      "charges.purchase_book_is_approved": 1,
      "charges.payment_request_no": 1,
      "charges.payment_request_status": 1,
      "charges.payment_request_is_approved": 1,
      "charges.cost.partyName": 1,
      "charges.cost.chargeDescription": 1,
      "charges.revenue.chargeDescription": 1,
      "ap_invoices.organization": 1,
      "ap_invoices.vendor_bill_no": 1,
    };

    const jobs = await ExportJobModel.find(baseFilter)
      .select(projection)
      .sort({ updatedAt: -1, job_date: -1 })
      .lean();

    const summarizedBase = jobs.map(summarizeJob);
    const jobNos = summarizedBase.map((job) => job.job_no).filter(Boolean);

    let unresolvedByJob = {};
    if (jobNos.length > 0) {
      const unresolvedQueries = await QueryModel.find({
        job_no: { $in: jobNos },
        status: "open",
        $or: [
          { targetModule: "export-billing" },
          { raisedFromModule: "export-billing" },
        ],
      })
        .select("job_no")
        .lean();

      unresolvedByJob = unresolvedQueries.reduce((acc, query) => {
        acc[query.job_no] = (acc[query.job_no] || 0) + 1;
        return acc;
      }, {});
    }

    const summarized = summarizedBase
      .map((job) => ({
        ...job,
        unresolved_queries: unresolvedByJob[job.job_no] || 0,
      }))
      .filter((job) => matchesTab(job, normalizedWorkMode, normalizedTab))
      .filter((job) =>
        String(unresolvedOnly).toLowerCase() === "true" ? job.unresolved_queries > 0 : true
      );

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const start = (pageNum - 1) * limitNum;
    const paged = summarized.slice(start, start + limitNum);

    res.json({
      success: true,
      data: {
        jobs: paged,
        total: summarized.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(summarized.length / limitNum)),
      },
    });
  } catch (error) {
    console.error("Error fetching export billing jobs:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
