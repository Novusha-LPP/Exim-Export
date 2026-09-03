import express from "express";
import axios from "axios";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import UserModel from "../../model/userModel.mjs";
import importDbConnection from "../../model/importDB.js";
import { detectSbOrSealChange } from "../../utils/sbSealChangeDetector.mjs";

const router = express.Router();

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Helper function to check if only billing-related fields are being updated
function isBillingOnlyUpdate(updateObject) {
  // Billing-allowed field path patterns
  const billingAllowedPatterns = [
    "operations.0.statusDetails.0.billing_details.agency_bill_no",
    "operations.0.statusDetails.0.billing_details.agency_bill_date",
    "operations.0.statusDetails.0.billing_details.reimbursement_bill_no",
    "operations.0.statusDetails.0.billing_details.reimbursement_bill_date",
    "operations.0.statusDetails.0.billingDocsSentDt",
    "operations.0.statusDetails.0.billingDocsSentUpload",
    "operations.0.statusDetails.0.billing_details"
  ];

  for (const key of Object.keys(updateObject)) {
    if (key === "updatedAt") continue;

    // Allow non-admins to reject a job by setting send_for_billing to false and clearing the date
    if (key === "send_for_billing" && updateObject[key] === false) {
      continue;
    }
    if (key === "send_for_billing_date" && (updateObject[key] === null || updateObject[key] === "" || updateObject[key] === undefined)) {
      continue;
    }

    // If field is a string path (from fieldUpdates array), check against allowed patterns
    if (typeof key === "string" && key.includes("operations")) {
      // Normalize the field path for comparison
      const fieldPath = key;
      const isAllowed = billingAllowedPatterns.some(pattern =>
        fieldPath === pattern || fieldPath.startsWith(pattern + ".")
      );

      if (!isAllowed) {
        return false; // Found a non-billing field path
      }
      continue;
    }

    // Check if this is a nested operations update (direct object structure)
    if (key === "operations" && Array.isArray(updateObject[key])) {
      const ops = updateObject[key];
      if (ops[0]?.statusDetails?.[0]) {
        const statusDetail = ops[0].statusDetails[0];
        // Only billing_details and billing-related docs are allowed
        const allowedBillingKeys = ["billing_details", "billingDocsSentDt", "billingDocsSentUpload"];
        for (const detailKey of Object.keys(statusDetail)) {
          if (!allowedBillingKeys.includes(detailKey)) {
            return false; // Found a non-billing field
          }
        }
      }
      continue;
    }

    // Not a billing field
    return false;
  }

  return true;
}

async function syncToClientDatabase(jobNo, updateObject) {
  try {
    if (!jobNo || !updateObject || Object.keys(updateObject).length === 0) return;
    if (importDbConnection.readyState !== 1) {
      console.log("[Client Sync] Import DB connection is not ready. Skipping sync.");
      return;
    }
    const clientJobsColl = importDbConnection.db.collection("jobs");
    const matchingJob = await clientJobsColl.findOne({ job_no: jobNo });
    if (matchingJob) {
      console.log(`[Client Sync] Found matching Client job for job_no: ${jobNo}. Mirroring updates.`);
      await clientJobsColl.updateOne({ job_no: jobNo }, { $set: updateObject });
    }
  } catch (err) {
    console.error("[Client Sync] Failed to sync update to Client database:", err.message);
  }
}

function extractJobNoFromPath(req, suffix) {
  const rawPath = req.path || req.originalUrl || "";
  const cleaned = rawPath.split("?")[0];
  const regex = new RegExp(`(?:/api)?/(.+)/${suffix}$`, "i");
  const match = cleaned.match(regex);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  const raw = req.params.job_no || req.params[0] || "";
  return decodeURIComponent(raw);
}

async function findJobByJobNoOrEnquiry(job_no) {
  if (!job_no) return null;
  const rawNo = decodeURIComponent(job_no);
  const escaped = rawNo.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  let job = await ExJobModel.findOne({
    $or: [
      { job_no: { $regex: `^${escaped}$`, $options: "i" } },
      { jobNumber: { $regex: `^${escaped}$`, $options: "i" } }
    ]
  });

  if (!job && rawNo.startsWith("FF")) {
    const enquiry = await FreightEnquiryModel.findOne({
      $or: [
        { enquiry_no: rawNo },
        { success_no: rawNo }
      ]
    });
    if (enquiry) {
      const altJobNos = [enquiry.enquiry_no, enquiry.success_no].filter(Boolean);
      job = await ExJobModel.findOne({
        $or: [
          { job_no: { $in: altJobNos } },
          { jobNumber: { $in: altJobNos } }
        ]
      });

      // If job STILL does not exist in ExJobModel, create JIT job record from FreightEnquiry
      if (!job) {
        console.log(`[JIT findJob] Creating job record for Freight Enquiry: ${rawNo}`);
        const actualJobNo = enquiry.success_no || enquiry.enquiry_no;
        const isImport = String(enquiry.shipment_type || "").startsWith("Import");
        job = new ExJobModel({
          job_no: actualJobNo,
          jobNumber: actualJobNo,
          year: String(new Date().getFullYear()).slice(-2) + "-" + String(new Date().getFullYear() + 1).slice(-2),
          job_date: enquiry.enquiry_date || new Date().toISOString().split("T")[0],
          exporter: isImport ? "" : enquiry.organization_name,
          shipper: isImport ? "" : enquiry.organization_name,
          consignees: isImport ? [{
            consignee_name: enquiry.organization_name,
            consignee_address: "",
            consignee_country: ""
          }] : [{
            consignee_name: "",
            consignee_address: "",
            consignee_country: ""
          }],
          consignmentType: enquiry.consignment_type,
          port_of_loading: enquiry.port_of_loading,
          port_of_discharge: enquiry.port_of_destination,
          isGeneralJob: true,
          status: "Pending",
          detailedStatus: "Created from Freight Enquiry",
          movement_type: enquiry.movement_type,
          gross_weight_kg: enquiry.gross_weight,
          gross_weight_unit: enquiry.gross_weight_unit,
          net_weight_kg: enquiry.net_weight,
          net_weight_unit: enquiry.net_weight_unit,
          chargeable_weight: enquiry.chargeable_weight,
          chargeable_weight_unit: enquiry.chargeable_weight_unit,
          volume_cbm: enquiry.volume_cbm,
          volume_unit: enquiry.volume_unit,
          total_no_of_pkgs: enquiry.no_packages,
          package_unit: enquiry.package_unit,
          volume_weight: enquiry.volume_weight,
        });
        try {
          await job.save();
        } catch (saveErr) {
          if (saveErr.code === 11000) {
            job = await ExJobModel.findOne({
              $or: [
                { job_no: actualJobNo },
                { jobNumber: actualJobNo },
                { job_no: rawNo },
                { jobNumber: rawNo }
              ]
            });
          } else {
            throw saveErr;
          }
        }
      }
    }
  }

  return job;
}

function validateSendForBilling(job, updates) {
  if (updates.send_for_billing === true || updates.send_for_billing === "true") {
    const isAir = String(updates.transportMode || job.transportMode || "").toUpperCase() === "AIR" ||
      String(job.job_no || "").toUpperCase().includes("/AIR/") ||
      String(updates.consignmentType || job.consignmentType || "").toUpperCase() === "AIR";
    const isLCL = String(updates.consignmentType || job.consignmentType || "").toUpperCase() === "LCL";
    const isGen = String(job.job_no || "").toUpperCase().startsWith("GEN");
    const jobNoStr = String(updates.job_no || job.job_no || "").toUpperCase();
    const isFF = jobNoStr.startsWith("FF") ||
      jobNoStr.includes("FF-") ||
      jobNoStr.includes("/FF/") ||
      String(updates.job_type || job.job_type || "").toLowerCase().includes("freight") ||
      String(updates.detailedStatus || job.detailedStatus || "").toLowerCase().includes("freight") ||
      String(updates.jobCategory || job.jobCategory || "").toLowerCase().includes("freight") ||
      job.freight === true || updates.freight === true ||
      job.is_freight === true || updates.is_freight === true ||
      job.isFreightForwarding === true || updates.isFreightForwarding === true;

    if (!isAir && !isLCL && !isGen && !isFF) {
      const ops = updates.operations || job.operations || [];
      const firstOp = ops[0] || {};
      const status = firstOp.statusDetails?.[0] || {};

      const railRoadOutDate = status.handoverConcorTharSanganaRailRoadDate;
      const reachedDate = status.railOutReachedDate;

      if (!railRoadOutDate || !String(railRoadOutDate).trim() || !reachedDate || !String(reachedDate).trim()) {
        return "Cannot send for billing: Rail Out/Road Out date and Reached date are required.";
      }
    }
  }
  return null;
}

async function applyParentDatesIfChild(existingJob, updateObject) {
  const parentJobNo = existingJob.parent_club_job;
  if (!parentJobNo) return;

  const parentJob = await ExJobModel.findOne({ job_no: parentJobNo }).lean();
  if (!parentJob) return;

  const parentStatus = parentJob.operations?.[0]?.statusDetails?.[0] || {};
  const parentRailRoadDate = parentStatus.handoverConcorTharSanganaRailRoadDate;
  const parentReachedDate = parentStatus.railOutReachedDate;

  if (parentRailRoadDate || parentReachedDate) {
    if (!updateObject.operations) {
      updateObject.operations = JSON.parse(JSON.stringify(existingJob.operations || []));
    }
    if (!updateObject.operations[0]) {
      updateObject.operations[0] = { statusDetails: [{}] };
    }
    if (!updateObject.operations[0].statusDetails) {
      updateObject.operations[0].statusDetails = [{}];
    }
    if (!updateObject.operations[0].statusDetails[0]) {
      updateObject.operations[0].statusDetails[0] = {};
    }

    const childStatus = updateObject.operations[0].statusDetails[0];
    if (parentRailRoadDate) {
      childStatus.handoverConcorTharSanganaRailRoadDate = parentRailRoadDate;
    }
    if (parentReachedDate) {
      childStatus.railOutReachedDate = parentReachedDate;
    }
  }
}

async function syncClubFields(job) {
  try {
    if (!job) return;

    const isClubJob = job.is_club_job_parent || !!job.parent_club_job;
    if (!isClubJob) return;

    const parentJobNo = job.is_club_job_parent ? job.job_no : job.parent_club_job;

    // Find all sibling jobs in the same club (including parent if current is child)
    const siblingJobs = await ExJobModel.find({
      $or: [
        { job_no: parentJobNo },
        { parent_club_job: parentJobNo }
      ],
      job_no: { $ne: job.job_no }
    });

    if (siblingJobs.length === 0) return;

    const op0Status = job.operations?.[0]?.statusDetails?.[0] || {};

    const updates = {
      send_for_billing: job.send_for_billing,
      send_for_billing_date: job.send_for_billing_date,
      vgm_done: job.vgm_done,
      vgm_date: job.vgm_date,
      form13_done: job.form13_done,
      form13_date: job.form13_date,
    };

    // Update each sibling
    for (const sibling of siblingJobs) {
      if (!sibling.operations) {
        sibling.operations = [{ statusDetails: [{}] }];
      }
      if (!sibling.operations[0]) {
        sibling.operations[0] = { statusDetails: [{}] };
      }
      if (!sibling.operations[0].statusDetails) {
        sibling.operations[0].statusDetails = [{}];
      }
      if (!sibling.operations[0].statusDetails[0]) {
        sibling.operations[0].statusDetails[0] = {};
      }

      const sibOp0 = sibling.operations[0].statusDetails[0];

      // Sync operational dates
      sibOp0.handoverForwardingNoteDate = op0Status.handoverForwardingNoteDate || "";
      sibOp0.containerPlacementDate = op0Status.containerPlacementDate || "";
      sibOp0.gateInDate = op0Status.gateInDate || "";

      // Copy rail out/road out and reached dates only if the source is the parent job
      if (job.is_club_job_parent) {
        sibOp0.handoverConcorTharSanganaRailRoadDate = op0Status.handoverConcorTharSanganaRailRoadDate || "";
        sibOp0.railOutReachedDate = op0Status.railOutReachedDate || "";
      }

      // Sync operational uploads
      sibOp0.handoverImageUpload = op0Status.handoverImageUpload || [];
      sibOp0.manualVgmUpload = op0Status.manualVgmUpload || [];
      sibOp0.cmaForwardingNoteUpload = op0Status.cmaForwardingNoteUpload || [];
      sibOp0.assessmentCopy = op0Status.assessmentCopy || [];

      // Sync billing details
      if (op0Status.billingDocsSentDt) {
        sibOp0.billingDocsSentDt = op0Status.billingDocsSentDt;
      }
      if (op0Status.billingDocsSentUpload && op0Status.billingDocsSentUpload.length > 0) {
        sibOp0.billingDocsSentUpload = op0Status.billingDocsSentUpload;
      }
      if (op0Status.billing_details) {
        if (!sibOp0.billing_details) {
          sibOp0.billing_details = {};
        }
        if (op0Status.billing_details.agency_bill_date) {
          sibOp0.billing_details.agency_bill_date = op0Status.billing_details.agency_bill_date;
        }
        if (op0Status.billing_details.agency_bill_no) {
          sibOp0.billing_details.agency_bill_no = op0Status.billing_details.agency_bill_no;
        }
        if (op0Status.billing_details.reimbursement_bill_date) {
          sibOp0.billing_details.reimbursement_bill_date = op0Status.billing_details.reimbursement_bill_date;
        }
        if (op0Status.billing_details.reimbursement_bill_no) {
          sibOp0.billing_details.reimbursement_bill_no = op0Status.billing_details.reimbursement_bill_no;
        }
      }

      // Sync top level fields
      sibling.send_for_billing = updates.send_for_billing;
      sibling.send_for_billing_date = updates.send_for_billing_date;
      sibling.vgm_done = updates.vgm_done;
      sibling.vgm_date = updates.vgm_date;
      sibling.form13_done = updates.form13_done;
      sibling.form13_date = updates.form13_date;

      sibling.markModified("operations");
      sibling.markModified("milestones");
      sibling.markModified("detailedStatus");
      sibling.markModified("vgm_done");
      sibling.markModified("form13_done");
      sibling.markModified("shipping_bill_done");
      sibling.markModified("isBuyer");

      sibling._isClubSync = true;
      await sibling.save();

      const clientUpdate = {
        send_for_billing: sibling.send_for_billing,
        send_for_billing_date: sibling.send_for_billing_date,
        vgm_done: sibling.vgm_done,
        vgm_date: sibling.vgm_date,
        form13_done: sibling.form13_done,
        form13_date: sibling.form13_date,
        "operations.0.statusDetails.0.handoverForwardingNoteDate": sibOp0.handoverForwardingNoteDate,
        "operations.0.statusDetails.0.handoverConcorTharSanganaRailRoadDate": sibOp0.handoverConcorTharSanganaRailRoadDate,
        "operations.0.statusDetails.0.railOutReachedDate": sibOp0.railOutReachedDate,
        "operations.0.statusDetails.0.containerPlacementDate": sibOp0.containerPlacementDate,
        "operations.0.statusDetails.0.gateInDate": sibOp0.gateInDate,
        "operations.0.statusDetails.0.handoverImageUpload": sibOp0.handoverImageUpload,
        "operations.0.statusDetails.0.manualVgmUpload": sibOp0.manualVgmUpload,
        "operations.0.statusDetails.0.cmaForwardingNoteUpload": sibOp0.cmaForwardingNoteUpload,
        "operations.0.statusDetails.0.assessmentCopy": sibOp0.assessmentCopy,
        "operations.0.statusDetails.0.billingDocsSentDt": sibOp0.billingDocsSentDt,
        "operations.0.statusDetails.0.billingDocsSentUpload": sibOp0.billingDocsSentUpload,
        "operations.0.statusDetails.0.billing_details": sibOp0.billing_details,
      };

      await syncToClientDatabase(sibling.job_no, clientUpdate);
    }
  } catch (err) {
    console.error("[Club Fields Sync] Error syncing club fields:", err);
  }
}

