import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueNonEmpty(values) {
  return [...new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean))];
}

function isCompletedStatus(status) {
  return /complete|completed|done|paid/i.test(String(status || ""));
}

function isApprovedRequest(isApproved, status) {
  return Boolean(isApproved) || /approved/i.test(String(status || ""));
}

const formatClubJobSeries = (clubbedJobs, defaultVal = "") => {
  if (!Array.isArray(clubbedJobs) || clubbedJobs.length === 0) {
    return defaultVal;
  }
  const uniqueJobs = [...new Set(clubbedJobs.map(j => String(j || '').trim()).filter(Boolean))];
  if (uniqueJobs.length === 0) return defaultVal;
  if (uniqueJobs.length === 1) return uniqueJobs[0];

  const parsed = [];
  for (const job of uniqueJobs) {
    const parts = job.split('/');
    if (parts.length === 5) {
      const numStr = parts[3];
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) {
        parsed.push({
          num,
          padLength: numStr.length,
          prefix: parts.slice(0, 3).join('/'),
          suffix: parts[4],
          original: job
        });
        continue;
      }
    }
    return uniqueJobs.join(', ');
  }

  const firstPrefix = parsed[0].prefix;
  const firstSuffix = parsed[0].suffix;
  const allSamePrefixSuffix = parsed.every(p => p.prefix === firstPrefix && p.suffix === firstSuffix);

  if (!allSamePrefixSuffix) {
    return uniqueJobs.join(', ');
  }

  parsed.sort((a, b) => a.num - b.num);

  let isContinuous = true;
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].num !== parsed[i - 1].num + 1) {
      isContinuous = false;
      break;
    }
  }

  if (isContinuous) {
    const firstPadded = String(parsed[0].num).padStart(parsed[0].padLength, '0');
    const lastPadded = String(parsed[parsed.length - 1].num).padStart(parsed[parsed.length - 1].padLength, '0');
    return `${firstPrefix}/${firstPadded} TO ${lastPadded}/${firstSuffix}`;
  } else {
    const numString = parsed.map(p => p.num).join(',');
    return `${firstPrefix}/${numString}/${firstSuffix}`;
  }
};

