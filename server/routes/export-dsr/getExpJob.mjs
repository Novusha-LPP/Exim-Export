import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

router.get("/api/get-export-job/:jobNo", async (req, res) => {
  try {
    const { jobNo} = req.params;

    const job = await ExJobModel.findOne({
      job_no: jobNo,
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


export default router;