const IMPEXCUBE_BASE_URL =
  process.env.IMPEXCUBE_BASE_URL ||
  process.env.IMEXCUBE_BASE_URL ||
  "https://impexapi.impexcube.in";
const IMPEXCUBE_LOGIN_PATH =
  process.env.IMPEXCUBE_LOGIN_PATH || "/api/Authentication/login";
const IMPEXCUBE_EXPORT_CREATE_PATH =
  process.env.IMPEXCUBE_EXPORT_CREATE_PATH || "/api/v1/ExpJobCreation/CreateJob";
const IMPEXCUBE_EXPORT_GET_DETAILS_PATH =
  process.env.IMPEXCUBE_EXPORT_GET_DETAILS_PATH || "/api/v1/GetJobDetails/getexpdetails";
const IMPEXCUBE_TIMEOUT_MS = Number(process.env.IMPEXCUBE_TIMEOUT_MS || 30000);
const IMPEXCUBE_TEST_HOST = "testimpexapi.impexcube.in";
const IMPEXCUBE_TEST_DEFAULTS = {
  username: "test",
  password: "testabc",
  companyBrCode: "8A6EE027-A8FF-40E3-9468-00F1BB57F1C",
};

const buildImpexCubeUrl = (path) =>
  `${IMPEXCUBE_BASE_URL.replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;

async function getImpexCubeAccessToken(financialYear, branchCode) {
  const isDocumentedTestHost = IMPEXCUBE_BASE_URL.includes(IMPEXCUBE_TEST_HOST);
  const username =
    process.env.IMPEXCUBE_USERNAME ||
    process.env.IMPEX_USERNAME ||
    (isDocumentedTestHost ? IMPEXCUBE_TEST_DEFAULTS.username : "");
  const password =
    process.env.IMPEXCUBE_PASSWORD ||
    process.env.IMPEX_PASSWORD ||
    (isDocumentedTestHost ? IMPEXCUBE_TEST_DEFAULTS.password : "");

  let companyBrCode = "";
  const normalizedBranch = String(branchCode || "").toUpperCase().trim();
  if (normalizedBranch === "AMD") {
    companyBrCode = process.env.COMPANY_BR_CODE_AMD || "5E8D2587-A7BA-49A2-B836-21C70B2AAF47";
  } else if (normalizedBranch === "GIM") {
    companyBrCode = process.env.COMPANY_BR_CODE_GIM || "8677A8AA-D338-4413-8CCD-48DB23D28EBD";
  } else if (normalizedBranch === "COK") {
    companyBrCode = process.env.COMPANY_BR_CODE_COK || "F9BB73B5-C772-4474-866B-C8B2790B7448";
  }

  if (!companyBrCode) {
    companyBrCode =
      process.env.IMPEXCUBE_COMPANY_BR_CODE ||
      process.env.COMPANY_BR_CODE ||
      (isDocumentedTestHost ? IMPEXCUBE_TEST_DEFAULTS.companyBrCode : "");
  }

  const fyear = process.env.IMPEXCUBE_FYEAR || process.env.FYEAR || financialYear;

  const missing = [];
  if (!username) missing.push("IMPEXCUBE_USERNAME");
  if (!password) missing.push("IMPEXCUBE_PASSWORD");
  if (!companyBrCode) missing.push("IMPEXCUBE_COMPANY_BR_CODE");
  if (!fyear) missing.push("IMPEXCUBE_FYEAR");

  if (missing.length > 0) {
    const error = new Error(`Missing ImpexCube configuration: ${missing.join(", ")}`);
    error.statusCode = 500;
    throw error;
  }

  const response = await axios.post(buildImpexCubeUrl(IMPEXCUBE_LOGIN_PATH), null, {
    params: {
      username,
      password,
      CompanyBrCode: companyBrCode,
      Fyear: fyear,
    },
    headers: { accept: "*/*" },
    timeout: IMPEXCUBE_TIMEOUT_MS,
  });

  const token = response.data?.data?.accessToken;
  if (!token) {
    const error = new Error(response.data?.message || "ImpexCube authentication did not return an access token");
    error.statusCode = response.status || 502;
    error.impexCubeResponse = response.data;
    throw error;
  }

  return token;
}

// GET /api/job-numbers-search - Search for job numbers for 'Copy From' feature
router.get("/job-numbers-search", async (req, res) => {
  try {
    const { q = "", year = "", completed } = req.query;
    const filter = { job_no: { $not: /^FF/i } };
    const andConditions = [];
    if (q) {
      andConditions.push({ job_no: { $regex: q, $options: "i" } });
    }
    if (year) {
      andConditions.push({ year: year });
    }
    if (completed === "true") {
      andConditions.push({ status: "Completed" });
    }
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const jobs = await ExJobModel.find(filter)
      .select("job_no")
      .limit(20)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: jobs.map(j => j.job_no) });
  } catch (error) {
    console.error("Error searching job numbers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard-stats - Get dashboard statistics
router.get("/dashboard-stats", async (req, res) => {
  try {
    const {
      exporter = "",
      consignmentType = "",
      branch = "",
      year = "",
    } = req.query;

    const matchStage = {};
    if (!matchStage.$and) matchStage.$and = [];

    // Fetch user restrictions
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin") {
        let branchRestrictions = requester.selected_branches || [];
        const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
        branchRestrictions = branchRestrictions.map(b => BRANCH_MAP[b.toUpperCase()] || b);

        if (branchRestrictions.length > 0) {
          const branchRegexStr = branchRestrictions.map(r => String(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
          const fallbackRegex = `^(${branchRegexStr})(/|$)`;
          matchStage.$and.push({
            $or: [
              { branch_code: { $in: branchRestrictions } },
              {
                $and: [
                  { $or: [{ branch_code: "" }, { branch_code: null }, { branch_code: { $exists: false } }] },
                  { job_no: { $regex: fallbackRegex, $options: "i" } }
                ]
              }
            ]
          });
        } else {
          matchStage.$and.push({ branch_code: { $in: [] } });
        }

        const portRestrictions = requester.selected_ports || [];
        const icdRestrictions = requester.selected_icd_codes || [];
        const combinedRestrictions = [...new Set([...portRestrictions, ...icdRestrictions])];

        if (combinedRestrictions.length > 0) {
          const finalRestrictions = [];
          combinedRestrictions.forEach(res => {
            finalRestrictions.push(res);
            if (res.includes(" - ")) {
              finalRestrictions.push(res.split(" - ")[0].trim());
            }
          });

          const combinedRegexStr = finalRestrictions.map(r =>
            `^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
          ).join('|');

          matchStage.$and.push({
            $or: [
              { custom_house: { $regex: combinedRegexStr, $options: "i" } },
              { port_of_loading: { $regex: combinedRegexStr, $options: "i" } }
            ]
          });
        }
      }
    }

    // 1. Build Match Stage (Filtering)
    if (exporter) matchStage.$and.push({ exporter: { $regex: escapeRegex(exporter), $options: "i" } });
    if (consignmentType) matchStage.$and.push({ consignmentType: consignmentType });
    if (branch) matchStage.$and.push({ branch_code: { $regex: `^${escapeRegex(branch)}$`, $options: "i" } });

    // Year filter - matches exact string "YY-YY" format (e.g. "25-26")
    if (year && year !== "all") {
      matchStage.$and.push({ year: year });
    }

    if (matchStage.$and.length === 0) delete matchStage.$and;

    // 2. Run Aggregation
    const stats = await ExportJobModel.aggregate([
      { $match: matchStage },
      {
        $facet: {
          // A. Counts — aligned with the same logic used in /exports?status=X
          counts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                // Cancelled takes highest priority
                cancelled: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: [{ $toLower: { $ifNull: ["$status", ""] } }, "cancelled"] },
                          { $eq: ["$isJobCanceled", true] },
                        ],
                      },
                      1, 0,
                    ],
                  },
                },
                // Completed: status=completed OR isJobtrackingEnabled=true (NOT cancelled)
                completed: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: [{ $toLower: { $ifNull: ["$status", ""] } }, "cancelled"] },
                          { $ne: ["$isJobCanceled", true] },
                          {
                            $or: [
                              { $eq: [{ $toLower: { $ifNull: ["$status", ""] } }, "completed"] },
                              { $eq: ["$isJobtrackingEnabled", true] },
                              // Treat anything else NOT pending/blank as completed
                              {
                                $and: [
                                  { $ne: [{ $toLower: { $ifNull: ["$status", ""] } }, "pending"] },
                                  { $ne: [{ $ifNull: ["$status", ""] }, ""] }
                                ]
                              }
                            ],
                          },
                        ],
                      },
                      1, 0,
                    ],
                  },
                },
                // Pending: (status=pending/blank) AND NOT jobTracking AND NOT cancelled
                // Mirrors the Jobs tab "Pending" filter exactly
                pending: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          // Not cancelled
                          { $ne: [{ $toLower: { $ifNull: ["$status", ""] } }, "cancelled"] },
                          { $ne: ["$isJobCanceled", true] },
                          // Not completed via tracking
                          { $ne: ["$isJobtrackingEnabled", true] },
                          // Status is pending or not set
                          {
                            $or: [
                              { $eq: [{ $toLower: { $ifNull: ["$status", ""] } }, "pending"] },
                              { $eq: [{ $ifNull: ["$status", ""] }, ""] },
                            ],
                          },
                        ],
                      },
                      1, 0,
                    ],
                  },
                },
              },
            },
          ],
          // B. Monthly Trend — group by year+month of effective date
          monthlyTrend: [
            {
              $addFields: {
                effectiveDate: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$job_date", null] },
                        { $ne: ["$job_date", ""] },
                        { $regexMatch: { input: { $ifNull: ["$job_date", ""] }, regex: "^\\d{2}-\\d{2}-\\d{4}" } }
                      ]
                    },
                    then: {
                      $dateFromString: {
                        dateString: "$job_date",
                        format: "%d-%m-%Y",
                        onError: "$createdAt"
                      }
                    },
                    else: "$createdAt"
                  }
                }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: "$effectiveDate" },
                  month: { $month: "$effectiveDate" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
        },
      },
    ]);

    const result = stats[0];
    const counts = result.counts[0] || {
      total: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };

    res.json({
      success: true,
      data: {
        ...counts,
        monthlyTrend: result.monthlyTrend,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
    });
  }
});

// GET /api/custom-house-list - Get list of unique custom houses from existing jobs
router.get("/custom-house-list", async (req, res) => {
  try {
    const customHouses = await ExportJobModel.distinct("custom_house");
    res.json({
      success: true,
      data: customHouses.filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching custom house list:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching custom house list",
    });
  }
});

function parseDetailedStatusParam(queryObj) {
  if (!queryObj) return [];
  const val = queryObj.detailedStatus || queryObj["detailedStatus[]"] || queryObj["detailedStatus"];
  if (!val) return [];
  let list = [];
  if (Array.isArray(val)) {
    list = val;
  } else if (typeof val === "string") {
    list = val.split(",");
  }
  return list.map(s => String(s).trim()).filter(s => s !== "" && s !== "null" && s !== "undefined");
}