function summarizeRequestState(charges, refField, statusField, approvalField) {
  const groups = new Map();

  (charges || []).forEach((charge) => {
    const refNo = String(charge?.[refField] || "").trim();
    if (!refNo) return;

    const current = groups.get(refNo) || { hasPending: false, hasApproved: false, completed: true };
    const completed = isCompletedStatus(charge?.[statusField]);
    const approved = isApprovedRequest(charge?.[approvalField], charge?.[statusField]);

    current.hasPending = current.hasPending || (!approved && !completed);
    current.hasApproved = current.hasApproved || (approved && !completed);
    current.completed = current.completed && completed;

    groups.set(refNo, current);
  });

  const requests = [...groups.values()];

  return {
    hasAny: requests.length > 0,
    allApproved: requests.length > 0 && requests.every((request) => request.hasApproved || request.completed),
    completed: requests.length > 0 && requests.every((request) => request.completed),
    hasPending: requests.some((request) => request.hasPending),
    hasApproved: requests.some((request) => request.hasApproved),
  };
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

  const purchaseBookState = summarizeRequestState(
    pbCharges,
    "purchase_book_no",
    "purchase_book_status",
    "purchase_book_is_approved"
  );
  const paymentRequestState = summarizeRequestState(
    prCharges,
    "payment_request_no",
    "payment_request_status",
    "payment_request_is_approved"
  );

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
    tally_club_ref_no: (job.is_club_job_parent && Array.isArray(job.clubbed_jobs) && job.clubbed_jobs.length > 0)
      ? formatClubJobSeries(job.clubbed_jobs, job.tally_club_ref_no || job.job_no)
      : (job.tally_club_ref_no || ""),
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
    billing_date: (opStatus.billing_details?.agency_bill_date && opStatus.billing_details?.agency_bill_no ? opStatus.billing_details.agency_bill_date : "") ||
      (opStatus.billing_details?.reimbursement_bill_date && opStatus.billing_details?.reimbursement_bill_no ? opStatus.billing_details.reimbursement_bill_date : "") ||
      opStatus.billingDocsSentDt || "",
    billing_docs_count: Array.isArray(opStatus.billingDocsSentUpload)
      ? opStatus.billingDocsSentUpload.length
      : 0,
    agency_bill_date: opStatus.billing_details?.agency_bill_date || "",
    agency_bill_no: opStatus.billing_details?.agency_bill_no || "",
    reimbursement_bill_date: opStatus.billing_details?.reimbursement_bill_date || "",
    reimbursement_bill_no: opStatus.billing_details?.reimbursement_bill_no || "",
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
    send_for_billing_date: job.send_for_billing_date || "",
    isGeneralJob: Boolean(job.isGeneralJob),
    is_club_job_parent: Boolean(job.is_club_job_parent),
    parent_club_job: job.parent_club_job || null,
    isFreightForwarding: String(job.job_no || "").toUpperCase().startsWith("FF"),
    unresolved_queries: 0,
    hasPurchaseBook: purchaseBookState.hasAny,
    allPbApproved: purchaseBookState.allApproved,
    pbCompleted: purchaseBookState.completed,
    hasPendingPb: purchaseBookState.hasPending,
    hasApprovedPb: purchaseBookState.hasApproved,
    hasPaymentRequest: paymentRequestState.hasAny,
    allPrApproved: paymentRequestState.allApproved,
    prCompleted: paymentRequestState.completed,
    hasPendingPr: paymentRequestState.hasPending,
    hasApprovedPr: paymentRequestState.hasApproved,
    hasUnprocessedPb: charges.some((c) => !c.purchase_book_no),
    hasUnprocessedPr: charges.some((c) => !c.payment_request_no),
  };
}

function matchesTab(job, workMode, tab, jobTypeFilter = "") {
  const hasHandover = Boolean(job.handover_date);
  const hasBillingDone = Boolean(job.billing_date);

  if (tab === "general-jobs" || tab === "General Jobs") {
    const isGenJob = job.isGeneralJob === true;
    const isFreightJob = String(job.job_no || "").toUpperCase().startsWith("FF");
    const matchesType = isGenJob || isFreightJob;

    if (!matchesType) return false;

    if (jobTypeFilter === "gen") return isGenJob && !isFreightJob;
    if (jobTypeFilter === "freight") return isFreightJob;
    return true;
  }

  if (tab === "billing-pending") {
    return job.send_for_billing && !hasBillingDone;
  }

  if (tab === "export-completed-billing") {
    return hasBillingDone;
  }

  if (workMode === "payment") {
    if (tab === "payment-requested") return job.hasPendingPr;
    if (tab === "payment") return job.hasApprovedPr;
    if (tab === "payment-completed") return job.prCompleted;
  }

  if (workMode === "purchase-book") {
    if (tab === "purchase-book-requested") return job.hasPendingPb;
    if (tab === "purchase-book") return job.hasApprovedPb;
    if (tab === "purchase-book-completed") return job.pbCompleted;
  }

  if (tab === "club-jobs") {
    return job.is_club_job_parent || !!job.parent_club_job;
  }

  return true;
}

