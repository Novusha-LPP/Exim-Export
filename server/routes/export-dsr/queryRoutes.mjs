import express from "express";
import QueryModel from "../../model/export/QueryModel.mjs";

const router = express.Router();

// ─── CREATE A NEW QUERY ─────────────────────────────────────────────────────
router.post("/api/queries", async (req, res) => {
  try {
    const {
      job_no,
      job_id,
      fieldName,
      fieldLabel,
      raisedBy,
      raisedByName,
      raisedFromModule,
      targetModule,
      subject,
      message,
      currentValue,
      requestedValue,
    } = req.body;

    if (!job_no || !fieldName || !raisedBy || !raisedFromModule || !targetModule || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: job_no, fieldName, raisedBy, raisedFromModule, targetModule, subject, message",
      });
    }

    const query = new QueryModel({
      job_no,
      job_id,
      fieldName,
      fieldLabel,
      raisedBy,
      raisedByName,
      raisedFromModule,
      targetModule,
      subject,
      message,
      currentValue,
      requestedValue,
    });

    await query.save();

    return res.status(201).json({ success: true, data: query });
  } catch (err) {
    console.error("Error creating query:", err);
    return res.status(500).json({ success: false, message: "Server error creating query" });
  }
});

// ─── GET QUERIES (with filters) ─────────────────────────────────────────────
// GET /api/queries?targetModule=export-operation&status=open&job_no=...
router.get("/api/queries", async (req, res) => {
  try {
    const { targetModule, raisedFromModule, raisedBy, status, job_no, page = 1, limit = 50 } = req.query;

    const filter = {};

    if (targetModule) filter.targetModule = targetModule;
    if (raisedFromModule) filter.raisedFromModule = raisedFromModule;
    if (raisedBy) filter.raisedBy = raisedBy;
    if (status) filter.status = status;
    if (job_no) filter.job_no = job_no;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [queries, total] = await Promise.all([
      QueryModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      QueryModel.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        queries,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error fetching queries:", err);
    return res.status(500).json({ success: false, message: "Server error fetching queries" });
  }
});

// ─── GET QUERY COUNT (for badge) ─────────────────────────────────────────────
// GET /api/queries/count?targetModule=export-operation&status=open
router.get("/api/queries/count", async (req, res) => {
  try {
    const { targetModule, raisedFromModule, raisedBy, status = "open" } = req.query;

    const filter = { status };

    if (targetModule) filter.targetModule = targetModule;
    if (raisedFromModule) filter.raisedFromModule = raisedFromModule;
    if (raisedBy) filter.raisedBy = raisedBy;

    // Only count unseen queries
    filter.seenByTarget = false;

    const count = await QueryModel.countDocuments(filter);

    return res.json({ success: true, count });
  } catch (err) {
    console.error("Error counting queries:", err);
    return res.status(500).json({ success: false, message: "Server error counting queries" });
  }
});

// ─── MARK QUERIES AS SEEN (must come BEFORE /:id routes) ──────────────────
router.put("/api/queries/mark-seen", async (req, res) => {
  try {
    const { targetModule, queryIds } = req.body;

    const filter = { seenByTarget: false };

    if (queryIds && Array.isArray(queryIds) && queryIds.length > 0) {
      filter._id = { $in: queryIds };
    } else if (targetModule) {
      filter.targetModule = targetModule;
    } else {
      return res.status(400).json({ success: false, message: "Provide targetModule or queryIds" });
    }

    await QueryModel.updateMany(filter, { $set: { seenByTarget: true } });

    return res.json({ success: true, message: "Queries marked as seen" });
  } catch (err) {
    console.error("Error marking queries as seen:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── GET SINGLE QUERY ─────────────────────────────────────────────────────────
router.get("/api/queries/:id", async (req, res) => {
  try {
    const query = await QueryModel.findById(req.params.id).lean();
    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }
    return res.json({ success: true, data: query });
  } catch (err) {
    console.error("Error fetching query:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── ADD REPLY TO A QUERY ─────────────────────────────────────────────────────
router.post("/api/queries/:id/reply", async (req, res) => {
  try {
    const { message, repliedBy, repliedByName } = req.body;

    if (!message || !repliedBy) {
      return res.status(400).json({ success: false, message: "message and repliedBy are required" });
    }

    const query = await QueryModel.findById(req.params.id);
    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    query.replies.push({ message, repliedBy, repliedByName });
    // Reset seen flag so the other party sees it
    query.seenByTarget = false;
    await query.save();

    return res.json({ success: true, data: query });
  } catch (err) {
    console.error("Error adding reply:", err);
    return res.status(500).json({ success: false, message: "Server error adding reply" });
  }
});

// ─── RESOLVE A QUERY ──────────────────────────────────────────────────────────
router.put("/api/queries/:id/resolve", async (req, res) => {
  try {
    const { resolvedBy, resolvedByName, resolutionNote } = req.body;

    const query = await QueryModel.findById(req.params.id);
    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    query.status = "resolved";
    query.resolvedBy = resolvedBy;
    query.resolvedByName = resolvedByName;
    query.resolvedAt = new Date();
    query.resolutionNote = resolutionNote || "";
    query.seenByTarget = false;
    await query.save();

    return res.json({ success: true, data: query });
  } catch (err) {
    console.error("Error resolving query:", err);
    return res.status(500).json({ success: false, message: "Server error resolving query" });
  }
});

// ─── REJECT A QUERY ──────────────────────────────────────────────────────────
router.put("/api/queries/:id/reject", async (req, res) => {
  try {
    const { resolvedBy, resolvedByName, resolutionNote } = req.body;

    const query = await QueryModel.findById(req.params.id);
    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    query.status = "rejected";
    query.resolvedBy = resolvedBy;
    query.resolvedByName = resolvedByName;
    query.resolvedAt = new Date();
    query.resolutionNote = resolutionNote || "";
    query.seenByTarget = false;
    await query.save();

    return res.json({ success: true, data: query });
  } catch (err) {
    console.error("Error rejecting query:", err);
    return res.status(500).json({ success: false, message: "Server error rejecting query" });
  }
});

export default router;
