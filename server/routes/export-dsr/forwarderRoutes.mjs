import express from "express";
import ForwarderModel from "../../model/export/ForwarderModel.mjs";

const router = express.Router();

// Get all forwarders
router.get("/forwarders", async (req, res) => {
  try {
    const forwarders = await ForwarderModel.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: forwarders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new forwarder
router.post("/forwarders", async (req, res) => {
  try {
    const newForwarder = new ForwarderModel(req.body);
    const saved = await newForwarder.save();
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete forwarder
router.delete("/forwarders/:id", async (req, res) => {
  try {
    await ForwarderModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Forwarder deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
