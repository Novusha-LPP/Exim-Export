// routes/cth.routes.js
import express from "express";
import CthExportModel from "../../model/export/CthExport.js";

const router = express.Router();

// GET /api/cth
// Supports: ?search=TEXT&limit=20&page=1
router.get("/", async (req, res) => {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100); // cap at 100
    const skip = (pageNum - 1) * perPage;

    const filter = {};

    if (search && search.trim()) {
      const q = search.trim();

      // If you have a text index on hs_code + item_description, use $text:
      // filter.$text = { $search: q };

      // If not, fall back to prefix regex on indexed fields
      filter.$or = [
        { hs_code: { $regex: `^${q}`, $options: "i" } },
        { item_description: { $regex: q, $options: "i" } },
        { unit: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      CthExportModel.find(filter)
        .sort({ hs_code: 1 })
        .skip(skip)
        .limit(perPage)
        .lean()
        .select("hs_code item_description basic_duty_sch_tarrif unit"), // only fields needed by UI
      CthExportModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: pageNum,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (err) {
    console.error("Error fetching CTH list", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