const JOBS_WITHOUT_BRANCH_OR_CUSTOM_HOUSE_VALIDATION = [
  { job_no: { $regex: "^(FF|GEN)", $options: "i" } },
  { isGeneralJob: true },
];

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

  const restrictions = [];

  if (branchRestrictions.length > 0) {
    const branchRegexStr = branchRestrictions.map((r) => escapeRegex(r)).join("|");
    const fallbackRegex = `^(${branchRegexStr})(/|$)`;
    restrictions.push({
      $or: [
        { branch_code: { $in: branchRestrictions } },
        {
          $and: [
            { $or: [{ branch_code: "" }, { branch_code: null }, { branch_code: { $exists: false } }] },
            { job_no: { $regex: fallbackRegex, $options: "i" } },
          ],
        },
      ],
    });
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

    restrictions.push({
      $or: [
        { custom_house: { $regex: combinedRegexStr, $options: "i" } },
        { port_of_loading: { $regex: combinedRegexStr, $options: "i" } },
      ],
    });
  }

  if (restrictions.length > 0) {
    filter.$and.push({
      $or: [
        ...JOBS_WITHOUT_BRANCH_OR_CUSTOM_HOUSE_VALIDATION,
        { $and: restrictions },
      ],
    });
  }

  return filter;
}

function applyCommonFilters(filter, query) {
  const {
    search = "",
    exporter = "",
    country = "",
    consignmentType = "",
    branch = "",
    year = "",
    customHouse = "",
    jobOwner = "",
    month = "",
  } = query;

  if (!filter.$and) filter.$and = [];

  if (search) {
    const escapedSearch = escapeRegex(search);
    filter.$and.push({
      $or: [
        { job_no: { $regex: escapedSearch, $options: "i" } },
        { exporter: { $regex: escapedSearch, $options: "i" } },
        { ieCode: { $regex: escapedSearch, $options: "i" } },
        { exporter_ref_no: { $regex: escapedSearch, $options: "i" } },
        { "consignees.consignee_name": { $regex: escapedSearch, $options: "i" } },
        { sb_no: { $regex: escapedSearch, $options: "i" } },
        { "invoices.invoiceNumber": { $regex: escapedSearch, $options: "i" } },
        { "containers.containerNo": { $regex: escapedSearch, $options: "i" } },
        { port_of_discharge: { $regex: escapedSearch, $options: "i" } },
        { awb_bl_no: { $regex: escapedSearch, $options: "i" } },
        { custom_house: { $regex: escapedSearch, $options: "i" } },
        { booking_no: { $regex: escapedSearch, $options: "i" } },
        { "invoices.invoiceNo": { $regex: escapedSearch, $options: "i" } },
        { port_of_loading: { $regex: escapedSearch, $options: "i" } }
      ]
    });
  }

  if (exporter && exporter.toLowerCase() !== "all") {
    filter.$and.push({ exporter: { $regex: escapeRegex(exporter), $options: "i" } });
  }

  if (country) {
    filter.$and.push({ destination_country: { $regex: escapeRegex(country), $options: "i" } });
  }

  if (consignmentType) {
    filter.$and.push({ consignmentType });
  }

  if (branch) {
    filter.$and.push({ branch_code: { $regex: `^${escapeRegex(branch)}$`, $options: "i" } });
  }

  if (year && year !== "all") {
    filter.$and.push({ year });
  }

  if (customHouse) {
    filter.$and.push({ custom_house: { $regex: escapeRegex(customHouse), $options: "i" } });
  }

  if (jobOwner) {
    filter.$and.push({ job_owner: { $regex: escapeRegex(jobOwner), $options: "i" } });
  }

  if (month) {
    const [yearStr, monthStr] = month.split("-");
    const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    const endDate = new Date(parseInt(yearStr), parseInt(monthStr), 0);
    filter.$and.push({
      $or: [
        { sb_date: { $gte: startDate, $lte: endDate } },
        { job_date: { $gte: startDate, $lte: endDate } }
      ]
    });
  }
}

