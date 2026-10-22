import express from "express";
import axios from "axios";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import UserModel from "../../model/userModel.mjs";
import { detectSbOrSealChange } from "../../utils/sbSealChangeDetector.mjs";
import {
  escapeRegex,
  isFreightForwardingJob,
  hasClubBillingDate,
  isBillingOnlyUpdate,
  syncToClientDatabase,
  extractJobNoFromPath,
  findJobByJobNoOrEnquiry,
  validateSendForBilling,
  applyParentDatesIfChild,
  syncClubFields,
  isLikelyJobNumber,
} from "./exportJobHelpers.mjs";
import { populateJobSubcollections, syncJobSubcollections } from "../../services/export-jobs/subcollectionSyncService.mjs";
import jobQueryRoutes from "./jobQueryRoutes.mjs";
import impexcubeRoutes from "./impexcubeRoutes.mjs";
import jobLockRoutes from "./jobLockRoutes.mjs";
import Directory from "../../model/Directorties/Directory.js";

const router = express.Router();

// Mount modular sub-routers (queries, ERP integration, and concurrency locks)
router.use(jobQueryRoutes);
router.use(impexcubeRoutes);
router.use(jobLockRoutes);


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



router.get("/:job_no(.*)", async (req, res, next) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    // Robust check for Export / FF Job Number format (e.g., BRANCH/EXP/MODE/SEQ/YEAR)
    // Prevents wildcard route from intercepting other API request paths
    if (!isLikelyJobNumber(job_no)) {
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
    jobData = await populateJobSubcollections(jobData);

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

      // Collect child container IDs & signatures
      const childContainerIds = new Set();
      const childContainerSignatures = new Set();

      // 1. Process each Child Job's containers
      for (const j of childJobs) {
        const inv = j.invoices?.[0] || {};
        const op = j.operations?.[0] || {};
        const st = op.statusDetails?.[0] || {};
        const product = inv.products?.[0] || {};
        const hsnList = [...new Set((inv.products || []).map(p => p.hsn_code || p.hsnCode || p.hsn || (p.ritc?.hsnCode || p.ritc?.ritcCode || p.ritc)).filter(Boolean))].join(", ");
        const containersToUse = (j.containers && j.containers.length > 0) ? j.containers : (op.containerDetails || []);

        for (const c of containersToUse) {
          if (c._id) childContainerIds.add(String(c._id));
          const cNo = String(c.containerNo || c.container_number || "").trim().toUpperCase();
          const pkgs = Number(c.pkgsStuffed || 0);
          const weight = Number(c.grossWeight || 0);
          if (cNo) childContainerSignatures.add(`${cNo}_${pkgs}_${weight}`);

          mergedContainers.push({
            ...c,
            pkgsStuffed: (c.pkgsStuffed !== undefined && c.pkgsStuffed !== null && c.pkgsStuffed !== 0) ? c.pkgsStuffed : Number(j.total_no_of_pkgs || 0),
            grossWeight: (c.grossWeight !== undefined && c.grossWeight !== null && c.grossWeight !== 0) ? c.grossWeight : Number(j.gross_weight_kg || 0),
            _sourceJobNo: j.job_no,
            _sourceSbNo: j.custom_house_details?.shipping_bill_no || j.sb_no || j.shippingBillNo,
            _sourceSbDate: j.custom_house_details?.sb_date || j.sb_date,
            _sourceInvoiceNumber: inv.invoiceNumber,
            _sourceInvoiceValue: inv.invoiceValue,
            _sourceLeoDate: st.leoDate,
            _sourceDescription: product.description || j.descriptionOfGoods || j.description,
            _sourceHsnList: hsnList || j.custom_house_details?.hsn_code || j.hsn,
            _sourceFobValue: inv.freightInsuranceCharges?.fobValue?.amount || ""
          });
        }
      }

      // 2. Add Parent Job's own container entries
      const parentInv = exportJob.invoices?.[0] || {};
      const parentOp = exportJob.operations?.[0] || {};
      const parentSt = parentOp.statusDetails?.[0] || {};
      const parentProduct = parentInv.products?.[0] || {};
      const parentHsnList = [...new Set((parentInv.products || []).map(p => p.hsn_code || p.hsnCode || p.hsn || (p.ritc?.hsnCode || p.ritc?.ritcCode || p.ritc)).filter(Boolean))].join(", ");

      const rawParentContainers = (jobData.containers && jobData.containers.length > 0)
        ? jobData.containers
        : (parentOp.containerDetails || []);

      // Filter out any leaked child containers from parent containers array
      const parentOwnContainers = rawParentContainers.filter(c => {
        const cId = c._id ? String(c._id) : "";
        if (cId && childContainerIds.has(cId)) return false;
        const cNo = String(c.containerNo || c.container_number || "").trim().toUpperCase();
        const pkgs = Number(c.pkgsStuffed || 0);
        const weight = Number(c.grossWeight || 0);
        const sig = `${cNo}_${pkgs}_${weight}`;
        if (cNo && childContainerSignatures.has(sig)) return false;
        return true;
      });

      const parentMerged = parentOwnContainers.map(c => ({
        ...c,
        pkgsStuffed: (c.pkgsStuffed !== undefined && c.pkgsStuffed !== null && c.pkgsStuffed !== 0) ? c.pkgsStuffed : Number(exportJob.total_no_of_pkgs || 0),
        grossWeight: (c.grossWeight !== undefined && c.grossWeight !== null && c.grossWeight !== 0) ? c.grossWeight : Number(exportJob.gross_weight_kg || 0),
        vgmWtInvoice: (c.vgmWtInvoice !== undefined && c.vgmWtInvoice !== null && c.vgmWtInvoice !== 0) ? c.vgmWtInvoice : Number(exportJob.gross_weight_kg || 0),
        _sourceJobNo: exportJob.job_no,
        _sourceSbNo: exportJob.custom_house_details?.shipping_bill_no || exportJob.sb_no || exportJob.shippingBillNo,
        _sourceSbDate: exportJob.custom_house_details?.sb_date || exportJob.sb_date,
        _sourceInvoiceNumber: parentInv.invoiceNumber,
        _sourceInvoiceValue: parentInv.invoiceValue,
        _sourceLeoDate: parentSt.leoDate,
        _sourceDescription: parentProduct.description || exportJob.descriptionOfGoods || exportJob.description,
        _sourceHsnList: parentHsnList || exportJob.custom_house_details?.hsn_code || exportJob.hsn,
        _sourceFobValue: parentInv.freightInsuranceCharges?.fobValue?.amount || ""
      }));

      mergedContainers.unshift(...parentMerged);

      jobData.mergedContainers = mergedContainers;
      jobData.containers = parentOwnContainers;

      // Keep parent job's own invoices as plain objects (do NOT merge child jobs' invoices into parent job)
      jobData.invoices = (jobData.invoices || []).map(inv => {
        const plain = typeof inv.toObject === "function" ? inv.toObject() : (inv._doc ? { ...inv._doc } : { ...inv });
        delete plain.__parentArray;
        delete plain.$__parent;
        delete plain._doc;
        delete plain.__index;
        delete plain.$__;
        delete plain.$isNew;
        return { ...plain, _sourceJobNo: exportJob.job_no };
      }).filter(Boolean);
      jobData.operations = [jobData.operations?.[0] || {}, ...childJobs.flatMap(j => j.operations || [])].filter(Boolean);
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

        if (existingJob.send_for_billing && !isAdmin && !isFreightForwardingJob(existingJob)) {
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

        if (existingJob.send_for_billing && !isAdmin && !isFreightForwardingJob(existingJob)) {
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
          if (c._sourceJobNo && String(c._sourceJobNo).toUpperCase() !== String(job_no).toUpperCase()) {
            return false;
          }
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
      await syncJobSubcollections(updatedExportJob.job_no, { containers }, updatedExportJob._id);

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



router.put("/:job_no(.*)", auditMiddleware("Job"), async (req, res, next) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    // Robust check for Export / FF Job Number format (e.g., BRANCH/EXP/MODE/SEQ/YEAR)
    if (!isLikelyJobNumber(job_no)) {
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

      if (existingJob.send_for_billing && !isAdmin && !isFreightForwardingJob(existingJob)) {
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

    // Verify exporter is approved if being updated
    if (
      updateData.exporter &&
      (!existingJob || updateData.exporter.trim().toLowerCase() !== (existingJob.exporter || "").trim().toLowerCase())
    ) {
      const orgDoc = await Directory.findOne({
        directoryName: { $regex: `^${escapeRegex(updateData.exporter.trim())}$`, $options: "i" },
        approvalStatus: "Approved",
      }).lean();

      if (!orgDoc) {
        return res.status(403).json({
          message: `Cannot assign organization '${updateData.exporter}'. Only Approved organizations can be assigned to jobs. Approval from HOD or Admin is required.`,
        });
      }
    }

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

      // If updating a club parent job, prevent saving child jobs' containers into the parent job document
      if (existingJob.is_club_job_parent && Array.isArray(updateData.containers)) {
        const childJobs = await ExJobModel.find({ job_no: { $in: existingJob.clubbed_jobs, $ne: existingJob.job_no } }).lean();
        const childContainerIds = new Set();
        const childContainerSignatures = new Set();
        for (const j of childJobs) {
          for (const c of (j.containers || [])) {
            if (c._id) childContainerIds.add(String(c._id));
            const cNo = String(c.containerNo || c.container_number || "").trim().toUpperCase();
            const pkgs = Number(c.pkgsStuffed || 0);
            const weight = Number(c.grossWeight || 0);
            if (cNo) childContainerSignatures.add(`${cNo}_${pkgs}_${weight}`);
          }
        }

        let parentOnlyContainers = updateData.containers.filter((c) => {
          if (c._sourceJobNo && String(c._sourceJobNo).toUpperCase() !== String(job_no).toUpperCase()) {
            return false;
          }
          const cId = c._id ? String(c._id) : "";
          if (cId && childContainerIds.has(cId)) return false;
          const cNo = String(c.containerNo || c.container_number || "").trim().toUpperCase();
          const pkgs = Number(c.pkgsStuffed || 0);
          const weight = Number(c.grossWeight || 0);
          const sig = `${cNo}_${pkgs}_${weight}`;
          if (cNo && childContainerSignatures.has(sig)) return false;
          return true;
        });

        const seenContNos = new Set();
        parentOnlyContainers = parentOnlyContainers.filter((c) => {
          const cNo = String(c.containerNo || c.container_number || "").trim().toUpperCase();
          if (!cNo) return true;
          if (seenContNos.has(cNo)) return false;
          seenContNos.add(cNo);
          return true;
        });
        updateData.containers = parentOnlyContainers;
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

    await syncJobSubcollections(updatedExportJob.job_no, updateData, updatedExportJob._id);

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

        if (existingJob.send_for_billing && !isAdmin && !isFreightForwardingJob(existingJob)) {
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

        if (existingJob.send_for_billing && !isAdmin && !isFreightForwardingJob(existingJob)) {
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

      await syncJobSubcollections(updatedExportJob.job_no, updateObject, updatedExportJob._id);

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
