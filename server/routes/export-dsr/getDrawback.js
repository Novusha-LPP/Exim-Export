import express from "express";
import Drawback from "../../model/export/DrawbackModel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { tariff_item } = req.query;
    const query = {};

    if (tariff_item) {
      query.tariff_item = tariff_item;
    }

    const entries = await Drawback.find(query).limit(50).lean();

    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    console.error("Error fetching Drawback entries", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
