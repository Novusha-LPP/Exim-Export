import express from "express";
import ClientQueryModel from "../../model/export/ClientQueryModel.mjs";

const router = express.Router();

// ─── CREATE A NEW CLIENT QUERY ─────────────────────────────────────────────
router.post("/api/client-queries", async (req, res) => {
  try {
    const {
      job_no,
      job_id,
      client_id,
      client_name,
      client_email,
      client_username,
      subject,
      message,
    } = req.body;

    if (!job_no || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: job_no, subject, message",
      });
    }

    const query = new ClientQueryModel({
      job_no,
      job_id,
      client_id,
      client_name,
      client_email,
      client_username,
      subject,
      message,
      status: "open",
    });

    await query.save();

    res.status(201).json({
      success: true,
      message: "Query created successfully",
      query,
    });
  } catch (error) {
    console.error("Error creating client query:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─── GET LIST OF CLIENT QUERIES ────────────────────────────────────────────
router.get("/api/client-queries", async (req, res) => {
  try {
    const { job_no, status, client_id, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (job_no) filter.job_no = job_no;
    if (status) filter.status = status;
    if (client_id) filter.client_id = client_id;

    const skip = (page - 1) * limit;

    const queries = await ClientQueryModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ClientQueryModel.countDocuments(filter);

    res.status(200).json({
      success: true,
      queries,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching client queries:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─── GET A SPECIFIC CLIENT QUERY ───────────────────────────────────────────
router.get("/api/client-queries/:id", async (req, res) => {
  try {
    const query = await ClientQueryModel.findById(req.params.id).lean();

    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    res.status(200).json({ success: true, query });
  } catch (error) {
    console.error("Error fetching client query details:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─── REPLY TO A CLIENT QUERY ───────────────────────────────────────────────
router.put("/api/client-queries/:id/reply", async (req, res) => {
  try {
    const { message, repliedBy, senderType, email, username } = req.body;

    if (!message || !repliedBy || !senderType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: message, repliedBy, senderType",
      });
    }

    if (!["client", "admin"].includes(senderType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid senderType. Must be 'client' or 'admin'",
      });
    }

    const query = await ClientQueryModel.findById(req.params.id);

    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    const reply = {
      message,
      repliedBy,
      senderType,
      email,
      username,
      repliedAt: new Date(),
    };

    query.replies.push(reply);

    // Update seen statuses based on who replied
    if (senderType === "client") {
      query.seenByAdmin = false;
      query.seenByClient = true;
    } else {
      query.seenByAdmin = true;
      query.seenByClient = false;
    }

    // Re-open if replied by client and was resolved
    if (senderType === "client" && query.status === "resolved") {
      query.status = "open";
    }

    await query.save();

    res.status(200).json({
      success: true,
      message: "Reply added successfully",
      query,
    });
  } catch (error) {
    console.error("Error replying to client query:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─── RESOLVE A CLIENT QUERY ────────────────────────────────────────────────
router.put("/api/client-queries/:id/resolve", async (req, res) => {
  try {
    const { resolvedBy, resolutionNote } = req.body;

    if (!resolvedBy) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: resolvedBy",
      });
    }

    const query = await ClientQueryModel.findById(req.params.id);

    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    query.status = "resolved";
    query.resolvedBy = resolvedBy;
    query.resolvedAt = new Date();
    if (resolutionNote) {
      query.resolutionNote = resolutionNote;
    }
    
    // Notify client that it was resolved
    query.seenByClient = false;
    query.seenByAdmin = true;

    await query.save();

    res.status(200).json({
      success: true,
      message: "Query resolved successfully",
      query,
    });
  } catch (error) {
    console.error("Error resolving client query:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ─── GET CLIENT JOBS QUERY STATUS ─────────────────────────────────────────────
router.post("/api/client-queries/jobs-status", async (req, res) => {
  try {
    const { jobNos, isClient } = req.body;
    if (!jobNos || !Array.isArray(jobNos)) {
      return res.status(400).json({ success: false, message: "Valid jobNos array required" });
    }

    const queries = await ClientQueryModel.find({ job_no: { $in: jobNos } }).lean();

    const statusMap = {};
    jobNos.forEach(j => {
      statusMap[j] = { hasQueries: false, hasUnseen: false, hasOpenQueries: false };
    });

    queries.forEach(q => {
      if (!statusMap[q.job_no]) statusMap[q.job_no] = { hasQueries: true, hasUnseen: false, hasOpenQueries: false };
      statusMap[q.job_no].hasQueries = true;
      if (q.status === "open") statusMap[q.job_no].hasOpenQueries = true;

      // Check unseen replies/queries from client vs admin perspective
      if (isClient) {
        if (!q.seenByClient) {
          statusMap[q.job_no].hasUnseen = true;
        }
      } else {
        if (!q.seenByAdmin) {
          statusMap[q.job_no].hasUnseen = true;
        }
      }
    });

    return res.status(200).json({ success: true, data: statusMap });
  } catch (err) {
    console.error("Error fetching client jobs queries status:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── MARK CLIENT QUERIES AS SEEN ─────────────────────────────────────────────
router.put("/api/client-queries/mark-seen", async (req, res) => {
  try {
    const { queryIds, isClient } = req.body;

    if (!queryIds || !Array.isArray(queryIds) || queryIds.length === 0) {
      return res.status(400).json({ success: false, message: "queryIds array required" });
    }

    const updateField = isClient ? { seenByClient: true } : { seenByAdmin: true };
    await ClientQueryModel.updateMany({ _id: { $in: queryIds } }, { $set: updateField });

    return res.status(200).json({ success: true, message: "Client queries marked as seen" });
  } catch (err) {
    console.error("Error marking client queries as seen:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
