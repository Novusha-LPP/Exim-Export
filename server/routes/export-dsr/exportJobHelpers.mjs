import ExJobModel from "../../model/export/ExJobModel.mjs";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";
import UserModel from "../../model/userModel.mjs";
import importDbConnection from "../../model/importDB.js";
import { detectSbOrSealChange } from "../../utils/sbSealChangeDetector.mjs";

export function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isFreightForwardingJob(job) {
  const jobNo = String(job?.job_no || job?.jobNumber || "").toUpperCase();
  return jobNo.startsWith("FF") ||
    jobNo.includes("FF-") ||
    jobNo.includes("/FF/") ||
    job?.freight === true ||
    job?.is_freight === true ||
    job?.isFreightForwarding === true ||
    String(job?.job_type || "").toLowerCase().includes("freight") ||
    String(job?.jobCategory || "").toLowerCase().includes("freight");
}

export function isLikelyJobNumber(job_no) {
  if (!job_no || typeof job_no !== "string") return false;
  const trimmed = job_no.trim();

  // Explicit non-job exclusions
  if (
    trimmed.startsWith("get-export-job") ||
    trimmed.startsWith("signer") ||
    trimmed.startsWith("directories") ||
    trimmed.startsWith("master-list") ||
    trimmed.startsWith("tally") ||
    trimmed.startsWith("charges") ||
    trimmed.startsWith("upload") ||
    trimmed.startsWith("delete-s3") ||
    trimmed.startsWith("feedback") ||
    trimmed.startsWith("health") ||
    trimmed.startsWith("login")
  ) {
    return false;
  }

  // Must have at least 3 path segments separated by slashes
  const segments = trimmed.split("/");
  if (segments.length < 3) return false;

  const upper = trimmed.toUpperCase();
  // Must contain valid domain tokens: /EXP, GEN/EXP, or FF
  return (
    upper.includes("/EXP") ||
    upper.startsWith("GEN/EXP") ||
    upper.startsWith("FF") ||
    upper.includes("/FF/") ||
    upper.includes("FF-")
  );
}

export function hasClubBillingDate(job) {
  return (job?.operations || []).some((operation) =>
    (operation?.statusDetails || []).some((details) =>
      details.billing_details?.agency_bill_date ||
      details.billing_details?.reimbursement_bill_date
    )
  );
}

// Helper function to check if only billing-related fields are being updated
export function isBillingOnlyUpdate(updateObject) {
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

    if (key === "send_for_billing" && updateObject[key] === false) {
      continue;
    }
    if (key === "send_for_billing_date" && (updateObject[key] === null || updateObject[key] === "" || updateObject[key] === undefined)) {
      continue;
    }

    if (typeof key === "string" && key.includes("operations")) {
      const fieldPath = key;
      const isAllowed = billingAllowedPatterns.some(pattern =>
        fieldPath === pattern || fieldPath.startsWith(pattern + ".")
      );

      if (!isAllowed) {
        return false;
      }
      continue;
    }

    if (key === "operations" && Array.isArray(updateObject[key])) {
      const ops = updateObject[key];
      if (ops[0]?.statusDetails?.[0]) {
        const statusDetail = ops[0].statusDetails[0];
        const allowedBillingKeys = ["billing_details", "billingDocsSentDt", "billingDocsSentUpload"];
        for (const detailKey of Object.keys(statusDetail)) {
          if (!allowedBillingKeys.includes(detailKey)) {
            return false;
          }
        }
      }
      continue;
    }

    return false;
  }

  return true;
}

