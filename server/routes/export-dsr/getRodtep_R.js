import express from "express";
import Rodtep_R from "../../model/export/Rodtep_R.js";

const router = express.Router();

router.get("/getRodtep_R", async (req, res) => {
  try {
    const { tariff_item } = req.query;
    const query = {};

    if (tariff_item) {
      // Allow exact match for tariff item (String or Number)
      const isNum = !isNaN(tariff_item);
      if (isNum) {
        query.$or = [
          { tariff_item: tariff_item },
          { tariff_item: Number(tariff_item) },
        ];
      } else {
        query.tariff_item = tariff_item;
      }
    }

    const entries = await Rodtep_R.find(query).limit(50).lean();
    console.log(
      `getRodtep_R: Query=${JSON.stringify(query)}, Found=${entries.length}`
    );

    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    console.error("Error fetching Rodtep_R entries", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
