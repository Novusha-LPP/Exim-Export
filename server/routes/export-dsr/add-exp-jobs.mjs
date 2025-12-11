import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExLastJobsDate from "../../model/export/ExLastJobDate.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import mongoose from "mongoose";

const router = express.Router();

// ✅ SIMPLE APPROACH: Mirror your successful import API exactly
// ✅ BULLETPROOF: Super Simple Approach
// exportRoutes.mjs (snippet)

// Update your backend route - exportRoutes.mjs
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

      const hasIdentifier = ieCode || panNo;

      if (!exporter || !hasIdentifier || !branch_code || !transportMode) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: exporter,(IE Code or PAN), branch_code, and transportMode are required.",
        });
      }

      const currentYear = new Date().getFullYear();
      const yearFormat =
        year ||
        `${currentYear.toString().slice(-2)}-${(currentYear + 1)
          .toString()
          .slice(-2)}`;

      let newJobNo;

      // Check for manual job number
      if (job_no && job_no.length > 0) {
        // If user provides a manual job number, check if it already exists
        newJobNo = `${branch_code}/EXP/${transportMode}/${job_no}/${yearFormat}`;

        // Check if this job number already exists
        const existingJob = await ExportJobModel.findOne({
          job_no: { $regex: `^${newJobNo}$`, $options: "i" },
        });

        if (existingJob) {
          return res.status(409).json({
            success: false,
            message: `Job number ${newJobNo} already exists. Please use a different number.`,
            existingJob: {
              job_no: existingJob.job_no,
              exporter: existingJob.exporter,
              created: existingJob.createdAt,
            },
          });
        }
      } else {
        // Generate auto-incremented job number
        // Find the latest job for this branch/year/transportMode combination
        const latestJob = await ExportJobModel.findOne({
          job_no: {
            $regex: `^${branch_code}/EXP/${transportMode}/`,
            $options: "i",
          },
          year: yearFormat,
        }).sort({ createdAt: -1 });

        let nextSequence = 1;

        if (latestJob && latestJob.job_no) {
          // Extract sequence number from existing job number
          const jobNoParts = latestJob.job_no.split("/");
          const sequenceStr = jobNoParts[3]; // The sequence part (e.g., "00025")

          if (sequenceStr && /^\d+$/.test(sequenceStr)) {
            nextSequence = parseInt(sequenceStr, 10) + 1;
          } else {
            // If pattern doesn't match, count existing jobs
            const jobCount = await ExportJobModel.countDocuments({
              job_no: {
                $regex: `^${branch_code}/EXP/${transportMode}/`,
                $options: "i",
              },
              year: yearFormat,
            });
            nextSequence = jobCount + 1;
          }
        } else {
          // No jobs found for this combination, start from 1
          const jobCount = await ExportJobModel.countDocuments({
            job_no: {
              $regex: `^${branch_code}/EXP/${transportMode}/`,
              $options: "i",
            },
            year: yearFormat,
          });
          nextSequence = jobCount + 1;
        }

        const sequenceStr = nextSequence.toString().padStart(5, "0");
        newJobNo = `${branch_code}/EXP/${transportMode}/${sequenceStr}/${yearFormat}`;

        // Final check to ensure no duplicates even with auto-generation
        const duplicateCheck = await ExportJobModel.findOne({
          job_no: { $regex: `^${newJobNo}$`, $options: "i" },
        });

        if (duplicateCheck) {
          // If somehow duplicate exists, increment again
          const sequenceStr = (nextSequence + 1).toString().padStart(5, "0");
          newJobNo = `${branch_code}/EXP/${transportMode}/${sequenceStr}/${yearFormat}`;
        }
      }

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
          consignee_name: newExportJob.consignee_name,
          ieCode: newExportJob.ieCode,
          transportMode: newExportJob.transportMode,
          branch_code: newExportJob.branch_code,
          year: newExportJob.year,
        },
      });
    } catch (error) {
      console.error("Error adding export job:", error);

      // Check for duplicate key error
      if (error.code === 11000 || error.message.includes("duplicate")) {
        return res.status(409).json({
          success: false,
          message: "This job already exists. Please check the job number.",
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Internal server error.",
      });
    }
  }
);

