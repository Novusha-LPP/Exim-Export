import express from "express";
import ExportJob from "../../model/export/ExJobModel.mjs";

const router = express.Router();

router.get("/api/dsr/consignees", async (req, res) => {
  try {
    const consignees = await ExportJob.aggregate([
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
