import express from "express";
import Drawback from "../../model/export/DrawbackModel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { tariff_item, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ tariff_item: regex }, { description_of_goods: regex }];
    } else if (tariff_item) {
      query.tariff_item = tariff_item;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const total = await Drawback.countDocuments(query);
    const entries = await Drawback.find(query)
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      count: entries.length,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: entries,
    });
  } catch (err) {
    console.error("Error fetching Drawback entries", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
