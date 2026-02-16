import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import logger from "../../logger.js";

const router = express.Router();

// GET /api/report/fine - Get all fine records from the fines array in export jobs
router.get("/api/report/fine", async (req, res) => {
    try {
        const { year, month, filterType } = req.query;

        // Build match conditions
        const matchConditions = {
            "fines.0": { $exists: true }, // Jobs that have at least one fine entry
        };

        if (year) {
            matchConditions.year = year;
        }

        const jobs = await ExJobModel.find(matchConditions)
            .select("job_no exporter sb_no sb_date fines")
            .sort({ job_no: 1 })
            .lean();

        // Flatten: one row per fine entry
        let rows = [];
        jobs.forEach((job) => {
            (job.fines || []).forEach((fine) => {
                rows.push({
                    _id: fine._id,
                    jobId: job._id,
                    job_no: job.job_no,
                    exporter: job.exporter,
                    sb_no: job.sb_no,
                    sb_date: job.sb_date,
                    fineType: fine.fineType || "",
                    accountability: fine.accountability || "",
                    amount: fine.amount || 0,
                    remarks: fine.remarks || "",
                });
            });
        });

        // Apply month filter on sb_date
        if (filterType === "month" && month) {
            const monthInt = parseInt(month);
            rows = rows.filter((row) => {
                if (!row.sb_date) return false;
                try {
                    // Handle both YYYY-MM-DD and DD-MM-YYYY
                    let date;
                    if (/^\d{4}-\d{2}-\d{2}/.test(row.sb_date)) {
                        date = new Date(row.sb_date);
                    } else if (/^\d{2}-\d{2}-\d{4}/.test(row.sb_date)) {
                        const [dd, mm, yyyy] = row.sb_date.split("-");
                        date = new Date(`${yyyy}-${mm}-${dd}`);
                    } else {
                        date = new Date(row.sb_date);
                    }
                    return date.getMonth() + 1 === monthInt;
                } catch {
                    return false;
                }
            });
        }

        // Calculate stats
        const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

        res.status(200).json({
            success: true,
            data: rows,
            count: rows.length,
            totalAmount,
        });
    } catch (error) {
        logger.error("Error fetching fine report:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching fine report",
            error: error.message,
        });
    }
});

export default router;
