import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExLastJobsDate from "../../model/export/ExLastJobDate.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import mongoose from "mongoose";

const router = express.Router();

// ✅ SIMPLE APPROACH: Mirror your successful import API exactly
// ✅ BULLETPROOF: Super Simple Approach
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
        ...otherFields
      } = req.body;

      // Validate required fields
      if (!exporter_name || !consignee_name || !ie_code) {
        return res.status(400).json({ message: "Missing required fields." });
      }

      // Validate IE Code format
      if (!/^\d{10}$/.test(ie_code)) {
        return res.status(400).json({
          message: "Invalid IE Code format. Must be 10 digits.",
        });
      }

      // Generate year format
      const currentYear = new Date().getFullYear();
      const yearFormat =
        year ||
        `${currentYear.toString().slice(-2)}-${(currentYear + 1)
          .toString()
          .slice(-2)}`;

      let newJobNo;

      if (job_no && job_no.length > 0) {
        newJobNo = `AMD/EXP/${transportMode}/${job_no}/${year}`;
      } else {
        // ✅ SUPER SIMPLE: Just count existing jobs for this year
        const jobCount = await ExportJobModel.countDocuments({
          year: yearFormat,
        });
        const nextSequence = (jobCount + 1).toString().padStart(5, "0");
        newJobNo = `AMD/EXP/${transportMode}/${nextSequence}/${year}`;
      }

      const getTodayDate = () => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();
        return `${year}-${month}-${day}`;
      };

      const todayDate = getTodayDate();

      // Create new export job entry
      const newExportJob = new ExportJobModel({
        job_no: newJobNo,
        year: yearFormat,
        job_date: job_date || todayDate,
        exporter_name,
        consignee_name,
        ie_code,
        transportMode,
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
