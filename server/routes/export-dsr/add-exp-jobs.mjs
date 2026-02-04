import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExLastJobsDate from "../../model/export/ExLastJobDate.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import JobSequence from "../../model/export/JobSequence.mjs";
import { getNextJobSequence, updateJobSequenceIfHigher } from "../../utils/jobNumberGenerator.mjs";

const router = express.Router();

// Route 1: Add Manual Export Job
router.post(
  "/api/jobs/add-job-exp-man",
  auditMiddleware("ExportJob"),
  async (req, res) => {
    try {
      const {
        exporter,
        consignee_name,
        ieCode,
        job_no,
        year,
        job_date,
        transportMode,
        branch_code,
        ...otherFields
      } = req.body;

      // Basic Validation
      const hasIdentifier = ieCode || otherFields.panNo; // ieCode is primary
      if (!exporter || !branch_code || !transportMode) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: exporter, branch_code, and transportMode are required.",
        });
      }

      const currentYear = new Date().getFullYear();
      const yearFormat =
        year ||
        `${currentYear.toString().slice(-2)}-${(currentYear + 1)
          .toString()
          .slice(-2)}`;

      let newJobNo;

      if (job_no && job_no.length > 0) {
        // --- MANUAL JOB NUMBER ---
        // Validate manual input
        if (!/^\d+$/.test(job_no)) {
          return res.status(400).json({
            success: false,
            message: "Job number must contain only digits."
          });
        }

        const sequenceStr = job_no.padStart(5, "0");
        newJobNo = `${branch_code}/${sequenceStr}/${yearFormat}`;

        // Check for duplicates
        const existingJob = await ExportJobModel.findOne({
          job_no: { $regex: `^${newJobNo}$`, $options: "i" },
        });

        if (existingJob) {
          return res.status(409).json({
            success: false,
            message: `Job number ${newJobNo} already exists.`,
            existingJob: {
              job_no: existingJob.job_no,
              exporter: existingJob.exporter,
              created: existingJob.createdAt,
            },
          });
        }

        // Update the central counter if manual sequence is higher
        await updateJobSequenceIfHigher(branch_code, yearFormat, parseInt(job_no, 10));

      } else {
        // --- AUTO GENERATED JOB NUMBER ---
        // Use the centralized atomic generator
        const nextSequenceStr = await getNextJobSequence(branch_code, yearFormat);
        newJobNo = `${branch_code}/${nextSequenceStr}/${yearFormat}`;
      }

      // Date Handling
      const getTodayDate = () => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();
        return `${year}-${month}-${day}`;
      };

      const todayDate = getTodayDate();

      const newExportJob = new ExportJobModel({
        job_no: newJobNo,
        jobNumber: newJobNo, // Added for unique index consistency
        year: yearFormat,
        job_date: job_date || todayDate,
        exporter,
        consignee_name,
        ieCode,
        transportMode,
        branch_code,
        ...otherFields,
      });

      await newExportJob.save();

      // Update last job date tracker (optional but kept for legacy)
      await ExLastJobsDate.findOneAndUpdate(
        {},
        { date: todayDate },
        { upsert: true, new: true }
      );

      res.status(201).json({
        success: true,
        message: "Export job successfully created.",
        job: {
          job_no: newExportJob.job_no,
          exporter: newExportJob.exporter,
          branch_code: newExportJob.branch_code,
          year: newExportJob.year,
        },
      });

    } catch (error) {
      console.error("Error adding export job:", error);
      if (error.code === 11000 || error.message.includes("duplicate")) {
        return res.status(409).json({
          success: false,
          message: "Job number conflict detected. Please try again.",
        });
      }
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error.",
      });
    }
  }
);

