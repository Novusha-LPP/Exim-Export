// routes/exportJobs.js
import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

// Get export job details
router.get("/:year/:job_no", async (req, res) => {
  try {
    const { year, job_no } = req.params;

    const exportJob = await ExJobModel.findOne({
      year: year,
      job_no: job_no,
    });

    if (!exportJob) {
      return res.status(404).json({ message: "Export job not found" });
    }

    res.json(exportJob);
  } catch (error) {
    console.error("Error fetching export job:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update export job
router.put("/:year/:job_no", auditMiddleware("Job"), async (req, res) => {
  
  try {
    const { year, job_no } = req.params;
    const updateData = req.body;

    // Add update timestamp
    updateData.updatedAt = new Date();

    const updatedExportJob = await ExJobModel.findOneAndUpdate(
      { year: year,
       job_no: { $regex: job_no, $options: "i" } },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!updatedExportJob) {
      return res.status(404).json({ message: "Export job not found" });
    }

    res.json({
      message: "Export job updated successfully",
      data: updatedExportJob,
    });
  } catch (error) {
    console.error("Error updating export job:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// Update specific fields
router.patch(
  "/:year/:job_no/fields",
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const { year, job_no } = req.params;
      const { fieldUpdates } = req.body;

      const updateObject = {};
      fieldUpdates.forEach(({ field, value }) => {
        updateObject[field] = value;
      });
      updateObject.updatedAt = new Date();

      const updatedExportJob = await ExJobModel.findOneAndUpdate(
        { year: year, job_no: job_no },
        { $set: updateObject },
        { new: true }
      );

      if (!updatedExportJob) {
        return res.status(404).json({ message: "Export job not found" });
      }

      res.json({
        message: "Fields updated successfully",
        updatedFields: Object.keys(updateObject),
        data: updatedExportJob,
      });
    } catch (error) {
      console.error("Error updating export job fields:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update documents
router.put(
  "/:year/:job_no/documents",
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const { year, job_no } = req.params;
      const { export_documents } = req.body;

      const updatedExportJob = await ExJobModel.findOneAndUpdate(
        { year: year, job_no: job_no },
        {
          $set: {
            export_documents: export_documents,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!updatedExportJob) {
        return res.status(404).json({ message: "Export job not found" });
      }

      res.json({
        message: "Documents updated successfully",
        data: updatedExportJob,
      });
    } catch (error) {
      console.error("Error updating export documents:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update containers
router.put(
  "/:year/:job_no/containers",
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const { year, job_no } = req.params;
      const { containers } = req.body;

      const updatedExportJob = await ExJobModel.findOneAndUpdate(
        { year: year, job_no: job_no },
        {
          $set: {
            containers: containers,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!updatedExportJob) {
        return res.status(404).json({ message: "Export job not found" });
      }

      res.json({
        message: "Containers updated successfully",
        data: updatedExportJob,
      });
    } catch (error) {
      console.error("Error updating containers:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
