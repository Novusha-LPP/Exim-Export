import express from "express";
import ExportJob from "../../model/export/ExJobModel.mjs";

const router = express.Router();

router.get("/api/dsr/consignees", async (req, res) => {
  try {
    // Dynamically calculate current and last financial year (April to March)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11, where 3 is April

    let startYear;
    if (currentMonth >= 3) {
      startYear = currentYear;
    } else {
      startYear = currentYear - 1;
    }

    const currentYearStr = `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
    const lastYearStr = `${String(startYear - 1).slice(-2)}-${String(startYear).slice(-2)}`;

    const consignees = await ExportJob.aggregate([
      {
        $match: {
          year: { $in: [lastYearStr, currentYearStr] },
        },
      },
      { $unwind: "$consignees" },
      {
        $group: {
          _id: "$consignees.consignee_name",
          consignee_name: { $first: "$consignees.consignee_name" },
          consignee_address: { $first: "$consignees.consignee_address" },
          consignee_country: { $first: "$consignees.consignee_country" },
        },
      },
      {
        $project: {
          _id: 0,
          consignee_name: 1,
          consignee_address: 1,
          consignee_country: 1,
        },
      },
      { $sort: { consignee_name: 1 } },
    ]);

    res.json({ success: true, data: consignees });
  } catch (error) {
    console.error("Error fetching consignees:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
