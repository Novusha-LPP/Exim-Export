import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

// GET /api/dashboard-stats - Get dashboard statistics
router.get("/dashboard-stats", async (req, res) => {
  try {
    const {
      exporter = "",
      consignmentType = "",
      branch = "",
      year = "",
    } = req.query;

    const matchStage = {};

    // 1. Build Match Stage (Filtering)
    if (exporter) matchStage.exporter = { $regex: exporter, $options: "i" };
    if (consignmentType) matchStage.consignmentType = consignmentType;
    if (branch)
      matchStage.branch_code = { $regex: `^${branch}$`, $options: "i" };

    // Year filter - strict matching on the job_no suffix or createdAt
    if (year) {
      matchStage.job_no = { $regex: `/${year}$`, $options: "i" };
    }

    // 2. Run Aggregation
    const stats = await ExportJobModel.aggregate([
      { $match: matchStage },
      {
        $facet: {
          // A. Counts (Same logic as before)
          counts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                pending: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          {
                            $or: [
                              { $eq: ["$status", "pending"] },
                              { $eq: [{ $ifNull: ["$status", ""] }, ""] },
                            ],
                          },
                          { $ne: ["$isJobtrackingEnabled", true] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                completed: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ["$status", "completed"] },
                          { $eq: ["$isJobtrackingEnabled", true] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                cancelled: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ["$status", "cancelled"] },
                          { $eq: ["$isJobCanceled", true] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          // B. Monthly Trend - Aggregation
          monthlyTrend: [
            {
              $group: {
                // Ensure we have a valid date, otherwise fallback to null (which we filter out later)
                _id: { $month: "$createdAt" },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const result = stats[0];
    const counts = result.counts[0] || {
      total: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };

    res.json({
      success: true,
      data: {
        ...counts,
        monthlyTrend: result.monthlyTrend,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
    });
  }
});

// GET /api/custom-house-list - Get list of unique custom houses from existing jobs
router.get("/custom-house-list", async (req, res) => {
  try {
    const customHouses = await ExportJobModel.distinct("custom_house");
    res.json({
      success: true,
      data: customHouses.filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching custom house list:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching custom house list",
    });
  }
});

// GET /exports - List all exports with pagination & filtering
// Updated exports API with status filtering
// If jobTracking is enabled and all milestones are completed, status is treated as "completed"
router.get("/exports/:status?", async (req, res) => {
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
      detailedStatus = "",
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

    if (req.query.customHouse) {
      filter.$and.push({
        custom_house: { $regex: req.query.customHouse, $options: "i" },
      });
    }

    if (detailedStatus) {
      filter.$and.push({
        $or: [
          { detailedStatus: detailedStatus },
          {
            milestones: {
              $elemMatch: {
                milestoneName: detailedStatus,
                isCompleted: true,
              },
            },
          },
        ],
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
router.post("/exports", auditMiddleware("Job"), async (req, res) => {
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

router.get("/:job_no", async (req, res, next) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    // Validate that this looks like a job_no (contains / or is a known pattern)
    // This prevents catching requests like /currencies, /consignees, etc.
    if (!job_no || (typeof job_no === "string" && !job_no.includes("/"))) {
      return next();
    }

    const username = req.headers["username"]; // Identify who is requesting

    const exportJob = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
    });

    if (!exportJob) {
      return res.status(404).json({ message: "Export job not found" });
    }

    // Check for stale locks (e.g., older than 30 minutes)
    const LOCK_TIMEOUT = 30 * 60 * 1000;
    if (
      exportJob.lockedBy &&
      exportJob.lockedAt &&
      new Date() - new Date(exportJob.lockedAt) > LOCK_TIMEOUT
    ) {
      exportJob.lockedBy = null;
      exportJob.lockedAt = null;
      await exportJob.save();
    }

    // If locked by someone else, return localized info
    if (exportJob.lockedBy && exportJob.lockedBy !== username) {
      return res.status(423).json({
        message: `Job is currently locked by ${exportJob.lockedBy}`,
        lockedBy: exportJob.lockedBy,
        job: exportJob, // Still send data if they just want to "view" (optional, but 423 is standard for locked)
      });
    }

    res.json(exportJob);
  } catch (error) {
    console.error("Error fetching export job:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Lock a job
router.put("/:job_no/lock", async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required to lock" });
    }

    const job = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
    });

    if (!job) return res.status(404).json({ message: "Job not found" });

    // Check if already locked by someone else
    const LOCK_TIMEOUT = 30 * 60 * 1000;
    const isStale =
      job.lockedAt && new Date() - new Date(job.lockedAt) > LOCK_TIMEOUT;

    if (job.lockedBy && job.lockedBy !== username && !isStale) {
      return res.status(423).json({
        message: `Already locked by ${job.lockedBy}`,
        lockedBy: job.lockedBy,
      });
    }

    job.lockedBy = username;
    job.lockedAt = new Date();
    await job.save();

    res.json({ message: "Job locked successfully", lockedBy: username });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Unlock a job
router.put("/:job_no/unlock", async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);
    const { username } = req.body;

    const job = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
    });

    if (!job) return res.status(404).json({ message: "Job not found" });

    // Only let the owner or an admin unlock? For now, if username matches
    if (job.lockedBy === username) {
      job.lockedBy = null;
      job.lockedAt = null;
      await job.save();
      return res.json({ message: "Job unlocked successfully" });
    }

    // Explicitly allow non-lockers to "succeed" during cleanup to prevent frontend errors
    return res.json({ message: "Job released" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update export job (full)
router.put("/:job_no", auditMiddleware("Job"), async (req, res, next) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    // Validate that this looks like a job_no
    if (!job_no || (typeof job_no === "string" && !job_no.includes("/"))) {
      return next();
    }

    const username = req.headers["username"];

    // Enforce lock check
    const existingJob = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
    });
    if (
      existingJob &&
      existingJob.lockedBy &&
      existingJob.lockedBy !== username
    ) {
      const LOCK_TIMEOUT = 30 * 60 * 1000;
      if (
        existingJob.lockedAt &&
        new Date() - new Date(existingJob.lockedAt) < LOCK_TIMEOUT
      ) {
        return res.status(403).json({
          message: `Update blocked: Job is locked by ${existingJob.lockedBy}`,
        });
      }
    }

    const updateData = { ...req.body, updatedAt: new Date() };

    // Business Logic: If "Billing Done" is selected in detailedStatus, mark job as completed
    if (
      updateData.detailedStatus &&
      Array.isArray(updateData.detailedStatus) &&
      updateData.detailedStatus.includes("Billing Done")
    ) {
      updateData.status = "Completed";
    }

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
router.patch("/:job_no/fields", auditMiddleware("Job"), async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    const { fieldUpdates } = req.body;
    const updateObject = {};
    (fieldUpdates || []).forEach(({ field, value }) => {
      updateObject[field] = value;
    });
    updateObject.updatedAt = new Date();

    // Business Logic: If Billing Done is selected, mark as Completed
    if (
      updateObject.detailedStatus &&
      Array.isArray(updateObject.detailedStatus) &&
      updateObject.detailedStatus.includes("Billing Done")
    ) {
      updateObject.status = "Completed";
    }

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
router.put("/:job_no/documents", auditMiddleware("Job"), async (req, res) => {
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
router.put("/:job_no/containers", auditMiddleware("Job"), async (req, res) => {
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
