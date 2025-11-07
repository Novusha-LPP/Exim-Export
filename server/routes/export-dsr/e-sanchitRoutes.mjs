import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
const router = express.Router();

// GET documents list for job
router.get("/api/export/eshanchit/jobs/:job_no", async (req, res) => {
  try {
    const { job_no } = req.params;
    if (!job_no)
      return res
        .status(400)
        .json({ success: false, message: "Job No is required" });

    const job = await ExportJobModel.findOne({
      job_no: { $regex: job_no, $options: "i" },
    })
      .select("export_documents job_no")
      .lean();

    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });

    // Return only job export documents from DB (may or may not contain all docs)
    // No predefined document names here
    res.json({
      success: true,
      job_no: job.job_no,
      documents: job.export_documents || [],
    });
  } catch (error) {
    console.error("Error fetching export documents:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// PATCH update a document by job_no and document_code in body (not URL)
// PATCH /api/export/eshanchit/jobs/:job_no/export-documents-bulk
router.patch(
  "/api/export/eshanchit/jobs/:job_no/export-documents",
  async (req, res) => {
    try {
      const { job_no } = req.params;
      const { documents } = req.body; // Array of docs as frontend sends

      if (!job_no) {
        return res
          .status(400)
          .json({ success: false, message: "Job No required" });
      }
      const job = await ExportJobModel.findOne({ job_no: job_no.trim() });
      if (!job)
        return res
          .status(404)
          .json({ success: false, message: "Job not found" });
      if (!Array.isArray(documents)) {
        return res
          .status(400)
          .json({ success: false, message: "documents array required" });
      }

      documents.forEach((doc) => {
        if (!doc.document_code) return;
        let idx = (job.export_documents || []).findIndex(
          (d) => d.document_code === doc.document_code
        );
        if (idx === -1) {
          job.export_documents.push(doc);
        } else {
          job.export_documents[idx] = { ...job.export_documents[idx], ...doc };
        }
      });

      await job.save();
      res.json({ success: true, message: "Documents updated" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

export default router;
