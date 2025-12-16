import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

// GET /api/exports - List all exports with pagination & filtering
// Updated exports API with status filtering
// If jobTracking is enabled and all milestones are completed, status is treated as "completed"
router.get("/api/exports/:status?", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      exporter = "",
      country = "",
      consignmentType = "",
      branch = "",
      status = "all",
      year = "",
    } = { ...req.params, ...req.query };

    const filter = {};

    // Initialize $and array for complex queries
    if (!filter.$and) filter.$and = [];

    // Status filtering logic with job tracking consideration
    // Job is considered "completed" if:
    // 1. Explicit status is "completed", OR
    // 2. jobTracking is enabled (regardless of milestone status)
    if (status && status.toLowerCase() !== "all") {
      const statusLower = status.toLowerCase();

      if (statusLower === "pending") {
        // Pending: Status is pending or not set, AND jobTracking is disabled
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            // Exclude jobs where jobTracking is enabled
            {
              $or: [
                { isJobtrackingEnabled: false },
                { isJobtrackingEnabled: { $exists: false } },
              ],
            },
          ],
        });
      } else if (statusLower === "completed") {
        // Completed: Explicit status is completed OR jobTracking is enabled
        filter.$and.push({
          $or: [
            { status: { $regex: "^completed$", $options: "i" } },
            // If jobTracking is enabled, show in completed tab
            { isJobtrackingEnabled: true },
          ],
        });
      } else if (statusLower === "cancelled") {
        filter.$and.push({
          $or: [
            { status: { $regex: "^cancelled$", $options: "i" } },
            // If jobTracking is enabled, show in completed tab
            { isJobCanceled: true },
          ],
        });
      } else {
        filter.$and.push({
          status: { $regex: `^${status}$`, $options: "i" },
        });
      }
    }

    // Search filter
    if (search) {
      filter.$and.push({
        $or: [
          { job_no: { $regex: search, $options: "i" } },
          { exporter: { $regex: search, $options: "i" } },
          { consignee_name: { $regex: search, $options: "i" } },
          { ieCode: { $regex: search, $options: "i" } },
        ],
      });
    }

    // Additional filters
    if (exporter) {
      filter.$and.push({
        exporter: { $regex: exporter, $options: "i" },
      });
    }

    if (country) {
      filter.$and.push({
        destination_country: { $regex: country, $options: "i" },
      });
    }

    if (consignmentType) {
      filter.$and.push({
        consignmentType: consignmentType,
      });
    }
    if (branch) {
      filter.$and.push({
        branch_code: { $regex: `^${branch}$`, $options: "i" },
      });
    }

    // Year filter - extract from job_no (format: BRANCH/EXP/MODE/SEQ/YEAR)
    if (year) {
      filter.$and.push({
        job_no: { $regex: `/${year}$`, $options: "i" },
      });
    }

    // Remove empty $and array if no conditions were added
    if (filter.$and && filter.$and.length === 0) {
      delete filter.$and;
    }

    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [jobs, totalCount] = await Promise.all([
      ExportJobModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExportJobModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasNextPage: page < Math.ceil(totalCount / parseInt(limit)),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching export jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching export jobs",
      error: error.message,
    });
  }
});

// POST /api/exports - Create new export job
router.post("/exports", async (req, res) => {
  try {
    const newJob = new ExportJobModel(req.body);
    const savedJob = await newJob.save();
    res.status(201).json({ success: true, data: savedJob });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating job",
      error: error.message,
    });
  }
});

router.get("/:job_no*", async (req, res) => {
  try {
    const raw = req.params.job_no || ""; // "AMD/EXP/SEA/00002/25-26"
    const job_no = decodeURIComponent(raw);

    const exportJob = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
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

// Update export job (full)
router.put("/:job_no*", auditMiddleware("Job"), async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    const updateData = { ...req.body, updatedAt: new Date() };

    const updatedExportJob = await ExJobModel.findOneAndUpdate(
      { job_no: { $regex: `^${job_no}$`, $options: "i" } },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedExportJob) {
      return res.status(404).json({ message: "Export job not found" });
    }

    await updatedExportJob.save(); // This WILL trigger pre-save
    res.json({
      message: "Export job updated successfully",
      data: updatedExportJob,
    });
  } catch (error) {
    console.error("Error updating export job:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PATCH fields
router.patch("/:job_no*/fields", auditMiddleware("Job"), async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    const { fieldUpdates } = req.body;
    const updateObject = {};
    (fieldUpdates || []).forEach(({ field, value }) => {
      updateObject[field] = value;
    });
    updateObject.updatedAt = new Date();

    const updatedExportJob = await ExJobModel.findOneAndUpdate(
      { job_no: { $regex: `^${job_no}$`, $options: "i" } },
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
});

// PUT documents
router.put("/:job_no*/documents", auditMiddleware("Job"), async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    const { export_documents } = req.body;

    const updatedExportJob = await ExJobModel.findOneAndUpdate(
      { job_no: { $regex: `^${job_no}$`, $options: "i" } },
      { $set: { export_documents, updatedAt: new Date() } },
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
});

// PUT containers
router.put("/:job_no*/containers", auditMiddleware("Job"), async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    const { containers } = req.body;

    const updatedExportJob = await ExJobModel.findOneAndUpdate(
      { job_no: { $regex: `^${job_no}$`, $options: "i" } },
      { $set: { containers, updatedAt: new Date() } },
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
});

export default router;
