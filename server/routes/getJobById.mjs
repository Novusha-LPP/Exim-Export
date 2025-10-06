import express from "express";
import JobModel from "../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-job-by-id/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const job = await JobModel.findOne({ _id }).lean(); // Using .lean() for better performance

    if (!job) {
      return res.status(404).send({ error: "Job not found" });
    }

    res.status(200).send({
      job,
      container_nos: job.container_nos || [], // Ensuring container_nos is returned
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;
