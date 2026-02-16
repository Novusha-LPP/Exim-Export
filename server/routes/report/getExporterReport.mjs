import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import logger from "../../logger.js";

const router = express.Router();

// GET /api/report/exporter-reports - Fetch export job data for exporter-wise reports
router.get("/api/report/exporter-reports", async (req, res) => {
    try {
        const jobs = await ExJobModel.find({
            exporter: { $ne: null, $ne: "" },
        })
            .select(
                "job_no sb_no sb_date exporter consignmentType fine_amount fine_accountability fine_remarks"
            )
            .lean();

        // Process jobs: calculate container-like counts from operations if needed
        const reportData = jobs.map((job) => {
            return {
                _id: job._id,
                job_no: job.job_no,
                sb_no: job.sb_no,
                sb_date: job.sb_date,
                exporter: job.exporter,
                consignmentType: job.consignmentType,
                fine_amount: job.fine_amount || 0,
                fine_accountability: job.fine_accountability || "",
                fine_remarks: job.fine_remarks || "",
                // Container counts - will be populated from operations if available
                fcl20: 0,
                fcl40: 0,
                isLCL: job.consignmentType === "LCL",
            };
        });

        res.status(200).json(reportData);
    } catch (error) {
        logger.error("Error fetching exporter reports:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
