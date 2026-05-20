import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

// Helper function to map a DB job to the API response structure
const mapJob = (job) => {
  const containers = (job.containers || []).map((c) => ({
    containerNo: c.containerNo || "",
    containerSize: c.containerSize || c.type || "",
    sealNo: c.sealNo || c.customSealNo || "",
    sealDate: c.sealDate || "",
  }));

  return {
    jobNo: job.job_no,
    ieCode: job.ieCode || "",
    noOfContainers: containers.length,
    containers,
    jobDate: job.job_date || "",
  };
};

/**
 * GET /api/job-info
 * Returns all jobs in the DB.
 */
router.get("/api/job-info", async (req, res) => {
  try {
    const jobs = await ExJobModel.find({})
      .select("job_no ieCode containers job_date")
      .lean();

    const formattedJobs = jobs.map(mapJob);

    res.json({
      success: true,
      data: formattedJobs,
    });
  } catch (error) {
    console.error("Error in /api/job-info (all):", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/job-info/:job_no
 * Returns job summary for a specific job, or all jobs if :job_no is "all".
 */
router.get("/api/job-info/:job_no", async (req, res) => {
  try {
    const jobNo = decodeURIComponent(req.params.job_no);

    if (jobNo.toLowerCase() === "all") {
      const jobs = await ExJobModel.find({})
        .select("job_no ieCode containers job_date")
        .lean();

      const formattedJobs = jobs.map(mapJob);

      return res.json({
        success: true,
        data: formattedJobs,
      });
    }

    const job = await ExJobModel.findOne({ job_no: jobNo })
      .select("job_no ieCode containers job_date")
      .lean();

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({
      success: true,
      data: mapJob(job),
    });
  } catch (error) {
    console.error("Error in /api/job-info by job_no:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
