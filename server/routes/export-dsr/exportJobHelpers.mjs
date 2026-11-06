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

    // Fetch parent job
    const parentJob = job.is_club_job_parent ? job : await ExJobModel.findOne({ job_no: parentJobNo });
    if (!parentJob) return;

    // Find all sibling / child jobs in this club
    const childJobs = await ExJobModel.find({
      $or: [
        { parent_club_job: parentJobNo },
        { job_no: { $in: (parentJob.clubbed_jobs || []).filter(j => j !== parentJobNo) } }
      ],
      job_no: { $ne: parentJob.job_no }
    });

    if (childJobs.length === 0) return;

    // Fields to sync from Parent to all Child jobs:
    // 1. Port & Location Details
    const portLocationFields = [
      "discharge_port",
      "discharge_country",
      "destination_port",
      "destination_country",
      "shipping_line_airline",
      "vessel_name",
      "voyage_no",
      "booking_no",
      "booking_date",
      "sailing_date",
      "egm_no",
      "egm_date",
      "mbl_no",
      "mbl_date",
      "hbl_no",
      "hbl_date",
      "forwarder",
      "cut_off_date",
      "pickup_loc",
      "drop_loc",
      "booking_copy",
      "pre_carriage_by",
      "place_of_receipt",
      "haulier",
      "gateway_port",
      "state_of_origin",
      "port_of_loading",
      "port_of_discharge",
      "final_destination",
      "shipped_on_board_date",
      "arrival_date",
      "final_delivery_date"
    ];

    const parentOp0 = parentJob.operations?.[0] || {};
    const parentOp0Status = parentOp0.statusDetails?.[0] || {};

    const parentContainers = Array.isArray(parentJob.containers) ? parentJob.containers : [];

    for (const sibling of childJobs) {
      // 1. SYNC PORT & LOCATION FIELDS
      for (const field of portLocationFields) {
        if (parentJob[field] !== undefined) {
          sibling[field] = parentJob[field];
        }
      }

      // 2. SYNC PHYSICAL CONTAINER DETAILS (containerNo up to isoCode, tare, seals, weighment)
      // Child retains its own pkgsStuffed, grossWeight, and vgmWtInvoice
      if (parentContainers.length > 0) {
        const existingChildContainers = Array.isArray(sibling.containers) ? sibling.containers : [];
        const syncedChildContainers = [];

        for (let i = 0; i < parentContainers.length; i++) {
          const parentC = parentContainers[i];
          const existingC = existingChildContainers[i] || {};

          // Preserve child's specific cargo packages & gross weight
          const childPkgs = (existingC.pkgsStuffed !== undefined && existingC.pkgsStuffed !== null && existingC.pkgsStuffed !== 0)
            ? existingC.pkgsStuffed
            : (i === 0 ? Number(sibling.total_no_of_pkgs || 0) : 0);

          const childGw = (existingC.grossWeight !== undefined && existingC.grossWeight !== null && existingC.grossWeight !== 0)
            ? existingC.grossWeight
            : (i === 0 ? Number(sibling.gross_weight_kg || 0) : 0);

          const childTare = Number(parentC.tareWeightKgs || existingC.tareWeightKgs || 0);
          const childVgm = (existingC.vgmWtInvoice && existingC.vgmWtInvoice !== 0)
            ? existingC.vgmWtInvoice
            : parseFloat((childGw + childTare).toFixed(3));

          syncedChildContainers.push({
            ...existingC,
            serialNumber: i + 1,
            containerNo: parentC.containerNo || "",
            type: parentC.type || "",
            isoCode: parentC.isoCode || "",
            sealNo: parentC.sealNo || "",
            customSealNo: parentC.customSealNo || "",
            shippingLineSealNo: parentC.shippingLineSealNo || "",
            sealDate: parentC.sealDate || "",
            sealType: parentC.sealType || "RFID",
            tareWeightKgs: parentC.tareWeightKgs || 0,
            maxGrossWeightKgs: parentC.maxGrossWeightKgs || 0,
            maxPayloadKgs: parentC.maxPayloadKgs || 0,
            images: parentC.images || existingC.images || [],
            weighBridgeName: parentC.weighBridgeName || "",
            weighmentTransporterName: parentC.weighmentTransporterName || "",
            weighmentRegNo: parentC.weighmentRegNo || "",
            weighmentDateTime: parentC.weighmentDateTime || "",
            weighmentVehicleNo: parentC.weighmentVehicleNo || "",
            weighmentTareWeight: parentC.weighmentTareWeight || 0,
            weighmentAddress: parentC.weighmentAddress || "",
            weighmentImages: parentC.weighmentImages || [],
            pkgsStuffed: childPkgs,
            grossWeight: childGw,
            vgmWtInvoice: childVgm
          });
        }

        sibling.containers = syncedChildContainers;
        sibling.no_of_containers = String(parentContainers.length);
        sibling.markModified("containers");
      }

      // 3. SYNC OPERATIONS DETAILS
      // Shared fields synced from parent: Gate Pass, Gate Pass Copy, Handover Doc, Handover Copy, Forwarder, Operational Lock, Rail Out, Rail Reached, Manual VGM Upload, CMA Forwarding Note Upload, Assessment Copy, Billing Details, send_for_billing, vgm_done, form13_done.
      // EXCLUDED (kept unique per child shipping bill): Gate-In/Carting, RMS Status, Goods Registration, Goods Report, LEO, LEO Copy, ICD/Port.
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

      // Sync Gate Pass & Gate Pass Copy
      sibOp0.eGatePassCopyDate = parentOp0Status.eGatePassCopyDate || "";
      sibOp0.eGatePassUpload = parentOp0Status.eGatePassUpload || [];

      // Sync Handover Doc & Handover Copy
      sibOp0.handoverForwardingNoteDate = parentOp0Status.handoverForwardingNoteDate || "";
      sibOp0.handoverImageUpload = parentOp0Status.handoverImageUpload || [];

      // Sync Forwarder & Container Placement
      sibOp0.forwarderName = parentOp0Status.forwarderName || "";
      sibOp0.containerPlacementDate = parentOp0Status.containerPlacementDate || "";

      // Sync Rail Out & Rail Reached
      sibOp0.handoverConcorTharSanganaRailRoadDate = parentOp0Status.handoverConcorTharSanganaRailRoadDate || "";
      sibOp0.railOutReachedDate = parentOp0Status.railOutReachedDate || "";
      sibOp0.railRoad = parentOp0Status.railRoad || "";
      sibOp0.concorPrivate = parentOp0Status.concorPrivate || "";
      sibOp0.privateTransporterName = parentOp0Status.privateTransporterName || "";

      // Sync Document Uploads
      sibOp0.manualVgmUpload = parentOp0Status.manualVgmUpload || [];
      sibOp0.cmaForwardingNoteUpload = parentOp0Status.cmaForwardingNoteUpload || [];
      sibOp0.assessmentCopy = parentOp0Status.assessmentCopy || [];

      // Sync Operational Lock
      sibling.operational_lock = parentJob.operational_lock || false;

      // Sync Billing Details
      if (parentOp0Status.billingDocsSentDt) {
        sibOp0.billingDocsSentDt = parentOp0Status.billingDocsSentDt;
      }
      if (parentOp0Status.billingDocsSentUpload && parentOp0Status.billingDocsSentUpload.length > 0) {
        sibOp0.billingDocsSentUpload = parentOp0Status.billingDocsSentUpload;
      }
      if (parentOp0Status.billing_details) {
        if (!sibOp0.billing_details) {
          sibOp0.billing_details = {};
        }
        sibOp0.billing_details.agency_bill_date = parentOp0Status.billing_details.agency_bill_date || "";
        sibOp0.billing_details.agency_bill_no = parentOp0Status.billing_details.agency_bill_no || "";
        sibOp0.billing_details.reimbursement_bill_date = parentOp0Status.billing_details.reimbursement_bill_date || "";
        sibOp0.billing_details.reimbursement_bill_no = parentOp0Status.billing_details.reimbursement_bill_no || "";
      }

      // Sync Top-level Status & Checklist Flags
      sibling.send_for_billing = parentJob.send_for_billing;
      sibling.send_for_billing_date = parentJob.send_for_billing_date;
      sibling.vgm_done = parentJob.vgm_done;
      sibling.vgm_date = parentJob.vgm_date;
      sibling.form13_done = parentJob.form13_done;
      sibling.form13_date = parentJob.form13_date;

      const hasSiblingBillDates = Boolean(
        sibOp0.billing_details?.agency_bill_date ||
        sibOp0.billing_details?.reimbursement_bill_date
      );
      if (hasSiblingBillDates || parentJob.detailedStatus === "Billing Done") {
        sibling.detailedStatus = "Billing Done";
        sibling.status = "Completed";
      } else if (parentJob.detailedStatus) {
        sibling.detailedStatus = parentJob.detailedStatus;
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
        "operations.0.statusDetails.0.eGatePassCopyDate": sibOp0.eGatePassCopyDate,
        "operations.0.statusDetails.0.eGatePassUpload": sibOp0.eGatePassUpload,
        "operations.0.statusDetails.0.handoverForwardingNoteDate": sibOp0.handoverForwardingNoteDate,
        "operations.0.statusDetails.0.handoverConcorTharSanganaRailRoadDate": sibOp0.handoverConcorTharSanganaRailRoadDate,
        "operations.0.statusDetails.0.railOutReachedDate": sibOp0.railOutReachedDate,
        "operations.0.statusDetails.0.containerPlacementDate": sibOp0.containerPlacementDate,
        "operations.0.statusDetails.0.forwarderName": sibOp0.forwarderName,
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
