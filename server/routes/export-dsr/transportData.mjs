import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

/**
 * GET /api/transportData
 * Search for a job by container number or shipping bill number.
 * Returns the job number, containers list, and status.
 */
router.get("/api/transportData", async (req, res) => {
  try {
    const { containerNo, sbNo, search } = req.query;

    const query = {};

    if (containerNo && containerNo.trim()) {
      const cleanContainerNo = containerNo.trim();
      query["containers.containerNo"] = { $regex: new RegExp(cleanContainerNo, "i") };
    } else if (sbNo && sbNo.trim()) {
      const cleanSbNo = sbNo.trim();
      query.sb_no = { $regex: new RegExp(cleanSbNo, "i") };
    } else if (search && search.trim()) {
      const cleanSearch = search.trim();
      query.$or = [
        { "containers.containerNo": { $regex: new RegExp(cleanSearch, "i") } },
        { sb_no: { $regex: new RegExp(cleanSearch, "i") } }
      ];
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide a containerNo, sbNo, or search query parameter."
      });
    }

    const jobs = await ExJobModel.find(query)
      .select("job_no containers status")
      .lean();

    const formattedJobs = jobs.map(job => ({
      jobNo: job.job_no || "",
      containers: (job.containers || []).map(c => ({
        containerNo: c.containerNo || "",
        containerSize: c.containerSize || c.type || "",
        sealNo: c.sealNo || c.customSealNo || c.shippingLineSealNo || "",
        sealDate: c.sealDate || "",
      })),
      status: job.status || "Pending",
    }));

    res.json({
      success: true,
      data: formattedJobs
    });
  } catch (error) {
    console.error("Error in /api/transportData:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
