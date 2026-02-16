import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import logger from "../../logger.js";

const router = express.Router();

// GET /api/report/billing-pending?year=25-26
router.get("/api/report/billing-pending", async (req, res) => {
  try {
    // Get year from query params, default to "25-26" if not provided
    const year = req.query.year || "25-26";

    // For export jobs, detailedStatus is an array of strings
    // We match jobs where detailedStatus array contains "Billing Pending"
    const result = await ExJobModel.aggregate([
      {
        $match: {
          year: year,
          detailedStatus: { $in: ["Billing Pending"] }
        }
      },
      {
        $facet: {
          totalCount: [
            { $count: "count" }
          ],
          results: [
            {
              $project: {
                _id: 0,
                job_no: 1,
                exporter: 1,
                status: 1,
                detailedStatus: 1,
                year: 1,
                sb_no: 1,
                sb_date: 1,
                custom_house: 1,
                consignmentType: 1,
              }
            }
          ],
          exporterCount: [
            {
              $group: {
                _id: "$exporter",
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                exporter: "$_id",
                count: 1
              }
            }
          ]
        }
      }
    ]);

    const [data] = result;

    res.status(200).json({
      count: data.totalCount[0]?.count || 0,
      exporterCount: data.exporterCount,
      results: data.results
    });

  } catch (error) {
    logger.error("Error generating billing pending report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
