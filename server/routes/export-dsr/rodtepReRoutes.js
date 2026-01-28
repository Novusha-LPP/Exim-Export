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
    const { tariff_line } = req.query;
    if (!tariff_line) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const trimmed = tariff_line.toString().trim();
    const isNum = !isNaN(trimmed);

    // Build a query that handles both String and Number types
    // and supports regex for partial matches if it's a string
    const query = {
      $or: [
        { tariff_line: trimmed },
        { tariff_line: { $regex: new RegExp(`^${trimmed}`) } }
      ]
    };

    if (isNum) {
      query.$or.push({ tariff_line: Number(trimmed) });
      query.$or.push({ tariff_line: trimmed.toString() });
    }

    console.log("Searching Rodtep_RE with query:", JSON.stringify(query));

    const entries = await Rodtep_RE.find(query).limit(50).lean();
    console.log(`Found ${entries.length} entries for ${trimmed}`);

    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    console.error("Error fetching Rodtep_RE entries:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
