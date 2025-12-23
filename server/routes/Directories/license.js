import express from "express";
import License from "../../model/Directorties/License.js";

const router = express.Router();

// GET /api/licenses - Get all licenses or search
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "", // generic search
      lic_ref_no = "", // specific field search
      type = "", // specific type search
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (type) {
      query.Type = { $regex: type, $options: "i" };
    }

    if (lic_ref_no) {
      query.lic_ref_no = { $regex: lic_ref_no, $options: "i" };
    } else if (search) {
      query.$or = [
        { lic_ref_no: { $regex: search, $options: "i" } },
        { lic_no: { $regex: search, $options: "i" } },
        { Owner: { $regex: search, $options: "i" } },
      ];
    }

    const total = await License.countDocuments(query);
    const licenses = await License.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      data: licenses,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        perPage: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/licenses/:id - Get license by ID
router.get("/:id", async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    if (!license) {
      return res.status(404).json({ message: "License not found" });
    }
    res.json({ success: true, data: license });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/licenses - Create new license (Or bulk upload)
router.post("/", async (req, res) => {
  try {
    // Check if body is array (for bulk upload) or object
    const isArray = Array.isArray(req.body);
    const data = isArray ? req.body : [req.body];

    const results = await License.insertMany(data);

    res.status(201).json({
      success: true,
      message: "License(s) created successfully",
      data: results,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
