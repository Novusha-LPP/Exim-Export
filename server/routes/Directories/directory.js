import express from "express";
import Directory from "../../model/Directorties/Directory.js";

const router = express.Router();

// GET /api/directory - Get all directories
router.get("/api/directory", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 300,
      search = "",
      approvalStatus = "",
      entityType = "",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { organization: { $regex: search, $options: "i" } },
        { alias: { $regex: search, $options: "i" } },
        { "registrationDetails.ieCode": { $regex: search, $options: "i" } },
      ];
    }

    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (entityType) query["generalInfo.entityType"] = entityType;

    const total = await Directory.countDocuments(query);
    const directories = await Directory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      data: directories,
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

// GET /api/directory/stats - Get statistics
router.get("/api/directory/stats", async (req, res) => {
  try {
    const total = await Directory.countDocuments();
    const approved = await Directory.countDocuments({
      approvalStatus: "Approved",
    });
    const pending = await Directory.countDocuments({
      approvalStatus: "Pending",
    });
    const rejected = await Directory.countDocuments({
      approvalStatus: "Rejected",
    });

    const entityTypeStats = await Directory.aggregate([
      { $group: { _id: "$generalInfo.entityType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        overview: { total, approved, pending, rejected },
        byEntityType: entityTypeStats,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/directory/:id - Get directory by ID
router.get("/api/directory/:id", async (req, res) => {
  try {
    const directory = await Directory.findById(req.params.id);
    if (!directory) {
      return res.status(404).json({ message: "Directory not found" });
    }
    res.json({ success: true, data: directory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/directory - Create new directory
router.post("/api/directory/", async (req, res) => {
  try {
    const directory = new Directory(req.body);
    const savedDirectory = await directory.save();

    res.status(201).json({
      success: true,
      message: "Directory created successfully",
      data: savedDirectory,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        message: `${field.toUpperCase()} already exists`,
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/directory/:id - Update directory
router.put("/api/directory/:id", async (req, res) => {
  try {
    const directory = await Directory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!directory) {
      return res.status(404).json({ message: "Directory not found" });
    }

    res.json({
      success: true,
      message: "Directory updated successfully",
      data: directory,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        message: `${field.toUpperCase()} already exists`,
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/directory/:id - Delete directory
router.delete("/api/directory/:id", async (req, res) => {
  try {
    const directory = await Directory.findByIdAndDelete(req.params.id);
    if (!directory) {
      return res.status(404).json({ message: "Directory not found" });
    }
    res.json({
      success: true,
      message: "Directory deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/directory/:id/approve - Approve directory
router.put("/api/directory/:id/approve", async (req, res) => {
  try {
    const directory = await Directory.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: "Approved" },
      { new: true }
    );

    if (!directory) {
      return res.status(404).json({ message: "Directory not found" });
    }

    res.json({
      success: true,
      message: "Directory approved successfully",
      data: directory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/directory/:id/reject - Reject directory
router.put("/api/directory/:id/reject", async (req, res) => {
  try {
    const directory = await Directory.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: "Rejected" },
      { new: true }
    );

    if (!directory) {
      return res.status(404).json({ message: "Directory not found" });
    }

    res.json({
      success: true,
      message: "Directory rejected successfully",
      data: directory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/directory/update-exporter-type - Update exporter type by organization
router.patch("/api/directory/update-exporter-type", async (req, res) => {
  try {
    const { organization, exporterType } = req.body;

    if (!organization || !exporterType) {
      return res.status(400).json({
        message: "Organization and Exporter Type are required",
      });
    }

    // Find directory by organization (case-insensitive search)
    // We use a regex for case-insensitive match on the organization name
    const directory = await Directory.findOneAndUpdate(
      { organization: { $regex: new RegExp(`^${organization}$`, "i") } },
      {
        $set: {
          "generalInfo.exporterType": exporterType,
        },
      },
      { new: true }
    );

    if (!directory) {
      return res
        .status(404)
        .json({ message: "Directory not found for this exporter" });
    }

    res.json({
      success: true,
      message: "Exporter type updated successfully",
      data: directory,
    });
  } catch (error) {
    console.error("Error updating exporter type:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