// In your exportRoutes.mjs file, add this new route:
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

      // Validate required fields
      if (!sourceJobNo || !branch_code || !transportMode || !year) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: sourceJobNo, branch_code, transportMode, and year are required.",
        });
      }

      // Find the source job
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
      let sequenceStr;

      // Check for manual sequence input
      if (manualSequence && manualSequence.length > 0) {
        // User provided a manual sequence number
        if (!/^\d+$/.test(manualSequence)) {
          return res.status(400).json({
            success: false,
            message: "Manual sequence must contain only numbers.",
          });
        }

        // Pad with zeros to make it 5 digits
        sequenceStr = manualSequence.padStart(5, "0");
        newJobNo = `${branch_code}/EXP/${transportMode}/${sequenceStr}/${year}`;

        // Check if this job number already exists
        const existingJob = await ExportJobModel.findOne({
          job_no: { $regex: `^${newJobNo}$`, $options: "i" },
        });

        if (existingJob) {
          return res.status(409).json({
            success: false,
            message: `Job number ${newJobNo} already exists. Please use a different sequence.`,
            existingJob: {
              job_no: existingJob.job_no,
              exporter: existingJob.exporter,
            },
          });
        }
      } else {
        // Auto-generate sequence - find the highest sequence for this branch/year/transportMode
        const existingJobs = await ExportJobModel.find({
          job_no: {
            $regex: `^${branch_code}/EXP/${transportMode}/`,
            $options: "i",
          },
          year: year,
        });

        let maxSequence = 0;

        // Find the maximum sequence number
        existingJobs.forEach((job) => {
          const parts = job.job_no.split("/");
          if (parts.length >= 5) {
            const sequencePart = parts[3];
            if (/^\d+$/.test(sequencePart)) {
              const seqNum = parseInt(sequencePart, 10);
              if (seqNum > maxSequence) {
                maxSequence = seqNum;
              }
            }
          }
        });

        // Get next sequence
        const nextSequence = maxSequence + 1;
        sequenceStr = nextSequence.toString().padStart(5, "0");
        newJobNo = `${branch_code}/EXP/${transportMode}/${sequenceStr}/${year}`;

        // Double-check for duplicates
        const duplicateCheck = await ExportJobModel.findOne({
          job_no: { $regex: `^${newJobNo}$`, $options: "i" },
        });

        if (duplicateCheck) {
          // If duplicate exists (shouldn't happen), increment further
          const sequenceStr = (nextSequence + 1).toString().padStart(5, "0");
          newJobNo = `${branch_code}/EXP/${transportMode}/${sequenceStr}/${year}`;
        }
      }

      // Create a deep copy of the source job data
      const sourceData = sourceJob.toObject();

      // Remove fields that should not be copied
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

      // Reset job-specific fields for new job
      sourceData.status = "pending";
      sourceData.sb_no = "";
      sourceData.sb_date = "";
      sourceData.sb_submitted_date = "";
      sourceData.sb_status = "";

      // Add new job number and other identifiers
      const newExportJob = new ExportJobModel({
        ...sourceData,
        job_no: newJobNo,
        year: year,
        branch_code: branch_code,
        transportMode: transportMode,
        job_date: new Date().toISOString().split("T")[0], // Today's date
      });

      await newExportJob.save();

      res.status(201).json({
        success: true,
        message: "Export job copied successfully.",
        job: {
          job_no: newExportJob.job_no,
          exporter: newExportJob.exporter,
          consignee_name: newExportJob.consignee_name,
          ieCode: newExportJob.ieCode,
          transportMode: newExportJob.transportMode,
          branch_code: newExportJob.branch_code,
          year: newExportJob.year,
          status: newExportJob.status,
        },
      });
    } catch (error) {
      console.error("Error copying export job:", error);

      if (error.code === 11000 || error.message.includes("duplicate")) {
        return res.status(409).json({
          success: false,
          message: "This job number already exists. Please try again.",
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Internal server error.",
      });
    }
  }
); // Add to your exportRoutes.mjs file
router.post("/api/jobs/suggest-sequence", async (req, res) => {
  try {
    const { branch_code, transportMode, year } = req.body;

    if (!branch_code || !transportMode || !year) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Find all jobs for this branch/year/transportMode combination
    const existingJobs = await ExportJobModel.find({
      job_no: {
        $regex: `^${branch_code}/EXP/${transportMode}/`,
        $options: "i",
      },
      year: year,
    });

    let maxSequence = 0;

    // Find the maximum sequence number
    existingJobs.forEach((job) => {
      const parts = job.job_no.split("/");
      if (parts.length >= 5) {
        const sequencePart = parts[3];
        if (/^\d+$/.test(sequencePart)) {
          const seqNum = parseInt(sequencePart, 10);
          if (seqNum > maxSequence) {
            maxSequence = seqNum;
          }
        }
      }
    });

    // Suggest next sequence
    const suggestedSequence = (maxSequence + 1).toString();

    res.json({
      success: true,
      suggestedSequence: suggestedSequence,
      maxSequence: maxSequence,
      jobCount: existingJobs.length,
    });
  } catch (error) {
    console.error("Error suggesting sequence:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});
// // Add this route to your export routes file
router.delete("/api/jobs/fix-export-indexes", async (req, res) => {
  try {
    // Drop the problematic index
    await ExportJobModel.collection.dropIndex("account_fields.name_1");

    res.json({
      success: true,
      message: "Problematic index dropped successfully",
    });
  } catch (error) {
    console.error("Error dropping index:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
