import express from "express";
import Rodtep_R from "../../model/export/Rodtep_R.js";

const router = express.Router();

router.get("/getRodtep_R", async (req, res) => {
  try {
    const { tariff_item } = req.query;
    if (!tariff_item) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const trimmed = tariff_item.toString().trim();
    const isNum = !isNaN(trimmed);

    const query = {
      $or: [
        { tariff_item: trimmed },
        { tariff_item: { $regex: new RegExp(`^${trimmed}`) } },
      ],
    };

    if (isNum) {
      query.$or.push({ tariff_item: Number(trimmed) });
    }

    const entries = await Rodtep_R.find(query).limit(50).lean();

    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    console.error("Error fetching Rodtep_R entries:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
