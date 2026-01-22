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
      const regex = new RegExp(q, "i");
      const prefixRegex = new RegExp(`^${q}`, "i");

      const pipeline = [
        {
          $match: {
            $or: [
              { hs_code: regex },
              { item_description: regex },
              { unit: regex },
            ],
          },
        },
        {
          $addFields: {
            priority: {
              $cond: {
                if: { $regexMatch: { input: "$hs_code", regex: prefixRegex } },
                then: 0,
                else: {
                  $cond: {
                    if: {
                      $regexMatch: {
                        input: "$item_description",
                        regex: prefixRegex,
                      },
                    },
                    then: 1,
                    else: 2,
                  },
                },
              },
            },
          },
        },
        { $sort: { priority: 1, hs_code: 1 } },
        { $skip: skip },
        { $limit: perPage },
        {
          $project: {
            hs_code: 1,
            item_description: 1,
            basic_duty_sch_tarrif: 1,
            unit: 1,
          },
        },
      ];

      const [items, total] = await Promise.all([
        CthExportModel.aggregate(pipeline),
        CthExportModel.countDocuments({
          $or: [
            { hs_code: regex },
            { item_description: regex },
            { unit: regex },
          ],
        }),
      ]);

      return res.json({
        success: true,
        data: items,
        pagination: {
          total,
          page: pageNum,
          limit: perPage,
          totalPages: Math.ceil(total / perPage),
        },
      });
    }

    // Default case (no search)
    const [items, total] = await Promise.all([
      CthExportModel.find(filter)
        .sort({ hs_code: 1 })
        .skip(skip)
        .limit(perPage)
        .lean()
        .select("hs_code item_description basic_duty_sch_tarrif unit"),
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