// GET /api/global-search-jobs - Search for jobs across all statuses
router.get("/global-search-jobs", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      branch = "",
      year = "",
      status = "all",
      month = "",
      exporter = "",
      consignmentType = "",
      detailedStatus = "",
      customHouse = "",
      goods_stuffed_at = "",
      jobOwner = "",
    } = req.query;

    const filter = {};
    if (!filter.$and) filter.$and = [];

    // 1. Fetch user restrictions
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin" && (!search || String(search).trim() === "")) {
        let branchRestrictions = requester.selected_branches || [];
        const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
        branchRestrictions = branchRestrictions.map(b => BRANCH_MAP[b.toUpperCase()] || b);

        if (branchRestrictions.length > 0) {
          const branchRegexStr = branchRestrictions.map(r => String(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
          const fallbackRegex = `^(${branchRegexStr})(/|$)`;
          filter.$and.push({
            $or: [
              { branch_code: { $in: branchRestrictions } },
              {
                $and: [
                  { $or: [{ branch_code: "" }, { branch_code: null }, { branch_code: { $exists: false } }] },
                  { job_no: { $regex: fallbackRegex, $options: "i" } }
                ]
              }
            ]
          });
        } else {
          filter.$and.push({ branch_code: { $in: [] } });
        }

        const portRestrictions = requester.selected_ports || [];
        const icdRestrictions = requester.selected_icd_codes || [];
        const combinedRestrictions = [...new Set([...portRestrictions, ...icdRestrictions])];

        if (combinedRestrictions.length > 0) {
          const finalRestrictions = [];
          combinedRestrictions.forEach(res => {
            finalRestrictions.push(res);
            if (res.includes(" - ")) {
              finalRestrictions.push(res.split(" - ")[0].trim());
            }
          });

          const combinedRegexStr = finalRestrictions.map(r =>
            `^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
          ).join('|');

          filter.$and.push({
            $or: [
              { custom_house: { $regex: combinedRegexStr, $options: "i" } },
              { port_of_loading: { $regex: combinedRegexStr, $options: "i" } }
            ]
          });
        }
      }
    }

    if (jobOwner) filter.$and.push({ job_owner: { $regex: jobOwner, $options: "i" } });

    // Exclude Freight Forwarding jobs (FF) from Export module global search
    filter.$and.push({ job_no: { $not: /^FF/i } });

    // 2. Status filter
    // CRITICAL FIX: If there is a search query, we IGNORE the status filter to make it truly global across tabs
    if ((!search || search.trim() === "") && status && status.toLowerCase() !== "all") {
      const statusLower = status.toLowerCase();

      if (statusLower === "pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
            { isJobCanceled: { $ne: true } },
          ],
        });
      } else if (statusLower === "completed") {
        filter.$and.push({
          $and: [
            { status: { $regex: "^(?!cancelled$).*", $options: "i" } },
            { isJobCanceled: { $ne: true } },
            {
              $or: [
                { status: { $regex: "^completed$", $options: "i" } },
                { detailedStatus: "Billing Done" },
              ],
            },
          ],
        });
      } else if (statusLower === "cancelled") {
        filter.$and.push({
          $or: [
            { status: { $regex: "^cancelled$", $options: "i" } },
            { isJobCanceled: true },
          ],
        });
      } else if (statusLower === "billing ready") {
        filter.$and.push({
          $and: [
            { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } },
            { "operations.statusDetails.handoverImageUpload": { $exists: true, $not: { $size: 0 } } },
            { "operations.statusDetails.billingDocsSentDt": { $in: [null, ""] } },
            {
              $or: [
                { "operations.statusDetails.billing_details.agency_bill_date": { $in: [null, ""] } },
                { "operations.statusDetails.billing_details.agency_bill_no": { $in: [null, ""] } }
              ]
            },
            {
              $or: [
                { "operations.statusDetails.billing_details.reimbursement_bill_date": { $in: [null, ""] } },
                { "operations.statusDetails.billing_details.reimbursement_bill_no": { $in: [null, ""] } }
              ]
            }
          ]
        });
      } else if (statusLower === "op completed") {
        filter.$and.push({
          $or: [
            // FCL jobs completed ONLY if LEO, Handover, Rail Out, and Rail Reached dates are all set
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
            // Air/LCL jobs completed ONLY if LEO and Handover dates are set
            {
              $and: [
                {
                  $or: [
                    { consignmentType: "LCL" },
                    { job_no: { $regex: "/AIR/", $options: "i" } }
                  ]
                },
                { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
                { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } }
              ]
            }
          ]
        });
        filter.$and.push({
          $or: [
            { "operations.statusDetails.billingDocsSentDt": { $exists: false } },
            { "operations.statusDetails.billingDocsSentDt": null },
            { "operations.statusDetails.billingDocsSentDt": "" },
            { "operations.statusDetails.billing_details.agency_bill_date": { $exists: false } },
            { "operations.statusDetails.billing_details.agency_bill_date": null },
            { "operations.statusDetails.billing_details.agency_bill_date": "" },
            { "operations.statusDetails.billing_details.agency_bill_no": { $exists: false } },
            { "operations.statusDetails.billing_details.agency_bill_no": null },
            { "operations.statusDetails.billing_details.agency_bill_no": "" },
            { "operations.statusDetails.billing_details.reimbursement_bill_date": { $exists: false } },
            { "operations.statusDetails.billing_details.reimbursement_bill_date": null },
            { "operations.statusDetails.billing_details.reimbursement_bill_date": "" },
            { "operations.statusDetails.billing_details.reimbursement_bill_no": { $exists: false } },
            { "operations.statusDetails.billing_details.reimbursement_bill_no": null },
            { "operations.statusDetails.billing_details.reimbursement_bill_no": "" },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      } else if (statusLower === "booking pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
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
      } else if (statusLower === "handover pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
          ],
          "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
          $or: [
            { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      }
    }

    // 3. Search filter
    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and.push({
        $or: [
          { job_no: { $regex: escapedSearch, $options: "i" } },
          { exporter: { $regex: escapedSearch, $options: "i" } },
          { ieCode: { $regex: escapedSearch, $options: "i" } },
          { "consignees.consignee_name": { $regex: escapedSearch, $options: "i" } },
          { sb_no: { $regex: escapedSearch, $options: "i" } },
          { "invoices.invoiceNumber": { $regex: escapedSearch, $options: "i" } },
          { "containers.containerNo": { $regex: escapedSearch, $options: "i" } },
          { port_of_discharge: { $regex: escapedSearch, $options: "i" } },
          { exporter_ref_no: { $regex: escapedSearch, $options: "i" } },
          { awb_bl_no: { $regex: escapedSearch, $options: "i" } },
          { custom_house: { $regex: escapedSearch, $options: "i" } },
          { booking_no: { $regex: escapedSearch, $options: "i" } },
          { "invoices.invoiceNo": { $regex: escapedSearch, $options: "i" } },
          { port_of_loading: { $regex: escapedSearch, $options: "i" } },
          { destination_port: { $regex: escapedSearch, $options: "i" } }
        ],
      });
    }

    // 3. Apply OTHER filters ONLY if NOT searching globally
    if (!search || search.trim() === "") {
      if (branch) {
        filter.$and.push({ branch_code: { $regex: `^${escapeRegex(branch)}$`, $options: "i" } });
      }

      if (year && year !== "all") {
        filter.$and.push({ year: year });
      }

      if (exporter) {
        filter.$and.push({ exporter: { $regex: escapeRegex(exporter), $options: "i" } });
      }

      if (consignmentType) {
        filter.$and.push({ consignmentType: consignmentType });
      }

      const statusArrayInput = parseDetailedStatusParam(req.query);
      if (statusArrayInput.length > 0) {
        let statusArray = [...statusArrayInput];
        if (statusArray.includes("Rail Out")) {
          statusArray = [...statusArray, "Road Out", "Road out", "road out", "RAIL OUT", "ROAD OUT"];
        }

        // Handle "Send for Billing" as a virtual status (not stored in detailedStatus field)
        const hasSendForBilling = statusArray.includes("Send for Billing");
        const filteredStatusArray = statusArray.filter(s => s !== "Send for Billing");

        const orConditions = [];

        if (filteredStatusArray.length > 0) {
          if (filteredStatusArray.includes("Pending")) {
            orConditions.push(
              { detailedStatus: { $in: filteredStatusArray } },
              { detailedStatus: { $in: [null, "", "Pending"] } },
              { detailedStatus: { $exists: false } }
            );
          } else {
            orConditions.push({ detailedStatus: { $in: filteredStatusArray } });
          }
        }

        if (hasSendForBilling) {
          orConditions.push({
            send_for_billing: true,
            send_for_billing_date: { $exists: true, $nin: [null, ""] }
          });
        }

        if (orConditions.length > 0) {
          filter.$and.push({ $or: orConditions });
        }

        if (!hasSendForBilling && filteredStatusArray.length > 0 && !filteredStatusArray.includes("Pending")) {
          filter.$and.push({
            $or: [
              { send_for_billing: { $ne: true } },
              { send_for_billing_date: { $exists: false } },
              { send_for_billing_date: { $in: [null, ""] } }
            ]
          });
        }
      }

      if (customHouse) {
        filter.$and.push({ custom_house: { $regex: customHouse, $options: "i" } });
      }

      if (goods_stuffed_at) {
        filter.$and.push({ goods_stuffed_at: goods_stuffed_at });
      }

      if (month) {
        if (month === "today") {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          filter.$and.push({ createdAt: { $gte: start, $lte: end } });
        } else if (month === "yesterday") {
          const start = new Date();
          start.setDate(start.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setDate(end.getDate() - 1);
          end.setHours(23, 59, 59, 999);
          filter.$and.push({ createdAt: { $gte: start, $lte: end } });
        } else if (month === "weekly") {
          const start = new Date();
          start.setDate(start.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          filter.$and.push({ createdAt: { $gte: start, $lte: end } });
        } else if (!isNaN(month)) {
          filter.$and.push({
            $expr: {
              $let: {
                vars: {
                  effDate: {
                    $cond: {
                      if: {
                        $and: [
                          { $ne: ["$job_date", null] },
                          { $ne: ["$job_date", ""] },
                          { $regexMatch: { input: { $ifNull: ["$job_date", ""] }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } }
                        ]
                      },
                      then: {
                        $dateFromString: {
                          dateString: "$job_date",
                          format: "%d-%m-%Y",
                          onError: "$createdAt"
                        }
                      },
                      else: "$createdAt"
                    }
                  }
                },
                in: {
                  $eq: [{ $month: "$$effDate" }, parseInt(month)]
                }
              }
            }
          });
        }
      }
    }

    if (filter.$and.length === 0) delete filter.$and;

    const skip = (page - 1) * limit;

    const [jobs, totalCount] = await Promise.all([
      ExportJobModel.find(filter)
        .select({
          job_no: 1,
          custom_house: 1,
          job_date: 1,
          consignmentType: 1,
          job_owner: 1,
          exporter: 1,
          exporter_ref_no: 1,
          "consignees.consignee_name": 1,
          buyerThirdPartyInfo: 1,
          forwarder: 1,
          booking_no: 1,
          drawback_scroll_no: 1,
          drawback_scroll_date: 1,
          rosctl_scroll_no: 1,
          rosctl_scroll_date: 1,
          ieCode: 1,
          panNo: 1,
          gstin: 1,
          adCode: 1,
          egm_no: 1,
          egm_date: 1,
          "invoices.invoiceNumber": 1,
          "invoices.invoiceDate": 1,
          "invoices.termsOfInvoice": 1,
          "invoices.currency": 1,
          "invoices.invoiceValue": 1,
          "invoices.consigneeName": 1,
          "invoices.invoice_no": 1,
          "invoices.invoice_date": 1,
          "invoices.invValue": 1,
          "invoices.products.drawbackDetails": 1,
          sb_no: 1,
          goods_stuffed_at: 1,
          sb_date: 1,
          destination_port: 1,
          destination_country: 1,
          port_of_discharge: 1,
          discharge_country: 1,
          total_no_of_pkgs: 1,
          package_unit: 1,
          gross_weight_kg: 1,
          net_weight_kg: 1,
          shipping_line_airline: 1,
          detailedStatus: 1,
          status: 1,
          otherInfo: 1,
          annexC1Details: 1,
          booking_copy: 1,
          "containers": 1,
          statusDetails: 1,
          "eSanchitDocuments.fileUrl": 1,
          "eSanchitDocuments.documentType": 1,
          "eSanchitDocuments.icegateFilename": 1,
          total_ar_amount: 1,
          outstanding_balance: 1,
          cha: 1,
          freight_done: 1,
          freight_enquiry_id: 1,
          vgm_done: 1,
          vgm_date: 1,
          form13_done: 1,
          form13_date: 1,
          shipping_bill_done: 1,
          shipping_bill_done_date: 1,
          isLocked: 1,
          branch_code: 1,
          transportMode: 1,
          movement_type: 1,
          port_of_loading: 1,
          billingDetails: 1,
          "operations.statusDetails.containerPlacementDate": 1,
          "operations.statusDetails.handoverForwardingNoteDate": 1,
          "operations.statusDetails.railOutReachedDate": 1,
          "operations.statusDetails.leoDate": 1,
          "operations.statusDetails.leoUpload": 1,
          "operations.statusDetails.booking_copy": 1,
          "operations.statusDetails.bookingUpload": 1,
          "operations.statusDetails.forwardingNoteDocUpload": 1,
          "operations.statusDetails.manualVgmUpload": 1,
          "operations.statusDetails.odexVgmUpload": 1,
          "operations.statusDetails.odexEsbUpload": 1,
          "operations.statusDetails.odexForm13Upload": 1,
          "operations.statusDetails.cmaForwardingNoteUpload": 1,
          "operations.statusDetails.otherDocUpload": 1,
          "operations.statusDetails.otherDocsCustom": 1,
          "operations.statusDetails.stuffingSheetUpload": 1,
          "operations.statusDetails.stuffingPhotoUpload": 1,
          "operations.statusDetails.eGatePassUpload": 1,
          "operations.statusDetails.clpUpload": 1,
          "operations.statusDetails.completionCopyUpload": 1,
          "operations.statusDetails.movementCopyUpload": 1,
          "operations.statusDetails.shippingInstructionsUpload": 1,
          "operations.statusDetails.form13CopyUpload": 1,
          "operations.statusDetails.assessmentCopy": 1,
          "operations.statusDetails.handoverImageUpload": 1,
          "operations.statusDetails.billingDocsSentUpload": 1,
          "operations.statusDetails.billingDocsSentDt": 1,
          "operations.statusDetails.billing_details": 1,
          "operations.statusDetails.status": 1,
          "operations.transporterDetails": 1,
          lockedBy: 1,
          lockedAt: 1,
          is_club_job_parent: 1,
          parent_club_job: 1
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExportJobModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        total: totalCount,
      },
    });
  } catch (error) {
    console.error("Error in global search:", error);
    res.status(500).json({
      success: false,
      message: "Error searching jobs",
      error: error.message,
    });
  }
});

// GET /exports - List all exports with pagination & filtering
// Updated exports API with status filtering
// If jobTracking is enabled and all milestones are completed, status is treated as "completed"
router.get("/exports/:status?", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      exporter = "",
      country = "",
      consignmentType = "",
      branch = "",
      status = "all",
      year = "",
      detailedStatus = "",
      jobOwner = "",
      month = "",
      pendingQueries = false,
      startDate = "",
      endDate = "",
    } = { ...req.params, ...req.query };

    const ClientQueryModel = (await import("../../model/export/ClientQueryModel.mjs")).default;
    const openClientQueryJobs = await ClientQueryModel.find({ status: "open" }).distinct("job_no");

    const filter = {};

    // Initialize $and array for complex queries
    if (!filter.$and) filter.$and = [];

    // 1. Fetch user restrictions
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin") {
        // Enforce Branch Restriction
        let branchRestrictions = requester.selected_branches || [];
        const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
        branchRestrictions = branchRestrictions.map(b => BRANCH_MAP[b.toUpperCase()] || b);

        if (branchRestrictions.length > 0) {
          const branchRegexStr = branchRestrictions.map(r => String(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
          const fallbackRegex = `^(${branchRegexStr})(/|$)`;
          filter.$and.push({
            $or: [
              { branch_code: { $in: branchRestrictions } },
              {
                $and: [
                  { $or: [{ branch_code: "" }, { branch_code: null }, { branch_code: { $exists: false } }] },
                  { job_no: { $regex: fallbackRegex, $options: "i" } }
                ]
              }
            ]
          });
        } else {
          filter.$and.push({ branch_code: { $in: [] } });
        }

        // Enforce Port & ICD Restriction
        const portRestrictions = requester.selected_ports || [];
        const icdRestrictions = requester.selected_icd_codes || [];
        const combinedRestrictions = [...new Set([...portRestrictions, ...icdRestrictions])];

        if (combinedRestrictions.length > 0) {
          const finalRestrictions = [];
          combinedRestrictions.forEach(res => {
            finalRestrictions.push(res);
            if (res.includes(" - ")) {
              finalRestrictions.push(res.split(" - ")[0].trim());
            }
          });

          const combinedRegexStr = finalRestrictions.map(r =>
            `^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
          ).join('|');

          filter.$and.push({
            $or: [
              { custom_house: { $regex: combinedRegexStr, $options: "i" } },
              { port_of_loading: { $regex: combinedRegexStr, $options: "i" } }
            ]
          });
        }
      }
    }

    if (jobOwner) {
      filter.$and.push({
        job_owner: { $regex: jobOwner, $options: "i" },
      });
    }

    const isCompletedTab = status && status.toLowerCase() === "completed";
    const isAllTab = status && status.toLowerCase() === "all";

    // Separate General Jobs from Actual Jobs
    if (status && status.toLowerCase() === "general-jobs") {
      filter.$and.push({ isGeneralJob: true });
    } else if (!isCompletedTab && !isAllTab) {
      filter.$and.push({ isGeneralJob: { $ne: true } });
    }

    // Exclude Freight Forwarding jobs (FF) from Export module
    if (!isCompletedTab && !isAllTab) {
      filter.$and.push({ job_no: { $not: /^FF/i } });
    }



    // Status filtering logic with job tracking consideration
    // Job is considered "completed" if:
    // 1. Explicit status is "completed", OR
    // 2. jobTracking is enabled (regardless of milestone status)
    if (status && status.toLowerCase() !== "all" && status.toLowerCase() !== "general-jobs") {
      const statusLower = status.toLowerCase();

      if (statusLower === "pending") {
        // Pending: Status is strictly pending
        filter.$and.push({
          $and: [
            { status: { $regex: "^pending$", $options: "i" } },
            { detailedStatus: { $ne: "Billing Done" } },
            { isJobCanceled: { $ne: true } },
          ],
        });
      } else if (statusLower === "completed") {
        // Completed: Explicit status is completed OR final milestone reached
        filter.$and.push({
          $and: [
            // Exclude Cancelled
            {
              $and: [
                { status: { $regex: "^(?!cancelled$).*", $options: "i" } },
                { isJobCanceled: { $ne: true } },
              ],
            },
            // Include if tracking done OR completed status
            {
              $or: [
                { status: { $regex: "^completed$", $options: "i" } },
                { detailedStatus: "Billing Done" },
              ],
            },
          ],
        });
      } else if (statusLower === "cancelled") {
        filter.$and.push({
          $or: [
            { status: { $regex: "^cancelled$", $options: "i" } },
            { isJobCanceled: true },
          ],
        });
      } else if (statusLower === "booking pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
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
      } else if (statusLower === "handover pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
          ],
          "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
          $or: [
            { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      } else if (statusLower === "prepare for billing") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
          ]
        });
        filter.$and.push({
          $or: [
            // FCL jobs completed ONLY if LEO, Handover, Rail Out, and Rail Reached dates are all set
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
            // Air/LCL jobs completed ONLY if LEO and Handover dates are set
            {
              $and: [
                {
                  $or: [
                    { consignmentType: "LCL" },
                    { job_no: { $regex: "/AIR/", $options: "i" } }
                  ]
                },
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
            { send_for_billing: false },
          ]
        });
      } else if (statusLower === "sent for billing") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
          ]
        });
        filter.$and.push({
          send_for_billing: true
        });
      } else if (statusLower === "club-jobs") {
        filter.$and.push({
          $or: [
            { is_club_job_parent: true },
            { parent_club_job: { $exists: true, $ne: null, $ne: "" } }
          ]
        });
        filter.$and.push({
          $or: [
            { status: { $regex: "^pending$", $options: "i" } },
            { status: { $exists: false } },
            { status: null },
            { status: "" },
          ]
        });
        filter.$and.push({ detailedStatus: { $ne: "Billing Done" } });
        filter.$and.push({ isJobCanceled: { $ne: true } });
      } else {
        filter.$and.push({
          status: { $regex: `^${status}$`, $options: "i" },
        });
      }
    } else if (status && status.toLowerCase() === "all") {
      filter.$and.push({
        status: { $regex: "^(?!cancelled$).*", $options: "i" },
        isJobCanceled: { $ne: true }
      });
    }

    // Search filter
    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
          { port_of_loading: { $regex: escapedSearch, $options: "i" } },
          { destination_port: { $regex: escapedSearch, $options: "i" } }
        ],
      });
    }



    // Additional filters
    if (exporter && exporter.toLowerCase() !== "all") {
      filter.$and.push({
        exporter: { $regex: escapeRegex(exporter), $options: "i" },
      });
    }

    if (country) {
      filter.$and.push({
        destination_country: { $regex: escapeRegex(country), $options: "i" },
      });
    }

    if (consignmentType) {
      filter.$and.push({
        consignmentType: consignmentType,
      });
    }
    if (branch) {
      filter.$and.push({
        branch_code: { $regex: `^${escapeRegex(branch)}$`, $options: "i" },
      });
    }

    // Year filter - matches exact string "YY-YY" format (e.g. "25-26")
    if (year && year !== "all") {
      filter.$and.push({ year: year });
    }

    if (startDate || endDate) {
      const getEffDateExpr = () => ({
        $cond: {
          if: {
            $and: [
              { $ne: ["$job_date", null] },
              { $ne: ["$job_date", ""] },
              { $regexMatch: { input: { $ifNull: ["$job_date", ""] }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } }
            ]
          },
          then: {
            $dateFromString: {
              dateString: "$job_date",
              format: "%d-%m-%Y",
              onError: "$createdAt"
            }
          },
          else: "$createdAt"
        }
      });

      filter.$and.push({
        $expr: {
          $let: {
            vars: {
              effDate: getEffDateExpr()
            },
            in: {
              $and: [
                ...(startDate ? [{ $gte: ["$$effDate", new Date(startDate + "T00:00:00.000Z")] }] : []),
                ...(endDate ? [{ $lte: ["$$effDate", new Date(endDate + "T23:59:59.999Z")] }] : [])
              ]
            }
          }
        }
      });
    }

    if (month) {
      if (month === "today") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        filter.$and.push({ createdAt: { $gte: start, $lte: end } });
      } else if (month === "yesterday") {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        filter.$and.push({ createdAt: { $gte: start, $lte: end } });
      } else if (month === "weekly") {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        filter.$and.push({ createdAt: { $gte: start, $lte: end } });
      } else if (!isNaN(month)) {
        filter.$and.push({
          $expr: {
            $let: {
              vars: {
                effDate: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$job_date", null] },
                        { $ne: ["$job_date", ""] },
                        { $regexMatch: { input: { $ifNull: ["$job_date", ""] }, regex: "^\\d{2}-\\d{2}-\\d{4}" } }
                      ]
                    },
                    then: {
                      $dateFromString: {
                        dateString: "$job_date",
                        format: "%d-%m-%Y",
                        onError: "$createdAt"
                      }
                    },
                    else: "$createdAt"
                  }
                }
              },
              in: {
                $eq: [{ $month: "$$effDate" }, parseInt(month)]
              }
            }
          }
        });
      }
    }

    if (req.query.customHouse) {
      filter.$and.push({
        custom_house: { $regex: req.query.customHouse, $options: "i" },
      });
    }

    const statusArrayInput = parseDetailedStatusParam(req.query);
    if (statusArrayInput.length > 0) {
      let statusArray = [...statusArrayInput];
      if (statusArray.includes("Rail Out")) {
        statusArray = [...statusArray, "Road Out", "Road out", "road out", "RAIL OUT", "ROAD OUT"];
      }

      // Handle "Send for Billing" as a virtual status
      const hasSendForBilling = statusArray.includes("Send for Billing");
      const filteredStatusArray = statusArray.filter(s => s !== "Send for Billing");

      const orConditions = [];

      if (filteredStatusArray.length > 0) {
        if (filteredStatusArray.includes("Pending")) {
          orConditions.push(
            { detailedStatus: { $in: filteredStatusArray } },
            { detailedStatus: { $in: [null, "", "Pending"] } },
            { detailedStatus: { $exists: false } }
          );
        } else {
          orConditions.push({ detailedStatus: { $in: filteredStatusArray } });
        }
      }

      if (hasSendForBilling) {
        orConditions.push({
          send_for_billing: true,
          send_for_billing_date: { $exists: true, $nin: [null, ""] }
        });
      }

      if (orConditions.length > 0) {
        filter.$and.push({ $or: orConditions });
      }

      if (!hasSendForBilling && filteredStatusArray.length > 0 && !filteredStatusArray.includes("Pending")) {
        filter.$and.push({
          $or: [
            { send_for_billing: { $ne: true } },
            { send_for_billing_date: { $exists: false } },
            { send_for_billing_date: { $in: [null, ""] } }
          ]
        });
      }
    }

    if (req.query.goods_stuffed_at) {
      filter.$and.push({
        goods_stuffed_at: req.query.goods_stuffed_at,
      });
    }

    const currentModule = req.query.currentModule || "export-dsr";

    // Find all job numbers matching the current tab and filters (excluding pendingQueries filter)
    const matchingJobsForCount = await ExportJobModel.find(filter).select("job_no").lean();
    const allJobNos = matchingJobsForCount.map(j => j.job_no).filter(Boolean);

    const QueryModel = (await import("../../model/export/QueryModel.mjs")).default;
    const jobsWithOpenQueries = await QueryModel.find({
      job_no: { $in: allJobNos },
      status: "open",
      targetModule: currentModule
    }).distinct("job_no");

    const pendingQueriesCount = jobsWithOpenQueries.length;

    // Apply pendingQueries filter if active
    if (pendingQueries === "true" || pendingQueries === true) {
      if (!filter.$and) filter.$and = [];
      filter.$and.push({ job_no: { $in: jobsWithOpenQueries } });
    }

    // Remove empty $and array if no conditions were added
    if (filter.$and && filter.$and.length === 0) {
      delete filter.$and;
    }

    const skip = (page - 1) * limit;

    // Sorting logic
    const { sortKey, sortOrder } = req.query;
    const sort = {};
    if (sortKey && sortKey !== "null" && sortKey !== "undefined" && sortKey !== "") {
      sort[sortKey] = sortOrder === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1; // Default sort
    }


    // Selected fields to reduce payload size for the frontend table
    const selectProjection = {
      forwarder: 1,
      job_no: 1,
      docClicks: 1,
      custom_house: 1,
      job_date: 1,
      consignmentType: 1,
      job_owner: 1,
      send_for_billing: 1,
      send_for_billing_date: 1,
      operational_lock: 1,
      exporter: 1,
      exporter_ref_no: 1,
      exporter_branch_name: 1,
      "consignees.consignee_name": 1,
      buyerThirdPartyInfo: 1,
      forwarder: 1,
      drawback_scroll_no: 1,
      drawback_scroll_date: 1,
      rosctl_scroll_no: 1,
      rosctl_scroll_date: 1,
      ieCode: 1,
      panNo: 1,
      gstin: 1,
      adCode: 1,
      egm_no: 1,
      egm_date: 1,
      "invoices.invoiceNumber": 1,
      "invoices.invoiceDate": 1,
      "invoices.termsOfInvoice": 1,
      "invoices.currency": 1,
      "invoices.invoiceValue": 1,
      "invoices.consigneeName": 1,
      "invoices.invoice_no": 1,
      "invoices.invoice_date": 1,
      "invoices.invValue": 1,
      "invoices.products.drawbackDetails": 1,
      sb_no: 1,
      goods_stuffed_at: 1,
      sb_date: 1,
      destination_port: 1,
      destination_country: 1,
      port_of_discharge: 1,
      discharge_country: 1,
      total_no_of_pkgs: 1,
      package_unit: 1,
      gross_weight_kg: 1,
      net_weight_kg: 1,
      shipping_line_airline: 1,
      detailedStatus: 1,
      status: 1,
      otherInfo: 1,
      annexC1Details: 1,
      booking_copy: 1,
      booking_no: 1,
      booking_date: 1,
      "containers": 1,
      statusDetails: 1,
      "eSanchitDocuments.fileUrl": 1,
      "eSanchitDocuments.documentType": 1,
      "eSanchitDocuments.icegateFilename": 1,
      total_ar_amount: 1,
      outstanding_balance: 1,
      cha: 1,
      isLocked: 1,
      sb_or_seal_changed_notif: 1,
      sb_or_seal_changed_details: 1,
      vgm_done: 1,
      vgm_date: 1,
      form13_done: 1,
      form13_date: 1,
      shipping_bill_done: 1,
      shipping_bill_done_date: 1,
      freight_done: 1,
      freight_enquiry_id: 1,
      branch_code: 1,
      transportMode: 1,
      movement_type: 1,
      port_of_loading: 1,
      isGeneralJob: 1,
      "operations.statusDetails.containerPlacementDate": 1,
      "operations.statusDetails.handoverForwardingNoteDate": 1,
      "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": 1,
      "operations.statusDetails.railOutReachedDate": 1,
      "operations.statusDetails.leoDate": 1,
      "operations.statusDetails.railRoad": 1,
      "operations.statusDetails.leoUpload": 1,
      "operations.statusDetails.booking_copy": 1,
      "operations.statusDetails.forwardingNoteDocUpload": 1,
      "operations.statusDetails.manualVgmUpload": 1,
      "operations.statusDetails.odexVgmUpload": 1,
      "operations.statusDetails.odexEsbUpload": 1,
      "operations.statusDetails.odexForm13Upload": 1,
      "operations.statusDetails.cmaForwardingNoteUpload": 1,
      "operations.statusDetails.otherDocUpload": 1,
      "operations.statusDetails.otherDocsCustom": 1,
      "operations.statusDetails.stuffingSheetUpload": 1,
      "operations.statusDetails.stuffingPhotoUpload": 1,
      "operations.statusDetails.eGatePassUpload": 1,
      "operations.statusDetails.clpUpload": 1,
      "operations.statusDetails.completionCopyUpload": 1,
      "operations.statusDetails.movementCopyUpload": 1,
      "operations.statusDetails.shippingInstructionsUpload": 1,
      "operations.statusDetails.form13CopyUpload": 1,
      "operations.statusDetails.assessmentCopy": 1,
      "operations.statusDetails.handoverImageUpload": 1,
      "operations.statusDetails.billingDocsSentUpload": 1,
      "operations.statusDetails.billingDocsSentDt": 1,
      "operations.statusDetails.billing_details": 1,
      "operations.statusDetails.status": 1,
      "operations.transporterDetails": 1,
      lockedBy: 1,
      lockedAt: 1,
      is_club_job_parent: 1,
      parent_club_job: 1
    };

    // When search is active, use aggregation to prioritize results by match type
    // Priority: 1=job_no, 2=sb_no, 3=container, 4=invoice, 5=exporter/other
    let finalJobs = [];
    let finalTotalCount = 0;

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const aggPipeline = [
        { $match: filter },
        {
          $addFields: {
            hasOpenClientQuery: { $in: ["$job_no", openClientQueryJobs] },
            _searchPriority: {
              $switch: {
                branches: [
                  { case: { $regexMatch: { input: { $ifNull: ["$job_no", ""] }, regex: escapedSearch, options: "i" } }, then: 1 },
                  { case: { $regexMatch: { input: { $ifNull: ["$sb_no", ""] }, regex: escapedSearch, options: "i" } }, then: 2 },
                  { case: { $gt: [{ $size: { $filter: { input: { $ifNull: ["$containers", []] }, as: "c", cond: { $regexMatch: { input: { $ifNull: ["$$c.containerNo", ""] }, regex: escapedSearch, options: "i" } } } } }, 0] }, then: 3 },
                  { case: { $gt: [{ $size: { $filter: { input: { $ifNull: ["$invoices", []] }, as: "inv", cond: { $regexMatch: { input: { $ifNull: ["$$inv.invoiceNumber", ""] }, regex: escapedSearch, options: "i" } } } } }, 0] }, then: 4 },
                ],
                default: 5
              }
            }
          }
        },
        { $sort: { _searchPriority: 1, ...sort } },
        { $project: selectProjection },
      ];
      finalTotalCount = await ExportJobModel.countDocuments(filter);
      finalJobs = await ExportJobModel.aggregate([
        ...aggPipeline,
        { $skip: skip },
        { $limit: parseInt(limit) },
      ]);
    } else {
      const aggPipeline = [
        { $match: filter },
        {
          $addFields: {
            hasOpenClientQuery: { $in: ["$job_no", openClientQueryJobs] }
          }
        },
        { $sort: { ...sort } },
        { $project: selectProjection }
      ];
      const [jobs, totalCount] = await Promise.all([
        ExportJobModel.aggregate([
          ...aggPipeline,
          { $skip: skip },
          { $limit: parseInt(limit) }
        ]),
        ExportJobModel.countDocuments(filter),
      ]);
      finalJobs = jobs;
      finalTotalCount = totalCount;
    }

    if (finalJobs.length > 0) {
      const parentIds = [...new Set(finalJobs.map(j => j.is_club_job_parent ? j.job_no : j.parent_club_job))].filter(Boolean);
      if (parentIds.length > 0) {
        const families = await ExportJobModel.find({
          $or: [{ job_no: { $in: parentIds } }, { parent_club_job: { $in: parentIds } }]
        }).select(selectProjection).lean();

        const groups = {};
        families.forEach(j => {
          const pid = j.is_club_job_parent ? j.job_no : j.parent_club_job;
          if (!groups[pid]) groups[pid] = { parent: null, children: [] };
          if (j.is_club_job_parent) groups[pid].parent = j;
          else groups[pid].children.push(j);
        });

        if (String(status || "").toLowerCase() === "club-jobs") {
          const finalParents = [];
          Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(pid => {
            if (groups[pid].parent) {
              groups[pid].parent.subRows = groups[pid].children.sort((a, b) => String(a.job_no || "").localeCompare(String(b.job_no || "")));
              finalParents.push(groups[pid].parent);
            }
          });
          finalJobs = finalParents;
          finalTotalCount = finalParents.length;
        } else {
          const newJobs = [];
          const processedParents = new Set();
          finalJobs.forEach(job => {
            const pid = job.is_club_job_parent ? job.job_no : job.parent_club_job;
            if (pid) {
              if (!processedParents.has(pid)) {
                const parentGroup = groups[pid];
                if (parentGroup && parentGroup.parent) {
                  const parentJob = { ...parentGroup.parent };
                  parentJob.subRows = parentGroup.children.sort((a, b) => String(a.job_no || "").localeCompare(String(b.job_no || "")));
                  newJobs.push(parentJob);
                } else {
                  newJobs.push(job);
                }
                processedParents.add(pid);
              }
            } else {
              newJobs.push(job);
            }
          });
          finalJobs = newJobs;
        }
      }
    }

    res.json({
      success: true,
      data: {
        jobs: finalJobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(finalTotalCount / parseInt(limit)),
          totalCount: finalTotalCount,
          hasNextPage: page < Math.ceil(finalTotalCount / parseInt(limit)),
          hasPrevPage: page > 1,
        },
        pendingQueriesCount,
      },
    });
  } catch (error) {
    console.error("Error fetching export jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching export jobs",
      error: error.message,
    });
  }
});

