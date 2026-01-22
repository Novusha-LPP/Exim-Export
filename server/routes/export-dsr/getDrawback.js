import express from "express";
import Drawback from "../../model/export/DrawbackModel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { tariff_item, search, page = 1, limit = 20 } = req.query;
    const query = {};

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    if (search) {
      const q = search.trim();
      const regex = new RegExp(q, "i");
      const prefixRegex = new RegExp(`^${q}`, "i");

      const pipeline = [
        {
          $match: {
            $or: [{ tariff_item: regex }, { description_of_goods: regex }],
          },
        },
        {
          $addFields: {
            priority: {
              $cond: {
                if: {
                  $regexMatch: { input: "$tariff_item", regex: prefixRegex },
                },
                then: 0,
                else: 2,
              },
            },
          },
        },
        { $sort: { priority: 1, tariff_item: 1 } },
        { $skip: skip },
        { $limit: limitNum },
      ];

      const [entries, total] = await Promise.all([
        Drawback.aggregate(pipeline),
        Drawback.countDocuments({
          $or: [{ tariff_item: regex }, { description_of_goods: regex }],
        }),
      ]);

      return res.json({
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
    }

    if (tariff_item) {
      query.tariff_item = tariff_item;
    }

    const total = await Drawback.countDocuments(query);
    const entries = await Drawback.find(query)
      .sort({ tariff_item: 1 })
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