// Route 2: Copy Export Job
router.post(
  "/api/jobs/copy-export-job",
  auditMiddleware("ExportJob"),
  async (req, res) => {
    try {
      const {
        sourceJobNo,
        branch_code,
        transportMode,
        year,
        manualSequence = "",
      } = req.body;

      if (!sourceJobNo || !branch_code || !transportMode || !year) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: sourceJobNo, branch_code, transportMode, and year.",
        });
      }

      // Find Source Job
      const sourceJob = await ExportJobModel.findOne({
        job_no: { $regex: `^${sourceJobNo}$`, $options: "i" },
      });

      if (!sourceJob) {
        return res.status(404).json({
          success: false,
          message: `Source job ${sourceJobNo} not found.`,
        });
      }

      let newJobNo;

      if (manualSequence && manualSequence.length > 0) {
        // Manual Sequence Logic
        if (!/^\d+$/.test(manualSequence)) {
          return res.status(400).json({
            success: false,
            message: "Manual sequence must contain only digits.",
          });
        }

        const sequenceStr = manualSequence.padStart(5, "0");
        newJobNo = `${branch_code}/${sequenceStr}/${year}`;

        const existingJob = await ExportJobModel.findOne({
          job_no: { $regex: `^${newJobNo}$`, $options: "i" },
        });

        if (existingJob) {
          return res.status(409).json({
            success: false,
            message: `Job number ${newJobNo} already exists.`,
          });
        }

        // Update counter
        await updateJobSequenceIfHigher(branch_code, year, parseInt(manualSequence, 10));

      } else {
        // Auto Generation Logic
        const nextSequenceStr = await getNextJobSequence(branch_code, year);
        newJobNo = `${branch_code}/${nextSequenceStr}/${year}`;
      }

      // Prepare New Job Data
      const sourceData = sourceJob.toObject();

      // Remove system fields and specific job data
      delete sourceData._id;
      delete sourceData.__v;
      delete sourceData.createdAt;
      delete sourceData.updatedAt;
      delete sourceData.job_no;
      delete sourceData.year;
      delete sourceData.branch_code;
      delete sourceData.transportMode;
      delete sourceData.status;
      delete sourceData.sb_no;
      delete sourceData.sb_date;
      delete sourceData.sb_submitted_date;
      delete sourceData.sb_status;
      delete sourceData.jobNumber;

      // Set new values
      const newExportJob = new ExportJobModel({
        ...sourceData,
        job_no: newJobNo,
        jobNumber: newJobNo, // Added for unique index consistency
        branch_code,
        year,
        transportMode,
        status: "Pending",
        job_date: new Date().toISOString().split("T")[0],
        milestones: [], // Reset milestones
      });

      await newExportJob.save();

      res.status(201).json({
        success: true,
        message: "Export job copied successfully.",
        job: {
          job_no: newExportJob.job_no,
          branch_code: newExportJob.branch_code,
          year: newExportJob.year,
        },
      });

    } catch (error) {
      console.error("Error copying export job:", error);
      if (error.code === 11000 || error.message.includes("duplicate")) {
        return res.status(409).json({
          success: false,
          message: "Job number conflict detected. Please try again.",
        });
      }
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error.",
      });
    }
  }
);

// Route 3: Suggest Next Sequence (for UI)
router.post("/api/jobs/suggest-sequence", async (req, res) => {
  try {
    const { branch_code, year } = req.body;

    if (!branch_code || !year) {
      return res.status(400).json({
        success: false,
        message: "Missing branch_code or year",
      });
    }

    // Get the current max sequence from our centralized counter
    const sequenceDoc = await JobSequence.findOne({
      branch: branch_code.toUpperCase(),
      year: year
    });

    const currentMax = sequenceDoc ? sequenceDoc.lastSequence : 0;
    const nextSequence = currentMax + 1;

    res.json({
      success: true,
      suggestedSequence: nextSequence.toString(),
      maxSequence: currentMax,
    });

  } catch (error) {
    console.error("Error suggesting sequence:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Route 4: Fix Index (Utility)
router.delete("/api/jobs/fix-export-indexes", async (req, res) => {
  try {
    await ExportJobModel.collection.dropIndex("account_fields.name_1");
    res.json({ success: true, message: "Problematic index dropped successfully" });
  } catch (error) {
    console.error("Error dropping index:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
