import express from "express";
import SeaPort from "../../model/Directorties/SeaPort.js";

const router = express.Router();

// GET /api/seaPorts - Get all sea ports
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { portCode: { $regex: search, $options: "i" } },
        { portName: { $regex: search, $options: "i" } },
        { uneceCode: { $regex: search, $options: "i" } },
      ];
    }

    const total = await SeaPort.countDocuments(query);
    const seaPorts = await SeaPort.find(query)
      .sort({ portCode: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: seaPorts,
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

// GET /api/seaPorts/:id - Get sea port by ID
router.get("/:id", async (req, res) => {
  try {
    const seaPort = await SeaPort.findById(req.params.id);
    if (!seaPort) {
      return res.status(404).json({ message: "Sea Port not found" });
    }
    res.json({ success: true, data: seaPort });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/seaPorts - Create new sea port
router.post("/", async (req, res) => {
  try {
    const seaPort = new SeaPort(req.body);
    const savedSeaPort = await seaPort.save();

    res.status(201).json({
      success: true,
      message: "Sea Port created successfully",
      data: savedSeaPort,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Port Code already exists",
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/seaPorts/:id - Update sea port
router.put("/:id", async (req, res) => {
  try {
    const seaPort = await SeaPort.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!seaPort) {
      return res.status(404).json({ message: "Sea Port not found" });
    }

    res.json({
      success: true,
      message: "Sea Port updated successfully",
      data: seaPort,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Port Code already exists",
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/seaPorts/:id - Delete sea port
router.delete("/:id", async (req, res) => {
  try {
    const seaPort = await SeaPort.findByIdAndDelete(req.params.id);
    if (!seaPort) {
      return res.status(404).json({ message: "Sea Port not found" });
    }
    res.json({
      success: true,
      message: "Sea Port deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