// GET /api/filtered-exporters - Get unique list of exporters matching current filters
router.get("/filtered-exporters", async (req, res) => {
  try {
    const {
      search = "",
      consignmentType = "",
      branch = "",
      status = "all",
      year = "",
      detailedStatus = "",
      jobOwner = "",
      month = "",
      customHouse = "",
      goods_stuffed_at = "",
    } = req.query;

    const filter = {};
    if (!filter.$and) filter.$and = [];

    // 1. Fetch user restrictions
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin") {
        let branchRestrictions = requester.selected_branches || [];
        const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
        branchRestrictions = branchRestrictions.map(b => BRANCH_MAP[b.toUpperCase()] || b);

        if (branchRestrictions.length > 0) {
          const branchRegexStr = branchRestrictions.map(r => String(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
          const fallbackRegex = `^(${branchRegexStr})(/|$)`;
          filter.$and.push({
            $or: [
              { branch_code: { $in: branchRestrictions } },
              {
                $and: [
                  { $or: [{ branch_code: "" }, { branch_code: null }, { branch_code: { $exists: false } }] },
                  { job_no: { $regex: fallbackRegex, $options: "i" } }
                ]
              }
            ]
          });
        } else {
          filter.$and.push({ branch_code: { $in: [] } });
        }

        const portRestrictions = requester.selected_ports || [];
        const icdRestrictions = requester.selected_icd_codes || [];
        const combinedRestrictions = [...new Set([...portRestrictions, ...icdRestrictions])];

        if (combinedRestrictions.length > 0) {
          const finalRestrictions = [];
          combinedRestrictions.forEach(res => {
            finalRestrictions.push(res);
            if (res.includes(" - ")) {
              finalRestrictions.push(res.split(" - ")[0].trim());
            }
          });

          const combinedRegexStr = finalRestrictions.map(r =>
            `^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
          ).join('|');

          filter.$and.push({
            $or: [
              { custom_house: { $regex: combinedRegexStr, $options: "i" } },
              { port_of_loading: { $regex: combinedRegexStr, $options: "i" } }
            ]
          });
        }
      }
    }

    if (jobOwner) filter.$and.push({ job_owner: { $regex: jobOwner, $options: "i" } });

    // 2. Status filtering logic (mirrors /exports)
    if (status && status.toLowerCase() !== "all") {
      const statusLower = status.toLowerCase();
      if (statusLower === "pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
            { isJobCanceled: { $ne: true } },
          ],
        });
      } else if (statusLower === "completed") {
        filter.$and.push({
          $and: [
            { status: { $regex: "^(?!cancelled$).*", $options: "i" } },
            { isJobCanceled: { $ne: true } },
            {
              $or: [
                { status: { $regex: "^completed$", $options: "i" } },
                { detailedStatus: "Billing Done" },
              ],
            },
          ],
        });
      } else if (statusLower === "cancelled") {
        filter.$and.push({
          $or: [
            { status: { $regex: "^cancelled$", $options: "i" } },
            { isJobCanceled: true },
          ],
        });
      } else if (statusLower === "booking pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
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
      } else if (statusLower === "handover pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
          ],
          "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
          $or: [
            { "operations.statusDetails.handoverForwardingNoteDate": { $exists: false } },
            { "operations.statusDetails.handoverForwardingNoteDate": null },
            { "operations.statusDetails.handoverForwardingNoteDate": "" },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      } else if (statusLower === "billing pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
          ],
          "operations.statusDetails.handoverForwardingNoteDate": { $type: "string", $ne: "" },
          $or: [
            { "operations.statusDetails.billingDocsSentDt": { $exists: false } },
            { "operations.statusDetails.billingDocsSentDt": null },
            { "operations.statusDetails.billingDocsSentDt": "" },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      } else {
        filter.$and.push({
          status: { $regex: `^${status}$`, $options: "i" },
        });
      }
    }

    // 3. Search filter
    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and.push({
        $or: [
          { job_no: { $regex: escapedSearch, $options: "i" } },
          { exporter: { $regex: escapedSearch, $options: "i" } },
          { "consignees.consignee_name": { $regex: escapedSearch, $options: "i" } },
          { sb_no: { $regex: escapedSearch, $options: "i" } },
          { "invoices.invoiceNumber": { $regex: escapedSearch, $options: "i" } },
          { "containers.containerNo": { $regex: escapedSearch, $options: "i" } },
          { port_of_discharge: { $regex: escapedSearch, $options: "i" } },
          { port_of_loading: { $regex: escapedSearch, $options: "i" } },
          { destination_port: { $regex: escapedSearch, $options: "i" } }
        ],
      });
    }

    // 4. Other fields
    if (consignmentType) filter.$and.push({ consignmentType: consignmentType });
    if (branch) filter.$and.push({ branch_code: { $regex: `^${branch}$`, $options: "i" } });
    if (year && year !== "all") filter.$and.push({ year: year });
    const statusArrayInput = parseDetailedStatusParam(req.query);
    if (statusArrayInput.length > 0) {
      let statusArray = [...statusArrayInput];
      if (statusArray.includes("Rail Out")) {
        statusArray = [...statusArray, "Road Out", "Road out", "road out", "RAIL OUT", "ROAD OUT"];
      }

      // Handle "Send for Billing" as a virtual status
      const hasSendForBilling = statusArray.includes("Send for Billing");
      const filteredStatusArray = statusArray.filter(s => s !== "Send for Billing");

      const orConditions = [];

      if (filteredStatusArray.length > 0) {
        if (filteredStatusArray.includes("Pending")) {
          orConditions.push(
            { detailedStatus: { $in: filteredStatusArray } },
            { detailedStatus: { $in: [null, "", "Pending"] } },
            { detailedStatus: { $exists: false } }
          );
        } else {
          orConditions.push({ detailedStatus: { $in: filteredStatusArray } });
        }
      }

      if (hasSendForBilling) {
        orConditions.push({
          send_for_billing: true,
          send_for_billing_date: { $exists: true, $nin: [null, ""] }
        });
      }

      if (orConditions.length > 0) {
        filter.$and.push({ $or: orConditions });
      }

      if (!hasSendForBilling && filteredStatusArray.length > 0 && !filteredStatusArray.includes("Pending")) {
        filter.$and.push({
          $or: [
            { send_for_billing: { $ne: true } },
            { send_for_billing_date: { $exists: false } },
            { send_for_billing_date: { $in: [null, ""] } }
          ]
        });
      }
    }
    if (customHouse) filter.$and.push({ custom_house: { $regex: customHouse, $options: "i" } });
    if (goods_stuffed_at) filter.$and.push({ goods_stuffed_at: goods_stuffed_at });

    if (month) {
      // Month logic same as /exports
      if (month === "today") {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        filter.$and.push({ createdAt: { $gte: start, $lte: end } });
      } else if (month === "yesterday") {
        const start = new Date(); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
        filter.$and.push({ createdAt: { $gte: start, $lte: end } });
      } else if (month === "weekly") {
        const start = new Date(); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        filter.$and.push({ createdAt: { $gte: start, $lte: end } });
      } else if (!isNaN(month)) {
        filter.$and.push({
          $expr: {
            $let: {
              vars: {
                effDate: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$job_date", null] },
                        { $ne: ["$job_date", ""] },
                        { $regexMatch: { input: { $ifNull: ["$job_date", ""] }, regex: "^\\d{2}-\\d{2}-\\d{4}" } }
                      ]
                    },
                    then: { $dateFromString: { dateString: "$job_date", format: "%d-%m-%Y", onError: "$createdAt" } },
                    else: "$createdAt"
                  }
                }
              },
              in: { $eq: [{ $month: "$$effDate" }, parseInt(month)] }
            }
          }
        });
      }
    }

    if (filter.$and && filter.$and.length === 0) delete filter.$and;

    const uniqueExporters = await ExportJobModel.distinct("exporter", filter);
    res.json({ success: true, data: uniqueExporters.filter(Boolean).sort() });
  } catch (error) {
    console.error("Error fetching filtered exporters:", error);
    res.status(500).json({ success: false, message: "Error fetching filtered exporters" });
  }
});

// POST /api/exports - Create new export job
router.post("/exports", auditMiddleware("Job"), async (req, res) => {
  try {
    const jobData = ExportJobModel.isImpexCubeExportPayload(req.body)
      ? ExportJobModel.fromImpexCubeExportPayload(req.body)
      : req.body;
    const newJob = new ExportJobModel(jobData);
    const savedJob = await newJob.save();
    res.status(201).json({ success: true, data: savedJob });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating job",
      error: error.message,
    });
  }
});

// Helper methods for ImpexCube response classification (aligned with uploadExportToImexcube.mjs)
const normalizeVendorStatusCode = (payload, fallbackStatus = null) => {
  const fromPayload = Number(payload?.statusCode);
  if (Number.isFinite(fromPayload) && fromPayload > 0) return fromPayload;
  const fromNested = Number(payload?.data?.[0]?.Code || payload?.data?.[0]?.code);
  if (Number.isFinite(fromNested) && fromNested > 0) return fromNested;
  return fallbackStatus;
};

const classifyImexcubeAction = (payload, fallbackStatus = null) => {
  const statusCode = normalizeVendorStatusCode(payload, fallbackStatus);
  const text = [
    payload?.message,
    payload?.Message,
    payload?.data?.[0]?.Message,
    payload?.data?.[0]?.ErrorMsg,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("updated")) return "updated";
  if (statusCode === 409 || text.includes("already exists") || text.includes("duplicate")) {
    return "duplicate";
  }
  return "created";
};

const getVendorMessage = (payload, fallback = "") => {
  return (
    payload?.data?.[0]?.Message ||
    payload?.data?.[0]?.ErrorMsg ||
    payload?.Message ||
    payload?.message ||
    (Array.isArray(payload?.Errors) && payload.Errors.length > 0 ? payload.Errors.join(", ") : "") ||
    fallback
  );
};

// POST /api/impexcube/export-jobs/send - Send an export job to ImpexCube
router.post("/impexcube/export-jobs/send", auditMiddleware("Job"), async (req, res) => {
  try {
    const jobNo = req.body?.job_no || req.body?.jobNo;
    if (!jobNo) {
      return res.status(400).json({
        success: false,
        message: "job_no is required",
      });
    }

    const exportJob = await ExJobModel.findOne({
      job_no: { $regex: `^${String(jobNo).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (!exportJob) {
      return res.status(404).json({
        success: false,
        message: "Export job not found",
      });
    }

    const payload = exportJob.toImpexCubeExportPayload(req.body?.options || {});
    const accessToken = await getImpexCubeAccessToken(payload.CHADetails?.Financial_Year, exportJob.branch_code);
    console.log("[IMEXCUBE EXPORT DSR] Sending payload to ImpexCube:\n", JSON.stringify(payload, null, 2));
    const impexCubeResponse = await axios.post(
      buildImpexCubeUrl(IMPEXCUBE_EXPORT_CREATE_PATH),
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: IMPEXCUBE_TIMEOUT_MS,
      },
    );

    const vendorPayload = impexCubeResponse.data || {};
    const action = classifyImexcubeAction(vendorPayload, impexCubeResponse.status);
    const vendorStatusCode = normalizeVendorStatusCode(vendorPayload, impexCubeResponse.status);
    const vendorMessage = getVendorMessage(vendorPayload, "Job created successfully");

    const queryFilter = { _id: exportJob._id };

    if (action === "duplicate") {
      await ExJobModel.updateOne(
        queryFilter,
        {
          $set: {
            imexcube_last_action: "duplicate",
            imexcube_last_status_code: vendorStatusCode,
            imexcube_last_message: vendorMessage,
            imexcube_response: vendorPayload,
          },
        }
      );

      return res.status(409).json({
        success: false,
        message: vendorMessage || "Duplicate Job in IMEXCUBE",
        data: vendorPayload,
        statusCode: 409,
      });
    }

    // Mark the job as uploaded in our DB
    await ExJobModel.updateOne(
      queryFilter,
      {
        $set: {
          imexcube_uploaded: true,
          imexcube_uploaded_at: new Date(),
          imexcube_response: vendorPayload,
          imexcube_last_action: action,
          imexcube_last_status_code: vendorStatusCode,
          imexcube_last_message: vendorMessage,
        },
      }
    );

    return res.status(impexCubeResponse.status || 200).json({
      success: true,
      message: action === "updated" ? "Job updated in IMEXCUBE (TEST) successfully" : "Job created in IMEXCUBE (TEST) successfully",
      data: vendorPayload,
      job_no: exportJob.job_no,
    });
  } catch (error) {
    const jobNo = req.body?.job_no || req.body?.jobNo;
    const queryFilter = {
      $or: [
        { job_no: jobNo },
        { jobNumber: jobNo }
      ]
    };

    // Identify if this is a connection/network timeout error
    let isNetworkError = false;
    let userFriendlyMessage = "";

    if (!error.response) {
      isNetworkError = true;
      if (error.code === "ECONNRESET") {
        userFriendlyMessage = "ImpexCube API connection was reset by the remote server (ECONNRESET). The API may be offline or unreachable.";
      } else if (error.code === "ETIMEDOUT" || error.message?.toLowerCase().includes("timeout")) {
        userFriendlyMessage = "ImpexCube API connection timed out. The server is currently offline or unreachable.";
      } else if (error.code === "ENOTFOUND" || error.code === "EAI_AGAIN") {
        userFriendlyMessage = "ImpexCube API domain name could not be resolved. Please check your internet connection or URL configuration.";
      } else {
        userFriendlyMessage = `ImpexCube API is unreachable. Network error: ${error.message || "Connection failed"}`;
      }
    }

    const status = isNetworkError ? 503 : (error.response?.status || error.statusCode || 500);
    const impexCubeData = error.response?.data || error.impexCubeResponse;
    const vendorMessage = isNetworkError ? userFriendlyMessage : getVendorMessage(impexCubeData, error.message || "Failed to send export job to ImpexCube");

    console.error("Error sending export job to ImpexCube:", impexCubeData || error.message);

    if (!isNetworkError && jobNo) {
      const action = classifyImexcubeAction(impexCubeData, status);
      const vendorStatusCode = normalizeVendorStatusCode(impexCubeData, status);

      if (action === "updated") {
        await ExJobModel.updateOne(
          queryFilter,
          {
            $set: {
              imexcube_uploaded: true,
              imexcube_uploaded_at: new Date(),
              imexcube_response: impexCubeData,
              imexcube_last_action: "updated",
              imexcube_last_status_code: vendorStatusCode,
              imexcube_last_message: vendorMessage,
            },
          }
        );

        return res.status(200).json({
          success: true,
          message: "Job updated in IMEXCUBE (TEST) successfully",
          data: impexCubeData,
          job_no: jobNo,
        });
      }

      if (action === "duplicate") {
        await ExJobModel.updateOne(
          queryFilter,
          {
            $set: {
              imexcube_last_action: "duplicate",
              imexcube_last_status_code: vendorStatusCode,
              imexcube_last_message: vendorMessage,
              imexcube_response: impexCubeData,
            },
          }
        );

        return res.status(409).json({
          success: false,
          message: vendorMessage,
          data: impexCubeData,
          statusCode: 409,
        });
      }
    }

    return res.status(status).json({
      success: false,
      message: vendorMessage,
      data: impexCubeData || null,
      errors: impexCubeData?.errors || null,
      statusCode: status,
    });
  }
});

// POST /api/impexcube/export-jobs/fetch - Fetch export job details from ImpexCube
router.post("/impexcube/export-jobs/fetch", auditMiddleware("Job"), async (req, res) => {
  try {
    const jobNo = req.body?.job_no || req.body?.jobNo;
    if (!jobNo) {
      return res.status(400).json({
        success: false,
        message: "job_no is required",
      });
    }

    const exportJob = await ExJobModel.findOne({
      job_no: { $regex: `^${String(jobNo).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (!exportJob) {
      return res.status(404).json({
        success: false,
        message: "Export job not found",
      });
    }

    const accessToken = await getImpexCubeAccessToken(exportJob.financial_year || exportJob.year, exportJob.branch_code);

    const seqNo = exportJob.job_sequence_no || (jobNo.match(/\d+/g) ? jobNo.match(/\d+/g).pop() : "");
    const fullFyearNo = jobNo.replace(/(\d{2})-(\d{2})$/, (m, y1, y2) => `20${y1}-20${y2}`);
    const candidateJobNos = [
      jobNo,
      fullFyearNo,
      seqNo,
      seqNo ? String(seqNo).padStart(5, "0") : null,
    ].filter(Boolean);
    const uniqueCandidates = [...new Set(candidateJobNos)];

    console.log("[IMEXCUBE EXPORT DSR] Fetching details from ImpexCube with candidate job nos:", uniqueCandidates);

    const candidatePaths = [
      IMPEXCUBE_EXPORT_GET_DETAILS_PATH,
      "/api/v1/GetJobDetails/get-expdetails",
      "/api/v1/GetJobDetails/getexpdetails",
    ].filter(Boolean);
    const uniquePaths = [...new Set(candidatePaths)];

    let impexCubeResponse = null;
    let vendorPayload = null;
    const reqHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      accept: "*/*",
    };

    pathLoop: for (const path of uniquePaths) {
      const targetUrl = buildImpexCubeUrl(path);
      for (const candNo of uniqueCandidates) {
        const payload = {
          Method: "GetJobInfo",
          User_Job_No: candNo,
        };

        try {
          console.log(`[IMEXCUBE EXPORT DSR] Trying fetch for candNo '${candNo}' on URL: ${targetUrl}`);

          let res = null;
          // 1. Try GET method with JSON body payload (as per ImpexCube vendor specification)
          try {
            res = await axios({
              method: "GET",
              url: targetUrl,
              headers: reqHeaders,
              data: payload,
              timeout: IMPEXCUBE_TIMEOUT_MS,
            });
          } catch (getErr) {
            // 2. Try GET method with query parameters fallback
            try {
              res = await axios.get(targetUrl, {
                params: {
                  Method: "GetJobInfo",
                  "User Job No.": candNo,
                  User_Job_No: candNo,
                },
                headers: reqHeaders,
                timeout: IMPEXCUBE_TIMEOUT_MS,
              });
            } catch (queryErr) {
              // 3. Try POST method fallback
              res = await axios.post(targetUrl, payload, {
                headers: reqHeaders,
                timeout: IMPEXCUBE_TIMEOUT_MS,
              });
            }
          }

          const vData = res.data || {};
          const hasData = vData.data || vData.SB_Details || (Array.isArray(vData) && vData.length > 0);
          if (vData.success !== false && vData.statusCode !== 404 && hasData) {
            impexCubeResponse = res;
            vendorPayload = vData;
            console.log(`[IMEXCUBE EXPORT DSR] Fetch succeeded for User_Job_No '${candNo}' on ${targetUrl}`);
            break pathLoop;
          }

          if (!vendorPayload) {
            impexCubeResponse = res;
            vendorPayload = vData;
          }
        } catch (err) {
          console.log(`[IMEXCUBE EXPORT DSR] Candidate fetch error for '${candNo}' on ${targetUrl}:`, err.message);
          if (err.response?.data) {
            vendorPayload = err.response.data;
          }
        }
      }
    }

    const isSuccess = vendorPayload && vendorPayload.success !== false && (vendorPayload.data || vendorPayload.SB_Details);

    if (!isSuccess) {
      const vendorMsg =
        vendorPayload?.message ||
        vendorPayload?.data?.[0]?.Message ||
        vendorPayload?.data?.[0]?.ErrorMsg;

      const displayMsg = (vendorMsg && !vendorMsg.includes("status code 404"))
        ? vendorMsg
        : `Job details are not available in ImpexCube for job '${jobNo}'. Please ensure the job has been uploaded to ImpexCube first.`;

      return res.status(vendorPayload?.statusCode || 404).json({
        success: false,
        message: displayMsg,
        data: vendorPayload || null,
      });
    }

    const rawSb = vendorPayload?.data?.SB_Details || vendorPayload?.SB_Details;
    const sbDetails = Array.isArray(rawSb) ? (rawSb[0] || {}) : (rawSb || {});

    const updateFields = {
      imexcube_fetch_response: vendorPayload,
      imexcube_last_fetched_at: new Date(),
    };

    const newSbNo = sbDetails.SBNo || sbDetails.SB_No;
    if (newSbNo) {
      updateFields.sb_no = String(newSbNo).trim();
    }
    const newSbDate = sbDetails.SBDate || sbDetails.SB_Date;
    if (newSbDate) {
      updateFields.sb_date = String(newSbDate).split("T")[0];
    }
    const newCustomPort = sbDetails.CustomPort || sbDetails.Custom_house_Code;
    if (newCustomPort) {
      updateFields.custom_house = String(newCustomPort).trim();
    }

    await ExJobModel.updateOne({ _id: exportJob._id }, { $set: updateFields });

    return res.status(200).json({
      success: true,
      message: "Export job details fetched from ImpexCube successfully",
      data: vendorPayload,
      updatedFields: updateFields,
      job_no: exportJob.job_no,
    });
  } catch (error) {
    console.error("Error fetching export job from ImpexCube:", error?.response?.data || error.message);
    const status = error.response?.status || 500;
    const vendorData = error.response?.data || null;

    let userMsg = vendorData?.message || error.message || "Failed to fetch export job details from ImpexCube";
    if (status === 404) {
      userMsg = vendorData?.message || "Job details are not available in ImpexCube. Please ensure the job has been sent to ImpexCube first.";
    }

    return res.status(status).json({
      success: false,
      message: userMsg,
      data: vendorData,
    });
  }
});

// POST /api/create-general-job - Create a new general job
router.post("/create-general-job", auditMiddleware("Job"), async (req, res) => {
  try {
    const { year } = req.body;
    if (!year) return res.status(400).json({ success: false, message: "Year is required" });

    // Generate next job number using max sequence finding
    // Sequence: GEN/EXP/XXXX/YY-YY
    const jobs = await ExportJobModel.find({
      job_no: new RegExp(`^GEN/EXP/\\d+/${year}$`, 'i')
    }).select('job_no').lean();

    let maxNum = 0;
    jobs.forEach(job => {
      if (job && job.job_no) {
        const parts = job.job_no.split('/');
        const currentNum = parseInt(parts[2]);
        if (!isNaN(currentNum) && currentNum > maxNum) {
          maxNum = currentNum;
        }
      }
    });

    const nextNum = maxNum + 1;

    const job_no = `GEN/EXP/${String(nextNum).padStart(4, '0')}/${year}`;

    const requester = await UserModel.findOne({ username: req.headers["username"] || req.headers["x-username"] });
    let branch_code = "";
    if (requester && requester.selected_branches && requester.selected_branches.length > 0) {
      const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
      branch_code = BRANCH_MAP[requester.selected_branches[0].toUpperCase()] || requester.selected_branches[0];
    }

    const { exporter, exporter_address, gstin, panNo } = req.body;

    const newJobData = {
      job_no,
      jobNumber: job_no, // REQUIRED for unique index
      year,
      isGeneralJob: true,
      status: "Pending",
      exporter: exporter || "GENERAL JOB",
      exporter_address: exporter_address || "",
      gstin: gstin || "",
      panNo: panNo || "",
      branch_code: branch_code || "GEN",
      custom_house: "GEN",
      job_date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      createdBy: req.headers["username"] || "System",
    };

    const newJob = new ExportJobModel(newJobData);
    const savedJob = await newJob.save();
    res.status(201).json({ success: true, data: savedJob });
  } catch (error) {
    console.error("Error creating general job:", error);
    res.status(500).json({
      success: false,
      message: "Error creating general job",
      error: error.message,
    });
  }
});

// POST /api/sync-all-job-statuses - One-time sync to match detailed status for all jobs
router.post("/sync-all-job-statuses", async (req, res) => {
  try {
    const jobs = await ExportJobModel.find({});
    let count = 0;
    for (const job of jobs) {
      await job.save(); // Triggers the pre-save hook logic
      count++;
    }
    res.json({
      success: true,
      message: `Successfully synchronized ${count} jobs.`,
    });
  } catch (error) {
    console.error("Error syncing jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error synchronizing jobs",
      error: error.message,
    });
  }
});

router.get("/:job_no(.*)", async (req, res, next) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    // List of prefixes that are certainly NOT job numbers
    // Robust check for Export Job Number format (e.g., BRANCH/EXP/MODE/SEQ/YEAR)
    // This prevents the wildcard route from eating other API request paths.
    // We require slashes and the presence of "EXP" (case-insensitive) to be considered a job number.
    const isJobNumber =
      job_no &&
      typeof job_no === "string" &&
      job_no.includes("/") &&
      job_no.split("/").length >= 3;

    if (!isJobNumber || job_no.startsWith("get-export-job")) {
      return next();
    }

    const username = req.headers["username"]; // Identify who is requesting

    let exportJob = await ExJobModel.findOne({
      $or: [
        { job_no: { $regex: `^${job_no.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } },
        { jobNumber: { $regex: `^${job_no.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: "i" } }
      ]
    });

    // If job not found directly, check if an enquiry maps this job_no to an alternate success_no / enquiry_no
    if (!exportJob && String(job_no).startsWith("FF")) {
      const existingEnquiry = await FreightEnquiryModel.findOne({
        $or: [
          { enquiry_no: job_no },
          { success_no: job_no }
        ]
      });
      if (existingEnquiry) {
        const altJobNos = [existingEnquiry.enquiry_no, existingEnquiry.success_no].filter(Boolean);
        exportJob = await ExJobModel.findOne({
          $or: [
            { job_no: { $in: altJobNos } },
            { jobNumber: { $in: altJobNos } }
          ]
        });
      }
    }

    // JIT CREATION: If not found and it's a Freight Forwarding enquiry, create from FreightEnquiry
    if (!exportJob && job_no.startsWith("FF")) {
      const enquiry = await FreightEnquiryModel.findOne({
        $or: [
          { enquiry_no: job_no },
          { success_no: job_no }
        ]
      });
      if (enquiry) {
        const actualJobNo = enquiry.success_no || enquiry.enquiry_no;

        // Check again if a job record with actualJobNo already exists in ExJobModel
        exportJob = await ExJobModel.findOne({
          $or: [
            { job_no: actualJobNo },
            { jobNumber: actualJobNo }
          ]
        });

        if (!exportJob) {
          exportJob = new ExJobModel({
            job_no: actualJobNo,
            jobNumber: actualJobNo,
            year: String(new Date().getFullYear()).slice(-2) + "-" + String(new Date().getFullYear() + 1).slice(-2),
            job_date: enquiry.enquiry_date || new Date().toISOString().split("T")[0],
            exporter: enquiry.organization_name,
            shipper: enquiry.organization_name,
            consignmentType: enquiry.consignment_type,
            port_of_loading: enquiry.port_of_loading,
            port_of_discharge: enquiry.port_of_destination,
            isGeneralJob: true,
            status: "Pending",
            detailedStatus: "Created from Freight Enquiry",
            movement_type: enquiry.movement_type,
            gross_weight_kg: enquiry.gross_weight,
            gross_weight_unit: enquiry.gross_weight_unit,
            net_weight_kg: enquiry.net_weight,
            net_weight_unit: enquiry.net_weight_unit,
            chargeable_weight: enquiry.chargeable_weight,
            chargeable_weight_unit: enquiry.chargeable_weight_unit,
            volume_cbm: enquiry.volume_cbm,
            volume_unit: enquiry.volume_unit,
            total_no_of_pkgs: enquiry.no_packages,
            package_unit: enquiry.package_unit,
            volume_weight: enquiry.volume_weight,
          });
          try {
            await exportJob.save();
          } catch (saveErr) {
            if (saveErr.code === 11000) {
              console.warn(`[JIT] Duplicate key on save for ${actualJobNo}, retrieving existing job...`);
              exportJob = await ExJobModel.findOne({
                $or: [
                  { job_no: actualJobNo },
                  { jobNumber: actualJobNo },
                  { job_no: job_no },
                  { jobNumber: job_no }
                ]
              });
            } else {
              throw saveErr;
            }
          }
        }
      }
    } else if (exportJob && String(job_no).startsWith("FF")) {
      // JIT BACKFILL: If job exists but lacks the mapped enquiry fields (e.g. created before schema mapping updates), backfill them from enquiry
      const enquiry = await FreightEnquiryModel.findOne({
        $or: [
          { enquiry_no: job_no },
          { success_no: job_no },
          { source_job_no: job_no }
        ]
      });
      if (enquiry) {
        let changed = false;
        const fieldsToMap = {
          shipper: enquiry.organization_name,
          movement_type: enquiry.movement_type,
          gross_weight_kg: enquiry.gross_weight,
          gross_weight_unit: enquiry.gross_weight_unit,
          net_weight_kg: enquiry.net_weight,
          net_weight_unit: enquiry.net_weight_unit,
          chargeable_weight: enquiry.chargeable_weight,
          chargeable_weight_unit: enquiry.chargeable_weight_unit,
          volume_cbm: enquiry.volume_cbm,
          volume_unit: enquiry.volume_unit,
          total_no_of_pkgs: enquiry.no_packages,
          package_unit: enquiry.package_unit,
          volume_weight: enquiry.volume_weight,
        };

        for (const [key, val] of Object.entries(fieldsToMap)) {
          if (!exportJob[key] && val) {
            exportJob[key] = val;
            changed = true;
          }
        }

        if (changed) {
          console.log(`[JIT Backfill] Backfilling enquiry fields for existing job in updateExportJobs: ${job_no}`);
          await exportJob.save();
        }
      }
    }

    if (!exportJob) {
      return res.status(404).json({ message: "Export job not found" });
    }

    let jobData = exportJob.toObject();

    // Merge FreightEnquiry details if FF job
    if (job_no.startsWith("FF")) {
      const enquiry = await FreightEnquiryModel.findOne({
        $or: [
          { enquiry_no: job_no },
          { success_no: job_no },
          { source_job_no: job_no }
        ]
      }).lean();
      if (enquiry) {
        jobData.shipment_type = enquiry.shipment_type;
        jobData.container_size = enquiry.container_size;
        jobData.goods_stuffed = enquiry.goods_stuffed;
        jobData.contact_no = enquiry.contact_no;
        jobData.email = enquiry.email;
        jobData.is_manual_cbm = enquiry.is_manual_cbm;
        jobData.dimensions = enquiry.dimensions || [];
        jobData.bl_details = enquiry.bl_details || {};
        if (exportJob.hbl_no) {
          jobData.bl_details.shipment_ref_no = exportJob.hbl_no;
          jobData.hbl_no = exportJob.hbl_no;
        } else if (jobData.bl_details.shipment_ref_no) {
          jobData.hbl_no = jobData.bl_details.shipment_ref_no;
        }
        jobData.net_weight_kg = jobData.net_weight_kg || exportJob.net_weight_kg || enquiry.net_weight_kg || enquiry.net_weight || "";
        jobData.net_weight_unit = jobData.net_weight_unit || enquiry.net_weight_unit || "KG";
        if (jobData.net_weight_kg && (!jobData.bl_details.net_weight || jobData.bl_details.net_weight === "0.000 KGS" || jobData.bl_details.net_weight === "0.000")) {
          jobData.bl_details.net_weight = `${jobData.net_weight_kg} ${jobData.net_weight_unit || "KGS"}`;
        }
        jobData.remarks = enquiry.remarks || jobData.remarks;
        if (enquiry.containers && enquiry.containers.length > 0) {
          jobData.containers = enquiry.containers.map((c, i) => ({
            serialNumber: i + 1,
            containerNo: c.container_number || "",
            customSealNo: c.custom_seal || "",
            shippingLineSealNo: c.line_seal || ""
          }));
        }
      }
    }

    const excludeChildJobs = req.query.excludeChildJobs === "true";

    if (exportJob.is_club_job_parent && Array.isArray(exportJob.clubbed_jobs) && exportJob.clubbed_jobs.length > 0 && !excludeChildJobs) {
      const childJobs = await ExJobModel.find({
        $or: [
          { job_no: { $in: exportJob.clubbed_jobs } },
          { parent_club_job: exportJob.job_no }
        ],
        job_no: { $ne: exportJob.job_no }
      }).lean();

      const mergedContainers = [];

      for (const j of childJobs) {
        const inv = j.invoices?.[0] || {};
        const op = j.operations?.[0] || {};
        const st = op.statusDetails?.[0] || {};
        const product = inv.products?.[0] || {};
        const hsnList = [...new Set((inv.products || []).map(p => p.hsn_code || p.hsnCode || p.hsn || (p.ritc?.hsnCode || p.ritc?.ritcCode || p.ritc)).filter(Boolean))].join(", ");

        for (const c of (j.containers || [])) {
          mergedContainers.push({
            ...c,
            _sourceJobNo: j.job_no,
            _sourceSbNo: j.custom_house_details?.shipping_bill_no || j.sb_no || j.shippingBillNo,
            _sourceSbDate: j.custom_house_details?.sb_date || j.sb_date,
            _sourceInvoiceNumber: inv.invoiceNumber,
            _sourceInvoiceValue: inv.invoiceValue,
            _sourceLeoDate: st.leoDate,
            _sourceDescription: product.description || j.descriptionOfGoods || j.description,
            _sourceHsnList: hsnList || j.custom_house_details?.hsn_code || j.hsn,
            _sourceFobValue: j.invoices?.[0]?.freightInsuranceCharges?.fobValue?.amount || ""
          });
        }
      }

      jobData.containers = mergedContainers;

      // Merge invoices from parent job + child jobs and deduplicate by invoice number
      const rawInvoices = [
        ...(exportJob.invoices || []).map(inv => ({ ...inv, _sourceJobNo: exportJob.job_no })),
        ...childJobs.flatMap(j => (j.invoices || []).map(inv => ({ ...inv, _sourceJobNo: j.job_no })))
      ].filter(Boolean);

      const uniqueInvoices = [];
      const seenInvKeys = new Set();
      for (const inv of rawInvoices) {
        const key = String(inv.invoiceNumber || inv.invoiceNo || inv.invoice_no || inv._id || "").trim().toUpperCase();
        if (key && seenInvKeys.has(key)) continue;
        if (key) seenInvKeys.add(key);
        uniqueInvoices.push(inv);
      }

      jobData.invoices = uniqueInvoices;
      jobData.operations = [exportJob.operations?.[0] || {}, ...childJobs.flatMap(j => j.operations || [])].filter(Boolean);
    }

    // Check for stale locks (e.g., older than 30 minutes)
    const LOCK_TIMEOUT = 30 * 60 * 1000;
    if (
      exportJob.lockedBy &&
      exportJob.lockedAt &&
      new Date() - new Date(exportJob.lockedAt) > LOCK_TIMEOUT
    ) {
      exportJob.lockedBy = null;
      exportJob.lockedAt = null;
      await exportJob.save();
    }

    // If locked by someone else, return localized info
    const userRoleHeader = req.headers["user-role"] || req.headers["x-user-role"];
    let isAdmin = userRoleHeader === "Admin";
    if (!isAdmin && username) {
      const requester = await UserModel.findOne({ username }).lean();
      isAdmin = requester?.role === "Admin";
    }

    let isLockerAdmin = false;
    if (exportJob.lockedBy) {
      const locker = await UserModel.findOne({
        username: { $regex: `^${exportJob.lockedBy}$`, $options: "i" }
      }).lean();
      isLockerAdmin = locker?.role === "Admin";
    }

    if (
      exportJob.lockedBy &&
      (exportJob.lockedBy || "").toLowerCase() !== (username || "").toLowerCase() &&
      !isAdmin &&
      !isLockerAdmin
    ) {
      return res.status(423).json({
        message: `Job is currently locked by ${exportJob.lockedBy}`,
        lockedBy: exportJob.lockedBy,
        job: jobData, // Still send data if they just want to "view" (optional, but 423 is standard for locked)
      });
    }

    res.json(jobData);
  } catch (error) {
    console.error("Error fetching export job:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Lock a job
router.put("/:job_no(.*)/lock", async (req, res) => {
  try {
    const job_no = extractJobNoFromPath(req, "lock");
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required to lock" });
    }

    const job = await findJobByJobNoOrEnquiry(job_no);

    if (!job) return res.status(404).json({ message: "Job not found" });

    const userRoleHeader = req.headers["user-role"] || req.headers["x-user-role"];
    let isAdmin = userRoleHeader === "Admin";
    if (!isAdmin && username) {
      const requester = await UserModel.findOne({
        username: { $regex: `^${username}$`, $options: "i" }
      }).lean();
      isAdmin = requester?.role === "Admin";
    }

    // IF AN ADMIN IS OPENING THE JOB:
    // Admin opening/editing a job MUST NOT lock it for other users
    if (isAdmin) {
      let isLockerAdmin = false;
      if (job.lockedBy) {
        const locker = await UserModel.findOne({
          username: { $regex: `^${job.lockedBy}$`, $options: "i" }
        }).lean();
        isLockerAdmin = locker?.role === "Admin";
      }
      if (isLockerAdmin) {
        job.lockedBy = null;
        job.lockedAt = null;
        await job.save();
      }
      return res.json({ message: "Job locked successfully", lockedBy: null, isAdmin: true });
    }

    // FOR REGULAR (NON-ADMIN) USERS:
    let isLockerAdmin = false;
    if (job.lockedBy) {
      const locker = await UserModel.findOne({
        username: { $regex: `^${job.lockedBy}$`, $options: "i" }
      }).lean();
      isLockerAdmin = locker?.role === "Admin";
    }

    const LOCK_TIMEOUT = 30 * 60 * 1000;
    const isStale =
      job.lockedAt && new Date() - new Date(job.lockedAt) > LOCK_TIMEOUT;

    if (
      job.lockedBy &&
      (job.lockedBy || "").toLowerCase() !== (username || "").toLowerCase() &&
      !isStale &&
      !isLockerAdmin
    ) {
      return res.status(423).json({
        message: `Already locked by ${job.lockedBy}`,
        lockedBy: job.lockedBy,
      });
    }

    job.lockedBy = username;
    job.lockedAt = new Date();
    await job.save();

    res.json({ message: "Job locked successfully", lockedBy: username });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Unlock a job (Supports both PUT and POST for sendBeacon support)
router.route("/:job_no(.*)/unlock").all(async (req, res) => {
  try {
    const job_no = extractJobNoFromPath(req, "unlock");
    const { username } = req.body;

    const job = await findJobByJobNoOrEnquiry(job_no);

    if (!job) return res.status(404).json({ message: "Job not found" });

    // Only let the owner or an admin unlock? For now, if username matches
    if ((job.lockedBy || "").toLowerCase() === (username || "").toLowerCase()) {
      job.lockedBy = null;
      job.lockedAt = null;
      await job.save();
      return res.json({ message: "Job unlocked successfully" });
    }

    // Explicitly allow non-lockers to "succeed" during cleanup to prevent frontend errors
    return res.json({ message: "Job released" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Track click on a document (esanchit, checklist, file_cover)
router.put("/:job_no(.*)/track-click", async (req, res) => {
  try {
    const job_no = extractJobNoFromPath(req, "track-click");
    const { docType } = req.body;
    const username = req.headers["username"] || "unknown";

    if (!docType || !["checklist", "file_cover", "esanchit"].includes(docType)) {
      return res.status(400).json({ message: "Invalid or missing docType" });
    }

    const job = await findJobByJobNoOrEnquiry(job_no);

    if (!job) return res.status(404).json({ message: "Job not found" });

    if (!job.docClicks) {
      job.docClicks = {};
    }

    job.docClicks[docType] = {
      clickedBy: username,
      clickedAt: new Date()
    };

    job.markModified("docClicks");
    await job.save();

    res.json({ message: "Click tracked successfully", docClicks: job.docClicks });
  } catch (error) {
    console.error("Error tracking doc click:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT documents
router.put(
  "/:job_no(.*)/documents",
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const job_no = extractJobNoFromPath(req, "documents");

      const existingJob = await findJobByJobNoOrEnquiry(job_no);
      if (existingJob) {
        const usernameHeader = req.headers["username"] || req.headers["x-username"];
        const userRoleHeader = req.headers["user-role"] || req.headers["x-user-role"];
        const requester = usernameHeader ? await UserModel.findOne({ username: usernameHeader }) : null;
        const isAdmin = requester?.role === "Admin" || userRoleHeader === "Admin";

        if (existingJob.send_for_billing && !isAdmin) {
          return res.status(403).json({
            message: "This job has been sent for billing. Only Admins can modify it."
          });
        }
      }

      const { export_documents } = req.body;

      const updatedExportJob = await ExJobModel.findOneAndUpdate(
        { job_no: { $regex: `^${job_no}$`, $options: "i" } },
        { $set: { export_documents, updatedAt: new Date() } },
        { new: true }
      );

      if (!updatedExportJob) {
        return res.status(404).json({ message: "Export job not found" });
      }

      await syncToClientDatabase(updatedExportJob.job_no, { export_documents });

      res.json({
        message: "Documents updated successfully",
        data: updatedExportJob,
      });
    } catch (error) {
      console.error("Error updating export documents:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PUT containers
router.put(
  "/:job_no(.*)/containers",
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const raw = req.params.job_no || "";
      const job_no = decodeURIComponent(raw);

      const existingJob = await ExJobModel.findOne({ job_no: { $regex: `^${job_no}$`, $options: "i" } });
      if (existingJob) {
        const usernameHeader = req.headers["username"] || req.headers["x-username"];
        const userRoleHeader = req.headers["user-role"] || req.headers["x-user-role"];
        const requester = usernameHeader ? await UserModel.findOne({ username: usernameHeader }) : null;
        const isAdmin = requester?.role === "Admin" || userRoleHeader === "Admin";

        if (existingJob.send_for_billing && !isAdmin) {
          return res.status(403).json({
            message: "This job has been sent for billing. Only Admins can modify it."
          });
        }
      }

      const { containers } = req.body;

      let cleanContainers = containers;
      if (Array.isArray(containers)) {
        const seen = new Set();
        cleanContainers = containers.filter(c => {
          const cNo = (c.containerNo || c.container_number || "").trim().toUpperCase();
          if (!cNo) return true;
          if (seen.has(cNo)) return false;
          seen.add(cNo);
          return true;
        });
      }

      const username = req.headers["username"] || "System";
      const updateFields = { containers: cleanContainers, updatedAt: new Date() };

      if (existingJob) {
        const changeNotif = detectSbOrSealChange(existingJob, { containers }, username);
        if (changeNotif) {
          updateFields.sb_or_seal_changed_notif = changeNotif.sb_or_seal_changed_notif;
          updateFields.sb_or_seal_changed_details = changeNotif.sb_or_seal_changed_details;
        }
      }

      const updatedExportJob = await ExJobModel.findOneAndUpdate(
        { job_no: { $regex: `^${job_no}$`, $options: "i" } },
        { $set: updateFields },
        { new: true }
      );

      if (!updatedExportJob) {
        return res.status(404).json({ message: "Export job not found" });
      }

      await syncToClientDatabase(updatedExportJob.job_no, { containers });

      res.json({
        message: "Containers updated successfully",
        data: updatedExportJob,
      });
    } catch (error) {
      console.error("Error updating containers:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PUT /api/exports/:job_no/clear-sb-seal-notif - Clear SB or Seal change notification
router.put("/:job_no(.*)/clear-sb-seal-notif", async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    const updatedJob = await ExJobModel.findOneAndUpdate(
      { job_no: { $regex: `^${job_no}$`, $options: "i" } },
      { $set: { sb_or_seal_changed_notif: false } },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({ success: true, message: "Notification cleared successfully", data: updatedJob });
  } catch (error) {
    console.error("Error clearing notification:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update export job (full)
router.put("/:job_no(.*)", auditMiddleware("Job"), async (req, res, next) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    // Robust check for Export Job Number format (e.g., BRANCH/EXP/MODE/SEQ/YEAR)
    // This prevents the wildcard route from eating other API request paths.
    const isJobNumber =
      job_no &&
      typeof job_no === "string" &&
      job_no.includes("/") &&
      job_no.split("/").length >= 3;

    if (!isJobNumber) {
      return next();
    }

    const username = req.headers["username"];

    // Enforce lock check
    const existingJob = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
    });

    if (existingJob) {
      const usernameHeader = req.headers["username"] || req.headers["x-username"];
      const userRoleHeader = req.headers["user-role"] || req.headers["x-user-role"];
      const requester = usernameHeader ? await UserModel.findOne({ username: usernameHeader }) : null;
      const isAdmin = requester?.role === "Admin" || userRoleHeader === "Admin";

      if (existingJob.send_for_billing && !isAdmin) {
        // Check if only billing-related fields are being updated
        if (!isBillingOnlyUpdate(req.body)) {
          return res.status(403).json({
            message: "This job has been sent for billing. Only Admins can modify it."
          });
        }
      }

      let isLockerAdmin = false;
      if (existingJob.lockedBy) {
        const locker = await UserModel.findOne({
          username: { $regex: `^${existingJob.lockedBy}$`, $options: "i" }
        }).lean();
        isLockerAdmin = locker?.role === "Admin";
      }

      if (
        existingJob.lockedBy &&
        existingJob.lockedBy !== username &&
        !isAdmin &&
        !isLockerAdmin
      ) {
        const LOCK_TIMEOUT = 30 * 60 * 1000;
        if (
          existingJob.lockedAt &&
          new Date() - new Date(existingJob.lockedAt) < LOCK_TIMEOUT
        ) {
          return res.status(403).json({
            message: `Update blocked: Job is locked by ${existingJob.lockedBy}`,
          });
        }
      }
    }

    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData._id;

    if (existingJob) {
      // Billing validation check
      const billingErr = validateSendForBilling(existingJob, updateData);
      if (billingErr) {
        return res.status(400).json({ message: billingErr });
      }

      // Copy parent dates if child
      await applyParentDatesIfChild(existingJob, updateData);

      const changeNotif = detectSbOrSealChange(existingJob, updateData, username);
      if (changeNotif) {
        updateData.sb_or_seal_changed_notif = changeNotif.sb_or_seal_changed_notif;
        updateData.sb_or_seal_changed_details = changeNotif.sb_or_seal_changed_details;
      }

      // If updating a club parent job, prevent saving child jobs' invoices into the parent job document
      if (existingJob.is_club_job_parent && Array.isArray(updateData.invoices)) {
        let parentOnlyInvoices = updateData.invoices.filter(
          (inv) => !inv._sourceJobNo || String(inv._sourceJobNo).toUpperCase() === String(job_no).toUpperCase()
        );
        const seenInvNos = new Set();
        parentOnlyInvoices = parentOnlyInvoices.filter((inv) => {
          const invNo = String(inv.invoiceNumber || inv.invoiceNo || inv.invoice_no || inv._id || "").trim().toUpperCase();
          if (!invNo) return true;
          if (seenInvNos.has(invNo)) return false;
          seenInvNos.add(invNo);
          return true;
        });
        updateData.invoices = parentOnlyInvoices;
      }
    }

    // Gracefully handle if detailedStatus arrives as an array from the frontend
    if (Array.isArray(updateData.detailedStatus)) {
      updateData.detailedStatus = updateData.detailedStatus.length > 0
        ? String(updateData.detailedStatus[updateData.detailedStatus.length - 1])
        : "";
    }

    // Business Logic: Status is determined by pre-save hook in the model
    // but we can set it here if desired. Removing one-way logic to allow model to handle it.

    const updatedExportJob = await ExJobModel.findOneAndUpdate(
      { job_no: { $regex: `^${job_no}$`, $options: "i" } },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedExportJob) {
      return res.status(404).json({ message: "Export job not found" });
    }

    // Sync back to FreightEnquiry if it's a Freight Forwarding job
    if (job_no.startsWith("FF")) {
      const enquiryUpdates = {};
      const fieldsToSync = [
        "shipment_type",
        "container_size",
        "goods_stuffed",
        "contact_no",
        "email",
        "is_manual_cbm",
        "dimensions",
        "bl_details",
        "remarks",
        "port_of_loading",
        "port_of_destination",
        "consignment_type",
        "eta_date",
        "arrival_date",
        "final_delivery_date",
        "delay_reason",
        "sailing_date",
        "shipped_on_board_date"
      ];
      fieldsToSync.forEach(field => {
        if (req.body[field] !== undefined) {
          enquiryUpdates[field] = req.body[field];
        }
      });
      const isImport = String(req.body.shipment_type || existingJob?.shipment_type || "").startsWith("Import");
      if (isImport) {
        if (req.body.consignees?.[0]?.consignee_name !== undefined) {
          enquiryUpdates.organization_name = req.body.consignees[0].consignee_name;
        }
      } else {
        if (req.body.shipper !== undefined) {
          enquiryUpdates.organization_name = req.body.shipper;
        }
      }
      if (req.body.movement_type !== undefined) enquiryUpdates.movement_type = req.body.movement_type;
      // Sync Net Weight & Gross Weight
      let effectiveNetWeight = req.body.net_weight_kg;
      if (!effectiveNetWeight || effectiveNetWeight === "") {
        if (req.body.bl_details?.net_weight) {
          const cleanNet = String(req.body.bl_details.net_weight).replace(/KGS?/gi, "").trim();
          if (cleanNet) {
            effectiveNetWeight = cleanNet;
          }
        }
      }
      if (effectiveNetWeight && effectiveNetWeight !== "") {
        updateData.net_weight_kg = effectiveNetWeight;
        enquiryUpdates.net_weight = effectiveNetWeight;
        enquiryUpdates.net_weight_kg = effectiveNetWeight;
        if (enquiryUpdates.bl_details) {
          if (!enquiryUpdates.bl_details.net_weight || enquiryUpdates.bl_details.net_weight === "" || enquiryUpdates.bl_details.net_weight === "0.000 KGS") {
            enquiryUpdates.bl_details.net_weight = `${effectiveNetWeight} KGS`;
          }
        }
      }

      let effectiveGrossWeight = req.body.gross_weight_kg;
      if (!effectiveGrossWeight || effectiveGrossWeight === "") {
        if (req.body.bl_details?.gross_weight) {
          const cleanGross = String(req.body.bl_details.gross_weight).replace(/KGS?/gi, "").trim();
          if (cleanGross) {
            effectiveGrossWeight = cleanGross;
          }
        }
      }
      if (effectiveGrossWeight && effectiveGrossWeight !== "") {
        updateData.gross_weight_kg = effectiveGrossWeight;
        enquiryUpdates.gross_weight = effectiveGrossWeight;
        enquiryUpdates.gross_weight_kg = effectiveGrossWeight;
        if (enquiryUpdates.bl_details) {
          if (!enquiryUpdates.bl_details.gross_weight || enquiryUpdates.bl_details.gross_weight === "") {
            enquiryUpdates.bl_details.gross_weight = `${effectiveGrossWeight} KGS`;
          }
        }
      }
      if (req.body.gross_weight_unit !== undefined) enquiryUpdates.gross_weight_unit = req.body.gross_weight_unit;
      if (req.body.net_weight_unit !== undefined) enquiryUpdates.net_weight_unit = req.body.net_weight_unit;
      if (req.body.chargeable_weight !== undefined) enquiryUpdates.chargeable_weight = req.body.chargeable_weight;
      if (req.body.chargeable_weight_unit !== undefined) enquiryUpdates.chargeable_weight_unit = req.body.chargeable_weight_unit;
      if (req.body.volume_cbm !== undefined) enquiryUpdates.volume_cbm = req.body.volume_cbm;
      if (req.body.volume_unit !== undefined) enquiryUpdates.volume_unit = req.body.volume_unit;
      if (req.body.total_no_of_pkgs !== undefined) enquiryUpdates.no_packages = req.body.total_no_of_pkgs;
      if (req.body.package_unit !== undefined) enquiryUpdates.package_unit = req.body.package_unit;
      if (req.body.volume_weight !== undefined) enquiryUpdates.volume_weight = req.body.volume_weight;
      if (req.body.port_of_loading !== undefined) enquiryUpdates.port_of_loading = req.body.port_of_loading;
      if (req.body.port_of_discharge !== undefined) enquiryUpdates.port_of_destination = req.body.port_of_discharge;
      if (req.body.consignmentType !== undefined) enquiryUpdates.consignment_type = req.body.consignmentType;

      if (req.body.containers !== undefined && Array.isArray(req.body.containers)) {
        enquiryUpdates.containers = req.body.containers.map(c => ({
          container_number: c.containerNo || c.container_number || "",
          custom_seal: c.customSealNo || c.custom_seal || "",
          line_seal: c.shippingLineSealNo || c.line_seal || ""
        }));
      }

      if (Object.keys(enquiryUpdates).length > 0) {
        await FreightEnquiryModel.updateOne(
          {
            $or: [
              { enquiry_no: job_no },
              { success_no: job_no }
            ]
          },
          { $set: enquiryUpdates }
        );
      }
    }

    // Force Mongoose to run pre-save hook calculation for milestones and status
    updatedExportJob.markModified("milestones");
    updatedExportJob.markModified("detailedStatus");
    updatedExportJob.markModified("vgm_done");
    updatedExportJob.markModified("form13_done");
    updatedExportJob.markModified("shipping_bill_done");
    updatedExportJob.markModified("isBuyer");
    await updatedExportJob.save();
    await syncClubFields(updatedExportJob);

    res.json({
      message: "Export job updated successfully",
      data: updatedExportJob,
    });
  } catch (error) {
    console.error("Error updating export job:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PATCH fields by id
router.patch(
  "/id/:id/fields",
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { fieldUpdates } = req.body;
      const usernameHeader = req.headers["username"] || req.headers["x-username"];
      const userRoleHeader = req.headers["user-role"] || req.headers["x-user-role"];

      const existingJob = await ExJobModel.findById(id);
      if (existingJob) {
        const requester = usernameHeader ? await UserModel.findOne({ username: usernameHeader }) : null;
        const isAdmin = requester?.role === "Admin" || userRoleHeader === "Admin";

        if (existingJob.send_for_billing && !isAdmin) {
          // Check if only billing-related fields are being updated
          const { fieldUpdates } = req.body;
          const updateObject = {};
          (fieldUpdates || []).forEach(({ field, value }) => {
            updateObject[field] = value;
          });

          // Allow billing-only updates for non-admins after send_for_billing
          if (!isBillingOnlyUpdate(updateObject)) {
            return res.status(403).json({
              message: "This job has been sent for billing. Only Admins can modify it."
            });
          }
        }
      }
      const updateObject = {};
      (fieldUpdates || []).forEach(({ field, value }) => {
        updateObject[field] = value;
      });
      updateObject.updatedAt = new Date();

      if (existingJob) {
        // Billing validation check
        const billingErr = validateSendForBilling(existingJob, updateObject);
        if (billingErr) {
          return res.status(400).json({ message: billingErr });
        }

        // Copy parent dates if child
        await applyParentDatesIfChild(existingJob, updateObject);

        const changeNotif = detectSbOrSealChange(existingJob, updateObject, usernameHeader);
        if (changeNotif) {
          updateObject.sb_or_seal_changed_notif = changeNotif.sb_or_seal_changed_notif;
          updateObject.sb_or_seal_changed_details = changeNotif.sb_or_seal_changed_details;
        }
      }

      if (Array.isArray(updateObject.detailedStatus)) {
        updateObject.detailedStatus = updateObject.detailedStatus.length > 0
          ? String(updateObject.detailedStatus[updateObject.detailedStatus.length - 1])
          : "";
      }

      const updatedExportJob = await ExJobModel.findByIdAndUpdate(
        id,
        { $set: updateObject },
        { new: true }
      );

      if (!updatedExportJob) {
        return res.status(404).json({ message: "Export job not found" });
      }

      updatedExportJob.markModified("milestones");
      updatedExportJob.markModified("detailedStatus");
      updatedExportJob.markModified("vgm_done");
      updatedExportJob.markModified("form13_done");
      updatedExportJob.markModified("shipping_bill_done");
      updatedExportJob.markModified("isBuyer");
      await updatedExportJob.save();

      if (updatedExportJob.job_no) {
        await syncToClientDatabase(updatedExportJob.job_no, updateObject);
        await syncClubFields(updatedExportJob);
      }

      res.json({
        message: "Fields updated successfully",
        updatedFields: Object.keys(updateObject),
        data: updatedExportJob,
      });
    } catch (error) {
      console.error("Error updating export job fields by id:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// PATCH fields
router.patch(
  "/:job_no(.*)/fields",
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const raw = req.params.job_no || "";
      const job_no = decodeURIComponent(raw);
      const usernameHeader = req.headers["username"] || req.headers["x-username"];
      const userRoleHeader = req.headers["user-role"] || req.headers["x-user-role"];

      const existingJob = await ExJobModel.findOne({ job_no: { $regex: `^${job_no}$`, $options: "i" } });
      if (existingJob) {
        const requester = usernameHeader ? await UserModel.findOne({ username: usernameHeader }) : null;
        const isAdmin = requester?.role === "Admin" || userRoleHeader === "Admin";

        if (existingJob.send_for_billing && !isAdmin) {
          // Check if only billing-related fields are being updated
          const { fieldUpdates } = req.body;
          const updateObject = {};
          (fieldUpdates || []).forEach(({ field, value }) => {
            updateObject[field] = value;
          });

          // Allow billing-only updates for non-admins after send_for_billing
          if (!isBillingOnlyUpdate(updateObject)) {
            return res.status(403).json({
              message: "This job has been sent for billing. Only Admins can modify it."
            });
          }
        }
      }

      const { fieldUpdates } = req.body;
      const updateObject = {};
      (fieldUpdates || []).forEach(({ field, value }) => {
        updateObject[field] = value;
      });
      updateObject.updatedAt = new Date();

      if (existingJob) {
        // Billing validation check
        const billingErr = validateSendForBilling(existingJob, updateObject);
        if (billingErr) {
          return res.status(400).json({ message: billingErr });
        }

        // Copy parent dates if child
        await applyParentDatesIfChild(existingJob, updateObject);

        const changeNotif = detectSbOrSealChange(existingJob, updateObject, usernameHeader);
        if (changeNotif) {
          updateObject.sb_or_seal_changed_notif = changeNotif.sb_or_seal_changed_notif;
          updateObject.sb_or_seal_changed_details = changeNotif.sb_or_seal_changed_details;
        }
      }

      // Gracefully handle if detailedStatus arrives as an array from the frontend
      if (Array.isArray(updateObject.detailedStatus)) {
        updateObject.detailedStatus = updateObject.detailedStatus.length > 0
          ? String(updateObject.detailedStatus[updateObject.detailedStatus.length - 1])
          : "";
      }

      // Business Logic: Status is determined by pre-save hook in the model

      const updatedExportJob = await ExJobModel.findOneAndUpdate(
        { job_no: { $regex: `^${job_no}$`, $options: "i" } },
        { $set: updateObject },
        { new: true }
      );

      if (!updatedExportJob) {
        return res.status(404).json({ message: "Export job not found" });
      }

      // Force Pre-Save calculations for milestones and detailedStatus
      updatedExportJob.markModified("milestones");
      updatedExportJob.markModified("detailedStatus");
      updatedExportJob.markModified("vgm_done");
      updatedExportJob.markModified("form13_done");
      updatedExportJob.markModified("shipping_bill_done");
      updatedExportJob.markModified("isBuyer");
      await updatedExportJob.save();

      await syncToClientDatabase(updatedExportJob.job_no, updateObject);
      await syncClubFields(updatedExportJob);

      res.json({
        message: "Fields updated successfully",
        updatedFields: Object.keys(updateObject),
        data: updatedExportJob,
      });
    } catch (error) {
      console.error("Error updating export job fields:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);



export default router;
