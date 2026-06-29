import express from "express";
import ForwarderModel from "../../model/export/ForwarderModel.mjs";

const router = express.Router();

// Get all forwarders (with optional pagination and search)
router.get("/forwarders", async (req, res) => {
  try {
    const {
      page,
      limit = 10,
      search = "",
      active = ""
    } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { "branches.city": { $regex: search, $options: "i" } },
        { "branches.gst": { $regex: search, $options: "i" } },
        { "branches.pan": { $regex: search, $options: "i" } }
      ];
    }

    if (active) query.active = active;

    // If no page is provided, return all matching (non-paginated)
    if (!page) {
      const forwarders = await ForwarderModel.find(query).sort({ name: 1 });
      return res.status(200).json({ success: true, data: forwarders });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await ForwarderModel.countDocuments(query);
    const forwarders = await ForwarderModel.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: forwarders,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        perPage: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get forwarder by ID
router.get("/forwarders/:id", async (req, res) => {
  try {
    const forwarder = await ForwarderModel.findById(req.params.id);
    if (!forwarder) {
      return res.status(404).json({ success: false, message: "Forwarder not found" });
    }
    res.status(200).json({ success: true, data: forwarder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new forwarder
router.post("/forwarders", async (req, res) => {
  try {
    const forwarder = new ForwarderModel(req.body);
    const saved = await forwarder.save();
    res.status(201).json({
      success: true,
      message: "Forwarder created successfully",
      data: saved
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Forwarder with this name already exists"
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update forwarder
router.put("/forwarders/:id", async (req, res) => {
  try {
    const forwarder = await ForwarderModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!forwarder) {
      return res.status(404).json({ success: false, message: "Forwarder not found" });
    }
    res.status(200).json({
      success: true,
      message: "Forwarder updated successfully",
      data: forwarder
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Forwarder with this name already exists"
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete forwarder
router.delete("/forwarders/:id", async (req, res) => {
  try {
    const forwarder = await ForwarderModel.findByIdAndDelete(req.params.id);
    if (!forwarder) {
      return res.status(404).json({ success: false, message: "Forwarder not found" });
    }
    res.status(200).json({
      success: true,
      message: "Forwarder deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
