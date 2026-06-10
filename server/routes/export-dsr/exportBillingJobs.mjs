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
  "general-jobs",
  "General Jobs",
  "club-jobs"
];

const PURCHASE_TABS = [
  "billing-pending",
  "purchase-book-requested",
  "purchase-book",
  "purchase-book-completed",
  "export-completed-billing",
  "general-jobs",
  "General Jobs",
  "club-jobs"
];

const JOBS_WITHOUT_BRANCH_OR_CUSTOM_HOUSE_VALIDATION = [
  { job_no: { $regex: "^(FF|GEN)", $options: "i" } },
  { isGeneralJob: true },
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    isGeneralJob: Boolean(job.isGeneralJob),
    is_club_job_parent: Boolean(job.is_club_job_parent),
    parent_club_job: job.parent_club_job || null,
    isFreightForwarding: String(job.job_no || "").toUpperCase().startsWith("FF"),
    unresolved_queries: 0,
    // Add flags for tab logic
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

  // General/Freight Jobs tab
  if (tab === "general-jobs" || tab === "General Jobs") {
    const isGenJob = job.isGeneralJob === true;
    const isFreightJob = String(job.job_no || "").toUpperCase().startsWith("FF");
    const matchesType = isGenJob || isFreightJob;

    if (!matchesType) return false;

    // Apply sub-filter if provided
    if (jobTypeFilter === "gen") return isGenJob && !isFreightJob;
    if (jobTypeFilter === "freight") return isFreightJob;
    return true; // "all" or no filter
  }

  // Standard tabs logic
  if (tab === "billing-pending") {
    // Show in billing-pending if flagged, but only if billing is not done
    // This now allows general jobs to show up here too if flagged.
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
      branch = "",
      jobTypeFilter = "",
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
    if (branch) {
      baseFilter.$and.push({ branch_code: String(branch).trim() });
    }

    if (search) {
      const regex = new RegExp(escapeRegex(String(search).trim()), "i");
      baseFilter.$and.push({
        $or: [
          { job_no: regex },
          { exporter: regex },
          { ieCode: regex },
          { "consignees.consignee_name": regex },
          { custom_house: regex },
          { sb_no: regex },
          { booking_no: regex },
          { exporter_ref_no: regex },
          { awb_bl_no: regex },
          { "invoices.invoiceNumber": regex },
          { "invoices.invoiceNo": regex },
          { "containers.containerNo": regex },
          { port_of_discharge: regex },
          { port_of_loading: regex },
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

    if (normalizedTab === "club-jobs") {
      baseFilter.$and = baseFilter.$and || [];
      baseFilter.$and.push({
        $or: [
          { is_club_job_parent: true },
          { parent_club_job: { $exists: true, $ne: null, $ne: "" } }
        ]
      });
    }

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

    const sortCriteria = normalizedTab === "general-jobs"
      ? { job_no: 1 }
      : { updatedAt: -1, job_date: -1 };

    let jobs = await ExportJobModel.find(baseFilter)
      .select(projection)
      .sort(sortCriteria)
      .lean();

    if (normalizedTab === "club-jobs" && jobs.length > 0) {
      const parentIds = [...new Set(jobs.map(j => j.is_club_job_parent ? j.job_no : j.parent_club_job))].filter(Boolean);
      jobs = await ExportJobModel.find({
        $or: [{ job_no: { $in: parentIds } }, { parent_club_job: { $in: parentIds } }]
      })
        .select(projection)
        .lean();
    }

    const summarizedBase = jobs.map(summarizeJob);
    const jobNos = summarizedBase.map((job) => job.job_no).filter(Boolean);

    let unresolvedByJob = {};
    if (jobNos.length > 0) {
      const unresolvedQueries = await QueryModel.find({
        job_no: { $in: jobNos },
        status: "open",
        targetModule: "export-billing",
      })
        .select("job_no")
        .lean();

      unresolvedByJob = unresolvedQueries.reduce((acc, query) => {
        acc[query.job_no] = (acc[query.job_no] || 0) + 1;
        return acc;
      }, {});
    }

    const jobsWithQueries = summarizedBase
      .filter((job) => matchesTab(job, normalizedWorkMode, normalizedTab, String(jobTypeFilter).trim().toLowerCase()))
      .filter((job) => (unresolvedByJob[job.job_no] || 0) > 0);
    const pendingQueriesCount = jobsWithQueries.length;

    const summarized = summarizedBase
      .map((job) => ({
        ...job,
        unresolved_queries: unresolvedByJob[job.job_no] || 0,
      }))
      .filter((job) => matchesTab(job, normalizedWorkMode, normalizedTab, String(jobTypeFilter).trim().toLowerCase()))
      .filter((job) => {
        if (normalizedTab === "club-jobs") return true; // Defer unresolved check for club jobs to preserve parents
        return String(unresolvedOnly).toLowerCase() === "true" ? job.unresolved_queries > 0 : true;
      });

    // If search is active, apply prioritized sort in memory
    if (search && normalizedTab !== "club-jobs") {
      const s = String(search).toLowerCase();
      summarized.sort((a, b) => {
        const getPriority = (job) => {
          if (String(job.job_no || "").toLowerCase().includes(s)) return 1;
          if (String(job.sb_no || "").toLowerCase().includes(s)) return 2;
          if (String(job.booking_no || "").toLowerCase().includes(s)) return 3;
          if ((job.container_summary || []).some((c) => String(c).toLowerCase().includes(s))) return 3;
          if ((job.invoice_numbers || []).some((i) => String(i).toLowerCase().includes(s))) return 4;
          return 5;
        };

        const priorityDifference = getPriority(a) - getPriority(b);
        if (priorityDifference !== 0) return priorityDifference;
        return String(a.job_no || "").localeCompare(String(b.job_no || ""));
      });
    }

    if (normalizedTab === "club-jobs") {
      const groups = {};
      summarized.forEach(job => {
        const parentId = job.is_club_job_parent ? job.job_no : (job.parent_club_job || "UNKNOWN");
        if (!groups[parentId]) {
          groups[parentId] = { parent: null, children: [] };
        }
        if (job.is_club_job_parent) {
          groups[parentId].parent = job;
        } else {
          groups[parentId].children.push(job);
        }
      });

      const sortedClubJobs = [];
      const parentIds = Object.keys(groups).sort((a, b) => b.localeCompare(a));
      parentIds.forEach(pid => {
        const group = groups[pid];
        if (group.parent) {
          group.children.sort((a, b) => String(a.job_no || "").localeCompare(String(b.job_no || "")));
          group.parent.subRows = group.children;
          sortedClubJobs.push(group.parent);
        } else {
          sortedClubJobs.push(...group.children);
        }
      });
      if (String(unresolvedOnly).toLowerCase() === "true") {
        summarized.splice(0, summarized.length, ...sortedClubJobs.filter(parent =>
          parent.unresolved_queries > 0 ||
          (parent.subRows && parent.subRows.some(child => child.unresolved_queries > 0))
        ));
      } else {
        summarized.splice(0, summarized.length, ...sortedClubJobs);
      }
    }

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
        pendingQueriesCount,
      },
    });
  } catch (error) {
    console.error("Error fetching export billing jobs:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
