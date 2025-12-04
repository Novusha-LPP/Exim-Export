import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExLastJobsDate from "../../model/export/ExLastJobDate.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import mongoose from "mongoose";

const router = express.Router();

// ✅ SIMPLE APPROACH: Mirror your successful import API exactly
// ✅ BULLETPROOF: Super Simple Approach
// exportRoutes.mjs (snippet)

router.post(
  "/api/jobs/add-job-exp-man",
  auditMiddleware("ExportJob"),
  async (req, res) => {
    try {
      const {
        exporter_name,
        consignee_name,
        ie_code,
        job_no,
        year,
        job_date,
        transportMode,
        branch_code,          // 👈 NEW
        ...otherFields
      } = req.body;

      if (!exporter_name || !ie_code || !branch_code) {
        return res.status(400).json({ message: "Missing required fields." });
      }

      if (!/^\d{10}$/.test(ie_code)) {
        return res.status(400).json({
          message: "Invalid IE Code format. Must be 10 digits.",
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
        // manual number typed in job_no input
        newJobNo = `${branch_code}/EXP/${transportMode}/${job_no}/${yearFormat}`;
      } else {
        const jobCount = await ExportJobModel.countDocuments({
          year: yearFormat,
          branch_code,                    // optional: per-branch sequencing
        });
        const nextSequence = (jobCount + 1).toString().padStart(5, "0");
        newJobNo = `${branch_code}/EXP/${transportMode}/${nextSequence}/${yearFormat}`;
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
        exporter_name,
        consignee_name,
        ie_code,
        transportMode,
        branch_code,                     // store branch on document
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
          exporter_name: newExportJob.exporter_name,
          consignee_name: newExportJob.consignee_name,
          ie_code: newExportJob.ie_code,
          transportMode: newExportJob.transportMode,
          branch_code: newExportJob.branch_code,
        },
      });
    } catch (error) {
      console.error("Error adding export job:", error);
      res.status(500).json({
        message: error.message || "Internal server error.",
      });
    }
  }
);

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
