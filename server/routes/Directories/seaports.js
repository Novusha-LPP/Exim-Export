import express from "express";
import SeaPort from "../../model/Directorties/SeaPort.js";
import AirPort from "../../model/Directorties/AirPort.js";

const router = express.Router();

// GET /api/seaPorts - Get all sea ports
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = req.query.search ? 50 : 10,
      search = "",
      country = "",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { portCode: { $regex: search, $options: "i" } },
        { portName: { $regex: search, $options: "i" } },
        { uneceCode: { $regex: search, $options: "i" } },
        { country: { $regex: search, $options: "i" } },
      ];
    }

    if (country) {
      query.country = { $regex: `^${country}$`, $options: "i" };
    }

    const total = await SeaPort.countDocuments(query);
    let seaPorts = await SeaPort.find(query)
      .sort({ portCode: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // If search was performed and we have space, also supplement from AirPort
    if (search && seaPorts.length < limitNum) {
      const existingCodes = new Set(
        seaPorts.map((p) => (p.portCode || "").toUpperCase().trim())
      );
      const airPorts = await AirPort.find(query)
        .limit(limitNum - seaPorts.length)
        .lean();
      for (const ap of airPorts) {
        const code = (ap.portCode || "").toUpperCase().trim();
        if (code && !existingCodes.has(code)) {
          existingCodes.add(code);
          seaPorts.push(ap);
        }
      }
    }

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