router.get("/api/export-jobs-tab-counts", async (req, res) => {
  try {
    const { module = "jobs", pendingQueries = false, currentModule = "export-dsr", workMode = "payment", jobTypeFilter = "" } = req.query;

    const baseFilter = await buildUserRestrictionFilter(req);

    if (module === "billing") {
      // For billing, we query matching jobs and filter in memory using matchesTab logic
      applyCommonFilters(baseFilter, req.query);

      if (baseFilter.$and && baseFilter.$and.length === 0) {
        delete baseFilter.$and;
      }

      const projection = {
        job_no: 1,
        tally_club_ref_no: 1,
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
        send_for_billing_date: 1,
        isGeneralJob: 1,
        is_club_job_parent: 1,
        parent_club_job: 1,
        clubbed_jobs: 1,
        "invoices.invoiceNumber": 1,
        "containers.containerNo": 1,
        "containers.type": 1,
        "operations.statusDetails.handoverForwardingNoteDate": 1,
        "operations.statusDetails.billingDocsSentDt": 1,
        "operations.statusDetails.billingDocsSentUpload": 1,
        "operations.statusDetails.billing_details": 1,
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

      const jobs = await ExportJobModel.find(baseFilter).select(projection).lean();
      const summarizedBase = jobs.map(summarizeJob);

      let unresolvedByJob = {};
      if (pendingQueries === "true" || pendingQueries === true) {
        const jobNos = summarizedBase.map(j => j.job_no).filter(Boolean);
        if (jobNos.length > 0) {
          const QueryModel = (await import("../../model/export/QueryModel.mjs")).default;
          const unresolvedQueries = await QueryModel.find({
            job_no: { $in: jobNos },
            status: "open",
            targetModule: "export-billing",
          }).select("job_no").lean();

          unresolvedByJob = unresolvedQueries.reduce((acc, query) => {
            acc[query.job_no] = (acc[query.job_no] || 0) + 1;
            return acc;
          }, {});
        }
      }

      const PAYMENT_TABS_LIST = ["billing-pending", "payment-requested", "payment", "payment-completed", "club-jobs", "export-completed-billing", "general-jobs"];
      const PURCHASE_TABS_LIST = ["billing-pending", "purchase-book-requested", "purchase-book", "purchase-book-completed", "club-jobs", "export-completed-billing", "general-jobs"];
      const tabs = workMode === "purchase-book" ? PURCHASE_TABS_LIST : PAYMENT_TABS_LIST;

      const counts = {};
      tabs.forEach((tabKey) => {
        counts[tabKey] = summarizedBase
          .map(job => ({ ...job, unresolved_queries: unresolvedByJob[job.job_no] || 0 }))
          .filter(job => matchesTab(job, workMode, tabKey, String(jobTypeFilter).trim().toLowerCase()))
          .filter(job => {
            if (pendingQueries === "true" || pendingQueries === true) {
              return job.unresolved_queries > 0;
            }
            return true;
          }).length;
      });

      return res.status(200).json({ success: true, data: counts });
    }

    // For jobs, operation, charges, we build MongoDB filter queries for each tab
    let tabsList = [];
    if (module === "jobs") {
      tabsList = ["Pending", "Booking Pending", "Handover Pending", "Prepare for Billing", "Sent for Billing", "club-jobs", "Completed", "Cancelled"];
    } else if (module === "operation") {
      tabsList = ["Pending", "Op Completed", "Completed"];
    } else if (module === "charges") {
      tabsList = ["Pending", "Completed", "General Jobs", "Freight Forwarding"];
    }

    const counts = {};

    await Promise.all(
      tabsList.map(async (tabKey) => {
        // Clone baseFilter
        const filter = JSON.parse(JSON.stringify(baseFilter));
        if (!filter.$and) filter.$and = [];

        // Apply Common Filters
        applyCommonFilters(filter, req.query);

        // Apply Module and Tab specific logic
        if (module === "jobs") {
          // General conditions for Jobs module
          filter.$and.push({ isGeneralJob: { $ne: true } });
          filter.$and.push({ job_no: { $not: /^FF/i } });

          const tabKeyLower = tabKey.toLowerCase();
          if (tabKeyLower === "pending") {
            filter.$and.push({
              status: { $regex: "^pending$", $options: "i" },
              detailedStatus: { $ne: "Billing Done" },
              isJobCanceled: { $ne: true },
            });
          } else if (tabKeyLower === "booking pending") {
            filter.$and.push({
              $and: [
                { $or: [{ status: { $regex: "^pending$", $options: "i" } }, { status: { $exists: false } }, { status: null }, { status: "" }] },
                { detailedStatus: { $ne: "Billing Done" } }
              ],
              goods_stuffed_at: "DOCK",
              consignmentType: "FCL",
              sb_no: { $type: "string", $ne: "" },
              $or: [
                { "operations.statusDetails.leoDate": { $exists: false } },
                { "operations.statusDetails.leoDate": null },
                { "operations.statusDetails.leoDate": "" },
                { "operations.statusDetails": { $size: 0 } }
              ]
            });
          } else if (tabKeyLower === "handover pending") {
            filter.$and.push({
              $and: [
                { $or: [{ status: { $regex: "^pending$", $options: "i" } }, { status: { $exists: false } }, { status: null }, { status: "" }] },
                { detailedStatus: { $ne: "Billing Done" } }
              ],
              "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
              $or: [
                { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
                { "operations.statusDetails": { $size: 0 } }
              ]
            });
          } else if (tabKeyLower === "prepare for billing") {
            filter.$and.push({
              $and: [
                { $or: [{ status: { $regex: "^pending$", $options: "i" } }, { status: { $exists: false } }, { status: null }, { status: "" }] },
                { detailedStatus: { $ne: "Billing Done" } }
              ]
            });
            filter.$and.push({
              $or: [
                {
                  $and: [
                    { consignmentType: { $ne: "LCL" } },
                    { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                    { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
                    { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } },
                    { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $exists: true, $nin: [null, ""] } },
                    { "operations.statusDetails.railOutReachedDate": { $exists: true, $nin: [null, ""] } }
                  ]
                },
                {
                  $and: [
                    { $or: [{ consignmentType: "LCL" }, { job_no: { $regex: "/AIR/", $options: "i" } }] },
                    { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
                    { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } }
                  ]
                }
              ]
            });
            filter.$and.push({
              $or: [
                { send_for_billing: { $exists: false } },
                { send_for_billing: null },
                { send_for_billing: false }
              ]
            });
          } else if (tabKeyLower === "sent for billing") {
            filter.$and.push({
              $and: [
                { $or: [{ status: { $regex: "^pending$", $options: "i" } }, { status: { $exists: false } }, { status: null }, { status: "" }] },
                { detailedStatus: { $ne: "Billing Done" } }
              ],
              send_for_billing: true
            });
          } else if (tabKeyLower === "club-jobs") {
            filter.$and.push({
              is_club_job_parent: true
            });
            filter.$and.push({
              $or: [{ status: { $regex: "^pending$", $options: "i" } }, { status: { $exists: false } }, { status: null }, { status: "" }]
            });
            filter.$and.push({
              detailedStatus: { $ne: "Billing Done" }
            });
            filter.$and.push({
              isJobCanceled: { $ne: true }
            });
          } else if (tabKeyLower === "completed") {
            filter.$and.push({
              $and: [{ status: { $regex: "^(?!cancelled$).*", $options: "i" } }, { isJobCanceled: { $ne: true } }],
              $or: [{ status: { $regex: "^completed$", $options: "i" } }, { detailedStatus: "Billing Done" }]
            });
          } else if (tabKeyLower === "cancelled") {
            filter.$and.push({
              $or: [{ status: { $regex: "^cancelled$", $options: "i" } }, { isJobCanceled: true }]
            });
          }

        } else if (module === "operation") {
          // General conditions for Operation module
          filter.$and.push({ isGeneralJob: { $ne: true } });
          filter.$and.push({ job_no: { $not: /^FF/i } });
          filter.$and.push({ $or: [{ parent_club_job: { $exists: false } }, { parent_club_job: null }, { parent_club_job: "" }] });
          filter.$and.push({ sb_no: { $exists: true, $nin: [null, ""] } });

          const tabKeyLower = tabKey.toLowerCase();
          if (tabKeyLower === "cancelled") {
            filter.$and.push({
              $or: [{ status: { $regex: "^cancelled$", $options: "i" } }, { isJobCanceled: true }]
            });
          } else if (tabKeyLower === "completed") {
            filter.$and.push({
              $and: [
                { status: { $regex: "^(?!cancelled$).*", $options: "i" } },
                { isJobCanceled: { $ne: true } },
                { $or: [{ status: { $regex: "^completed$", $options: "i" } }, { detailedStatus: "Billing Done" }] }
              ]
            });
          } else {
            // Pending and Op Completed have main status pending/empty
            filter.$and.push({
              $or: [{ status: { $regex: "^pending$", $options: "i" } }, { status: { $exists: false } }, { status: null }, { status: "" }]
            });

            if (tabKeyLower === "pending") {
              filter.$and.push({
                $or: [
                  {
                    $and: [
                      { consignmentType: { $ne: "LCL" } },
                      { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                      {
                        $or: [
                          { "operations.statusDetails.leoDate": { $in: [null, ""] } },
                          { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
                          { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $in: [null, ""] } },
                          { "operations.statusDetails.railOutReachedDate": { $in: [null, ""] } },
                          { "operations.statusDetails": { $size: 0 } }
                        ]
                      }
                    ]
                  },
                  {
                    $and: [
                      { $or: [{ consignmentType: "LCL" }, { job_no: { $regex: "/AIR/", $options: "i" } }] },
                      {
                        $or: [
                          { "operations.statusDetails.leoDate": { $in: [null, ""] } },
                          { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
                          { "operations.statusDetails": { $size: 0 } }
                        ]
                      }
                    ]
                  }
                ]
              });
              filter.$and.push({
                $or: [
                  { "operations.statusDetails.billingDocsSentDt": { $in: [null, ""] } },
                  { "operations.statusDetails.billing_details.agency_bill_date": { $in: [null, ""] } },
                  { "operations.statusDetails.billing_details.agency_bill_no": { $in: [null, ""] } },
                  { "operations.statusDetails.billing_details.reimbursement_bill_date": { $in: [null, ""] } },
                  { "operations.statusDetails.billing_details.reimbursement_bill_no": { $in: [null, ""] } },
                  { "operations.statusDetails": { $size: 0 } }
                ]
              });
            } else if (tabKeyLower === "op completed" || tabKeyLower === "billing pending") {
              filter.$and.push({
                $or: [
                  {
                    $and: [
                      { consignmentType: { $ne: "LCL" } },
                      { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                      { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
                      { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } },
                      { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $exists: true, $nin: [null, ""] } },
                      { "operations.statusDetails.railOutReachedDate": { $exists: true, $nin: [null, ""] } }
                    ]
                  },
                  {
                    $and: [
                      { $or: [{ consignmentType: "LCL" }, { job_no: { $regex: "/AIR/", $options: "i" } }] },
                      { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
                      { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } }
                    ]
                  }
                ]
              });
              filter.$and.push({
                $or: [
                  { "operations.statusDetails.billingDocsSentDt": { $in: [null, ""] } },
                  { "operations.statusDetails.billing_details.agency_bill_date": { $in: [null, ""] } },
                  { "operations.statusDetails.billing_details.agency_bill_no": { $in: [null, ""] } },
                  { "operations.statusDetails.billing_details.reimbursement_bill_date": { $in: [null, ""] } },
                  { "operations.statusDetails.billing_details.reimbursement_bill_no": { $in: [null, ""] } },
                  { "operations.statusDetails": { $size: 0 } }
                ]
              });
            }
          }

        } else if (module === "charges") {
          // General conditions for Charges module
          filter.$and.push({
            $or: [
              { isGeneralJob: true },
              { is_club_job_parent: true },
              {
                $or: [
                  {
                    $and: [
                      { $or: [{ consignmentType: "LCL" }, { job_no: { $regex: "/AIR/", $options: "i" } }] },
                      { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } },
                      { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } }
                    ]
                  },
                  {
                    $and: [
                      { consignmentType: { $ne: "LCL" } },
                      { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                      { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } },
                      { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
                      { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $exists: true, $nin: [null, ""] } },
                      { "operations.statusDetails.railOutReachedDate": { $exists: true, $nin: [null, ""] } }
                    ]
                  }
                ]
              }
            ]
          });
          filter.$and.push({ $or: [{ parent_club_job: { $exists: false } }, { parent_club_job: null }, { parent_club_job: "" }] });

          const tabKeyLower = tabKey.toLowerCase();
          if (tabKeyLower === "general jobs") {
            filter.$and.push({ isGeneralJob: true });
            filter.$and.push({ job_no: { $regex: "^GEN/", $options: "i" } });
          } else if (tabKeyLower === "freight forwarding") {
            filter.$and.push({ job_no: { $regex: "^FF", $options: "i" } });
          } else {
            filter.$and.push({ job_no: { $regex: "^(?!GEN|FF).*", $options: "i" } });
            filter.$and.push({ isGeneralJob: { $ne: true } });
            filter.$and.push({ status: { $regex: "^(?!cancelled$).*", $options: "i" }, isJobCanceled: { $ne: true } });

            if (tabKeyLower === "pending") {
              filter.$and.push({
                status: { $regex: "^pending$", $options: "i" },
                send_for_billing: { $ne: true },
                $and: [
                  { $or: [{ "operations.statusDetails.billingDocsSentDt": { $in: [null, ""] } }, { "operations.statusDetails": { $size: 0 } }] },
                  { $or: [{ "operations.statusDetails.billing_details.agency_bill_date": { $in: [null, ""] } }, { "operations.statusDetails.billing_details.agency_bill_no": { $in: [null, ""] } }, { "operations.statusDetails": { $size: 0 } }] },
                  { $or: [{ "operations.statusDetails.billing_details.reimbursement_bill_date": { $in: [null, ""] } }, { "operations.statusDetails.billing_details.reimbursement_bill_no": { $in: [null, ""] } }, { "operations.statusDetails": { $size: 0 } }] }
                ]
              });
            } else if (tabKeyLower === "completed") {
              filter.$and.push({
                $or: [
                  { status: { $regex: "^completed$", $options: "i" } },
                  { detailedStatus: "Billing Done" },
                  { "operations.statusDetails.billingDocsSentDt": { $exists: true, $nin: [null, ""] } },
                  { $and: [{ "operations.statusDetails.billing_details.agency_bill_date": { $exists: true, $nin: [null, ""] } }, { "operations.statusDetails.billing_details.agency_bill_no": { $exists: true, $nin: [null, ""] } }] },
                  { $and: [{ "operations.statusDetails.billing_details.reimbursement_bill_date": { $exists: true, $nin: [null, ""] } }, { "operations.statusDetails.billing_details.reimbursement_bill_no": { $exists: true, $nin: [null, ""] } }] }
                ]
              });
            }
          }
        }

        // Apply pendingQueries filter if active
        if (pendingQueries === "true" || pendingQueries === true) {
          const matchingJobsForCount = await ExportJobModel.find(filter).select("job_no").lean();
          const allJobNos = matchingJobsForCount.map(j => j.job_no).filter(Boolean);

          const QueryModel = (await import("../../model/export/QueryModel.mjs")).default;
          const jobsWithOpenQueries = await QueryModel.find({
            job_no: { $in: allJobNos },
            status: "open",
            targetModule: currentModule
          }).distinct("job_no");

          filter.$and.push({ job_no: { $in: jobsWithOpenQueries } });
        }

        if (filter.$and && filter.$and.length === 0) {
          delete filter.$and;
        }

        const count = await ExportJobModel.countDocuments(filter);
        counts[tabKey] = count;
      })
    );

    return res.status(200).json({ success: true, data: counts });

  } catch (error) {
    console.error("Error in getTabCounts API:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
