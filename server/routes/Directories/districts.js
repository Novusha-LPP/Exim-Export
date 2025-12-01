// routes/directories/districts.js
import express from "express";
import DistrictCode from "../../model/Directorties/DistrictCode.js";

const router = express.Router();

// GET all (with optional filters like stateCode / status)
router.get("/", async (req, res) => {
  try {
    const { stateCode, status, search } = req.query;

    const query = {};
    if (stateCode) query.stateCode = stateCode;
    if (status) query.status = status;

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { districtName: regex },
        { districtCode: regex },
        { stateCode: regex },
      ];
    }

    const districts = await DistrictCode.find(query).sort({
      stateCode: 1,
      districtCode: 1,
    });
    res.json(districts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single
router.get("/:id", async (req, res) => {
  try {
    const d = await DistrictCode.findById(req.params.id);
    if (!d) return res.status(404).json({ message: "Not found" });
    res.json(d);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const dist = new DistrictCode(req.body);
    const saved = await dist.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const updated = await DistrictCode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await DistrictCode.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// BULK DELETE (for parity with airline bulkDelete)
router.delete("/", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: "No ids provided" });
    }
    const result = await DistrictCode.deleteMany({ _id: { $in: ids } });
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