export async function syncToClientDatabase(jobNo, updateObject) {
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

export function extractJobNoFromPath(req, suffix) {
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

export async function findJobByJobNoOrEnquiry(job_no) {
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
          is_client_job: true,
          created_by_client: true,
          freight_enquiry_id: enquiry.enquiry_no || enquiry.success_no || "",
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

export function validateSendForBilling(job, updates) {
  if (updates.send_for_billing === true || updates.send_for_billing === "true") {
    const isAir = String(updates.transportMode || job.transportMode || "").toUpperCase() === "AIR" ||
      String(job.job_no || "").toUpperCase().includes("/AIR/") ||
      String(updates.consignmentType || job.consignmentType || "").toUpperCase() === "AIR";
    const isLCL = String(updates.consignmentType || job.consignmentType || "").toUpperCase() === "LCL";
    const isGen = String(job.job_no || "").toUpperCase().startsWith("GEN") || job.isGeneralJob === true || updates.isGeneralJob === true;
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

    if (!isGen && !isFF) {
      const ops = updates.operations || job.operations || [];
      const firstOp = ops[0] || {};
      const status = firstOp.statusDetails?.[0] || {};

      const handoverDate = status.handoverForwardingNoteDate || job.handover_date || updates.handover_date;
      const hasHandover = handoverDate && String(handoverDate).trim();

      if (!isAir && !isLCL) {
        const railRoadOutDate = status.handoverConcorTharSanganaRailRoadDate;
        const reachedDate = status.railOutReachedDate;
        const hasRailRoad = railRoadOutDate && String(railRoadOutDate).trim();
        const hasReached = reachedDate && String(reachedDate).trim();

        if (!hasHandover && (!hasRailRoad || !hasReached)) {
          return "Cannot send for billing: Handover date, Rail Out/Road Out date, and Reached date are required.";
        }
        if (!hasHandover) {
          return "Cannot send for billing: Handover date is required.";
        }
        if (!hasRailRoad || !hasReached) {
          return "Cannot send for billing: Rail Out/Road Out date and Reached date are required.";
        }
      } else {
        if (!hasHandover) {
          return "Cannot send for billing: Handover date is required.";
        }
      }
    }
  }
  return null;
}

export async function applyParentDatesIfChild(existingJob, updateObject) {
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

export async function syncClubFields(job) {
  try {
    if (!job) return;

    const isClubJob = job.is_club_job_parent || !!job.parent_club_job;
    if (!isClubJob) return;

    const parentJobNo = job.is_club_job_parent ? job.job_no : job.parent_club_job;

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

      sibOp0.handoverForwardingNoteDate = op0Status.handoverForwardingNoteDate || "";
      sibOp0.containerPlacementDate = op0Status.containerPlacementDate || "";
      sibOp0.gateInDate = op0Status.gateInDate || "";

      if (job.is_club_job_parent) {
        sibOp0.handoverConcorTharSanganaRailRoadDate = op0Status.handoverConcorTharSanganaRailRoadDate || "";
        sibOp0.railOutReachedDate = op0Status.railOutReachedDate || "";
      }

      sibOp0.handoverImageUpload = op0Status.handoverImageUpload || [];
      sibOp0.manualVgmUpload = op0Status.manualVgmUpload || [];
      sibOp0.cmaForwardingNoteUpload = op0Status.cmaForwardingNoteUpload || [];
      sibOp0.assessmentCopy = op0Status.assessmentCopy || [];

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

      sibling.send_for_billing = updates.send_for_billing;
      sibling.send_for_billing_date = updates.send_for_billing_date;
      sibling.vgm_done = updates.vgm_done;
      sibling.vgm_date = updates.vgm_date;
      sibling.form13_done = updates.form13_done;
      sibling.form13_date = updates.form13_date;
      if (job.detailedStatus) {
        sibling.detailedStatus = job.detailedStatus;
      }
      if (job.status) {
        sibling.status = job.status;
      }
      const hasSiblingBillDates = Boolean(
        sibOp0.billing_details?.agency_bill_date ||
        sibOp0.billing_details?.reimbursement_bill_date
      );
      if (hasSiblingBillDates || job.detailedStatus === "Billing Done") {
        sibling.detailedStatus = "Billing Done";
        sibling.status = "Completed";
      }

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
