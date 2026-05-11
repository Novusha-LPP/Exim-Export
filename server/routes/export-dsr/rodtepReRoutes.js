import express from "express";
import Rodtep_RE from "../../model/export/rodtepReModel.js";

const router = express.Router();

// // Get Paginated Rodtep entries
// router.get("/rodtep-re", async (req, res) => {
//   try {
//     const { tariff_line, page = 1, limit = 50 } = req.query;
//     const query = {};
//     if (tariff_line) {
//       query.tariff_line = tariff_line;
//     }

//     const data = await Rodtep_RE.find(query)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .exec();

//     const count = await Rodtep_RE.countDocuments(query);

//     res.json({
//       success: true,
//       data,
//       totalPages: Math.ceil(count / limit),
//       currentPage: parseInt(page),
//       totalCount: count,
//     });
//   } catch (err) {
//     console.error("Error fetching Rodtep RE data:", err);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// });

// Search by description or tariff line
router.get("/getRodtep_RE", async (req, res) => {
  try {
    const { tariff_item, tariff_line, chapter } = req.query;
    const code = tariff_item || tariff_line;
    if (!code) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const trimmed = code.toString().trim();
    const isNum = !isNaN(trimmed);

    const query = {
      $or: [
        { tariff_item: trimmed },
        { tariff_item: { $regex: new RegExp(`^${trimmed}`) } },
      ],
    };

    if (chapter) {
      query.chapter = String(chapter).trim();
    }

    if (isNum) {
      query.$or.push({ tariff_item: Number(trimmed) });
      query.$or.push({ tariff_item: trimmed.toString() });
    }

    const entries = await Rodtep_RE.find(query).limit(50).lean();

    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    console.error("Error fetching Rodtep_RE entries:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
