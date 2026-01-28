import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

router.get("/api/get-exporter-list/:year", async (req, res) => {
  try {
    const selectedYear = req.params.year;

    // Use Mongoose aggregation to group and retrieve unique exporter and exporterURL values
    const uniqueExporters = await ExJobModel.aggregate([
      {
        $match: { year: selectedYear }, // Filter documents by year
      },
      {
        $group: {
          _id: { exporter: "$exporter", exporterURL: "$exporterURL" },
        },
      },
      {
        $project: {
          _id: 0, // Exclude the default _id field
          exporter: "$_id.exporter",
          exporterURL: "$_id.exporterURL",
        },
      },
      {
        $sort: {
          exporter: 1, // Sort exporter in ascending order (alphabetical)
        },
      },
    ]);

    res.status(200).json(uniqueExporters);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching exporters.");
  }
});

router.get("/api/exporter-list", async (req, res) => {
  try {
    const exporters = await ExJobModel.distinct("exporter");
    res.status(200).json({ success: true, data: exporters.filter(Boolean) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch exporter list" });
  }
});

export default router;
