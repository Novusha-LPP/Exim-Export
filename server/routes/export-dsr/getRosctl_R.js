import express from "express";
import Rosctl_R from "../../model/export/Rosctl_R.js";
import mongoose from "mongoose";

const router = express.Router();

router.get("/getRosctl_R", async (req, res) => {
  try {
    const { tariff_item } = req.query;
    console.log(
      `Connected to DB: ${mongoose.connection.name} on ${mongoose.connection.host}`
    );
    const totalDocs = await Rosctl_R.countDocuments();
    console.log(`Total Rosctl_R docs in DB: ${totalDocs}`);
    const query = {};

    if (tariff_item) {
      const cleanItem = tariff_item.trim();
      // Use regex to match beginning of string
      query.tariff_item = { $regex: `^${cleanItem}`, $options: "i" };
    }

    const entries = await Rosctl_R.find(query).lean();
    console.log(
      `getRosctl_R: Query=${JSON.stringify(query)}, Found=${entries.length}`
    );

    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    console.error("Error fetching Rosctl_R entries", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
