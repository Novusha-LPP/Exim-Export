import express from "express";
import RodtepEntry from "../../model/export/RodtepEntry.js";

const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const entries = await RodtepEntry.find().lean();
    res.json({ success: true, data: entries });
  } catch (err) {
    console.error("Error fetching RODTEP entries", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
