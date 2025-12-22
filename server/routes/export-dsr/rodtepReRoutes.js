import express from "express";
import Rodtep_RE from "../../model/export/rodtepReModel.js";

const router = express.Router();

// Get Paginated Rodtep entries
router.get("/rodtep-re", async (req, res) => {
  try {
    const { tariff_line, page = 1, limit = 50 } = req.query;
    const query = {};
    if (tariff_line) {
      query.tariff_line = tariff_line;
    }

    const data = await Rodtep_RE.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .exec();

    const count = await Rodtep_RE.countDocuments(query);

    res.json({
      success: true,
      data,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalCount: count,
    });
  } catch (err) {
    console.error("Error fetching Rodtep RE data:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Search by description or tariff line
router.get("/rodtep-re/search", async (req, res) => {
  try {
    const { q } = req.query; // search query
    if (!q)
      return res
        .status(400)
        .json({ success: false, message: "Query required" });

    const conditions = [
      { description: { $regex: q, $options: "i" } },
      { tariff_line: { $regex: q, $options: "i" } },
    ];

    if (!isNaN(q)) {
      conditions.push({ tariff_line: Number(q) });
    }

    const data = await Rodtep_RE.find({
      $or: conditions,
    }).limit(50);

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("Error searching Rodtep RE data:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
