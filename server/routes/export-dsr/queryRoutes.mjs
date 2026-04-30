import express from "express";
import QueryModel from "../../model/export/QueryModel.mjs";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import UserModel from "../../model/userModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

// ─── CREATE A NEW QUERY ─────────────────────────────────────────────────────
router.post("/api/queries", auditMiddleware("Query"), async (req, res) => {
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

    if (targetModule && raisedFromModule) {
      // Two-way view: things for me OR things by me
      filter.$or = [{ targetModule }, { raisedFromModule }];
    } else {
      if (targetModule) filter.targetModule = targetModule;
      if (raisedFromModule) filter.raisedFromModule = raisedFromModule;
    }
    
    if (raisedBy) filter.raisedBy = raisedBy;
    if (status) filter.status = status;
    if (job_no) filter.job_no = job_no;

    // --- APPLY USER RESTRICTIONS ---
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin") {
        let branchRestrictions = requester.selected_branches || [];
        
        // Resilience: Map full names to codes
        const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
        branchRestrictions = branchRestrictions.map(b => BRANCH_MAP[b.toUpperCase()] || b);

        const portRestrictions = requester.selected_ports || [];
        const icdRestrictions = requester.selected_icd_codes || [];

        if (branchRestrictions.length > 0 || portRestrictions.length > 0 || icdRestrictions.length > 0) {
          const jobFilter = {};
          if (!jobFilter.$and) jobFilter.$and = [];

          if (branchRestrictions.length > 0) {
            jobFilter.$and.push({ branch_code: { $in: branchRestrictions } });
          }

          const combinedRestrictions = [...new Set([...portRestrictions, ...icdRestrictions])];
          if (combinedRestrictions.length > 0) {
            const finalRestrictions = [];
            combinedRestrictions.forEach(res => {
              finalRestrictions.push(res);
              if (res.includes(" - ")) finalRestrictions.push(res.split(" - ")[0].trim());
            });

            const combinedRegexStr = finalRestrictions.map(r =>
              `^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
            ).join('|');

            jobFilter.$and.push({
              $or: [
                { custom_house: { $regex: combinedRegexStr, $options: "i" } },
                { port_of_loading: { $regex: combinedRegexStr, $options: "i" } }
              ]
            });
          }

          // Fetch allowed job numbers
          const allowedJobs = await ExportJobModel.find(jobFilter).select("job_no").lean();
          const allowedJobNos = allowedJobs.map(j => j.job_no);

          // If a job_no was already in filter, intersect them
          if (filter.job_no) {
            if (typeof filter.job_no === 'string') {
              if (!allowedJobNos.includes(filter.job_no)) {
                filter.job_no = "__NONE__"; // force no results
              }
            } else if (filter.job_no.$in) {
              filter.job_no.$in = filter.job_no.$in.filter(j => allowedJobNos.includes(j));
            }
          } else {
            filter.job_no = { $in: allowedJobNos };
          }
        }
      } else if (!requester && requesterUsername !== "Admin") {
        filter.job_no = "__NONE__";
      }
    } else {
      filter.job_no = "__NONE__";
    }

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

    // --- APPLY USER RESTRICTIONS FOR COUNT ---
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin") {
        let branchRest = requester.selected_branches || [];
        const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
        branchRest = branchRest.map(b => BRANCH_MAP[b.toUpperCase()] || b);

        const portRest = requester.selected_ports || [];
        const icdRest = requester.selected_icd_codes || [];

        if (branchRest.length > 0 || portRest.length > 0 || icdRest.length > 0) {
          const jobFilter = {};
          if (!jobFilter.$and) jobFilter.$and = [];
          if (branchRest.length > 0) jobFilter.$and.push({ branch_code: { $in: branchRest } });
          const combinedP = [...new Set([...portRest, ...icdRest])];
          if (combinedP.length > 0) {
            const finalP = [];
            combinedP.forEach(p => {
              finalP.push(p);
              if (p.includes(" - ")) finalP.push(p.split(" - ")[0].trim());
            });
            const pRegex = finalP.map(r => `^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`).join('|');
            jobFilter.$and.push({
              $or: [
                { custom_house: { $regex: pRegex, $options: "i" } },
                { port_of_loading: { $regex: pRegex, $options: "i" } }
              ]
            });
          }
          const allowedJobs = await ExportJobModel.find(jobFilter).select("job_no").lean();
          filter.job_no = { $in: allowedJobs.map(j => j.job_no) };
        }
      } else if (!requester && requesterUsername !== "Admin") {
        filter.job_no = "__NONE__";
      }
    } else {
      filter.job_no = "__NONE__";
    }

    // Only count unseen queries
    filter.seenByTarget = false;

    const count = await QueryModel.countDocuments(filter);

    return res.json({ success: true, count });
  } catch (err) {
    console.error("Error counting queries:", err);
    return res.status(500).json({ success: false, message: "Server error counting queries" });
  }
});

// ─── GET JOBS QUERY STATUS ─────────────────────────────────────────────
router.post("/api/queries/jobs-status", async (req, res) => {
  try {
    const { jobNos, currentModule } = req.body;
    if (!jobNos || !Array.isArray(jobNos)) {
      return res.status(400).json({ success: false, message: "Valid jobNos array required" });
    }

    const queries = await QueryModel.find({ job_no: { $in: jobNos } }).lean();

    const statusMap = {};
    jobNos.forEach(j => {
      statusMap[j] = { hasQueries: false, hasUnseen: false, hasOpenQueries: false };
    });

    queries.forEach(q => {
      if (!statusMap[q.job_no]) statusMap[q.job_no] = { hasQueries: true, hasUnseen: false, hasOpenQueries: false };
      statusMap[q.job_no].hasQueries = true;
      if (q.status === "open") statusMap[q.job_no].hasOpenQueries = true;

      // Check unseen replies/queries from the perspective of currentModule
      if (currentModule) {
        if (q.targetModule === currentModule && !q.seenByTarget && q.status === "open") {
          statusMap[q.job_no].hasUnseen = true;
        }
        if (q.raisedFromModule === currentModule && !q.seenBySender && q.status === "open") {
          statusMap[q.job_no].hasUnseen = true;
        }
      }
    });

    return res.json({ success: true, data: statusMap });
  } catch (err) {
    console.error("Error fetching jobs queries status:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── MARK QUERIES AS SEEN (must come BEFORE /:id routes) ──────────────────
router.put("/api/queries/mark-seen", auditMiddleware("Query"), async (req, res) => {
  try {
    const { targetModule, raisedFromModule, queryIds } = req.body;

    const skipIfEmpty = !queryIds && !targetModule && !raisedFromModule;
    if (skipIfEmpty) {
      return res.status(400).json({ success: false, message: "Provide module or queryIds" });
    }

    if (queryIds && Array.isArray(queryIds) && queryIds.length > 0) {
      await QueryModel.updateMany({ _id: { $in: queryIds } }, { $set: { seenByTarget: true, seenBySender: true } });
    } else {
      if (targetModule) {
        await QueryModel.updateMany({ targetModule, seenByTarget: false }, { $set: { seenByTarget: true } });
      }
      if (raisedFromModule) {
        await QueryModel.updateMany({ raisedFromModule, seenBySender: false }, { $set: { seenBySender: true } });
      }
    }

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
router.post("/api/queries/:id/reply", auditMiddleware("Query"), async (req, res) => {
  try {
    const { message, repliedBy, repliedByName, fromModule } = req.body;

    if (!message || !repliedBy) {
      return res.status(400).json({ success: false, message: "message and repliedBy are required" });
    }

    const query = await QueryModel.findById(req.params.id);
    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    query.replies.push({ message, repliedBy, repliedByName });
    
    // Toggle 'seen' flags based on who replied
    if (fromModule === query.targetModule) {
      // Recipient replied -> Sender needs to see it
      query.seenBySender = false;
      query.seenByTarget = true;
    } else {
      // Sender replied -> Target needs to see it
      query.seenByTarget = false;
      query.seenBySender = true;
    }
    
    await query.save();

    return res.json({ success: true, data: query });
  } catch (err) {
    console.error("Error adding reply:", err);
    return res.status(500).json({ success: false, message: "Server error adding reply" });
  }
});

// ─── RESOLVE A QUERY ──────────────────────────────────────────────────────────
router.put("/api/queries/:id/resolve", auditMiddleware("Query"), async (req, res) => {
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
    
    // Both need to know it's solved, but Sender usually needs the notification
    query.seenBySender = false;
    query.seenByTarget = true;
    
    await query.save();

    return res.json({ success: true, data: query });
  } catch (err) {
    console.error("Error resolving query:", err);
    return res.status(500).json({ success: false, message: "Server error resolving query" });
  }
});

// ─── REJECT A QUERY ──────────────────────────────────────────────────────────
router.put("/api/queries/:id/reject", auditMiddleware("Query"), async (req, res) => {
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
    
    // Both need to know it's rejected, but Sender usually needs the notification
    query.seenBySender = false;
    query.seenByTarget = true;
    
    await query.save();

    return res.json({ success: true, data: query });
  } catch (err) {
    console.error("Error rejecting query:", err);
    return res.status(500).json({ success: false, message: "Server error rejecting query" });
  }
});

export default router;
