
import express from "express";
import AuditTrailModel from "../../model/auditTrailModel.mjs";
import UserModel from "../../model/userModel.mjs";
import { getAllUserMappings, getUsernameById } from "../../utils/userIdManager.mjs";
const router = express.Router();

// Admin-only: Get audit trail for a specific user by userId with filters and pagination
router.get("/api/audit-trail/user-logs/:userId", async (req, res) => {
  try {


    const { userId } = req.params;
    const { actionType, fromDate, toDate, page = 1, limit = 20 } = req.query;

    // Get username for userId
    const username = await getUsernameById(userId);
    if (!username) {
      return res.status(404).json({ message: "User not found" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { username: { $regex: `^${username}$`, $options: 'i' } };
    if (actionType) filter.action = actionType;
    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = new Date(fromDate);
      if (toDate) filter.timestamp.$lte = new Date(toDate);
    }

    const auditTrail = await AuditTrailModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditTrailModel.countDocuments(filter);

    // Format response: timestamp, action, performedBy, metadata/details
    const logs = auditTrail.map(entry => ({
      timestamp: entry.timestamp,
      action: entry.action,
      performedBy: entry.username,
      details: entry.changes || [],
      job_no: entry.job_no,
      year: entry.year,
      ipAddress: entry.ipAddress || null
    }));

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching user logs:", error);
    res.status(500).json({ message: "Error fetching user logs", error: error.message });
  }
});


// Get all users with details, assigned modules, and last activity date
router.get("/api/audit-trail/all-users-with-activity", async (req, res) => {
  try {
    // Get all unique users from the audit trail with last activity
    const usersActivity = await AuditTrailModel.aggregate([
      {
        $group: {
          _id: "$username",
          lastActivity: { $max: "$timestamp" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fetch all users from the user model WITH PROJECTION to reduce payload
    const allUsers = await UserModel.find({})
      .select({
        _id: 1,
        username: 1,
        first_name: 1,
        last_name: 1,
        email: 1,
        company: 1,
        role: 1,
        modules: 1,
        assigned_importer_name: 1,
        selected_icd_code: 1
      })
      .lean()
      .maxTimeMS(15000); // 15 second timeout
    // Map username to user details
    const userMap = {};
    allUsers.forEach(u => {
      userMap[u.username] = u;
    });

    // Merge activity and user details
    const users = usersActivity.map((u) => {
      const userDetails = userMap[u._id] || {};
      return {
        username: u._id,
        lastActivity: u.lastActivity,
        first_name: userDetails.first_name || "",
        last_name: userDetails.last_name || "",
        email: userDetails.email || "",
        company: userDetails.company || "",
        role: userDetails.role || "",
        modules: userDetails.modules || [],
        assigned_importer_name: userDetails.assigned_importer_name || [],
        selected_icd_code: userDetails.selected_icd_code || "",
        // Add any other fields you want to expose
      };
    });

    res.json({ users });
  } catch (error) {
    console.error("Error fetching all users with activity:", error);
    res.status(500).json({ message: "Error fetching all users with activity", error: error.message });
  }
});

// Get audit trail for a specific job
router.get("/api/audit-trail/job/:job_no/:year", async (req, res) => {
  try {
    const { job_no, year } = req.params;
    const { page = 1, limit = 50, action, username, field } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter query
    const filter = { job_no, year };
    if (action) filter.action = action;
    if (username) filter.username = { $regex: username, $options: 'i' };
    if (field) filter['changes.field'] = { $regex: field, $options: 'i' };

    const auditTrail = await AuditTrailModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditTrailModel.countDocuments(filter);

    res.json({
      auditTrail,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    res.status(500).json({ message: "Error fetching audit trail", error: error.message });
  }
});

// Get audit trail for a specific user
router.get("/api/audit-trail/user/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 50, action, documentType, fromDate, toDate } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter query
    const filter = { username: { $regex: username, $options: 'i' } };
    if (action) filter.action = action;
    if (documentType) filter.documentType = documentType;

    // Date range filter
    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = new Date(fromDate);
      if (toDate) filter.timestamp.$lte = new Date(toDate);
    }

    const auditTrail = await AuditTrailModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditTrailModel.countDocuments(filter);

    res.json({
      auditTrail,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching user audit trail:", error);
    res.status(500).json({ message: "Error fetching user audit trail", error: error.message });
  }
});

// Get audit trail for a specific document
router.get("/api/audit-trail/document/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const auditTrail = await AuditTrailModel.find({ documentId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditTrailModel.countDocuments({ documentId });

    res.json({
      auditTrail,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching document audit trail:", error);
    res.status(500).json({ message: "Error fetching document audit trail", error: error.message });
  }
});

// Get comprehensive audit trail with advanced filters
router.get("/api/audit-trail", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      username,
      documentType,
      job_no,
      year,
      field,
      fromDate,
      toDate,
      ipAddress
    } = req.query;

    const { search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter query
    const filter = {};
    if (action) filter.action = action;
    if (username) filter.username = { $regex: username, $options: 'i' };
    if (documentType) filter.documentType = documentType;
    if (job_no) filter.job_no = { $regex: job_no, $options: 'i' }; // regex search on job_no for flexibility
    if (year) filter.year = year;
    if (field) filter['changes.field'] = { $regex: field, $options: 'i' };
    if (ipAddress) filter.ipAddress = { $regex: ipAddress, $options: 'i' };
    if (search) filter.job_no = { $regex: search, $options: 'i' };

    // Date range filter: default to current date if not provided
    const dateFilter = {};
    let adjustedToDate = toDate;
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);

      // If fromDate is after toDate, return error
      if (from > to) {
        return res.status(400).json({
          message: "Invalid time range: fromDate must be before or equal to toDate"
        });
      }

      // If fromDate and toDate are the same day, increment toDate by 1 day
      if (
        from.getFullYear() === to.getFullYear() &&
        from.getMonth() === to.getMonth() &&
        from.getDate() === to.getDate()
      ) {
        to.setDate(to.getDate() + 1);
        adjustedToDate = to.toISOString().slice(0, 10);
      }
    }

    if (fromDate || toDate) {
      dateFilter.timestamp = {};
      if (fromDate) dateFilter.timestamp.$gte = new Date(fromDate);
      if (adjustedToDate) dateFilter.timestamp.$lte = new Date(adjustedToDate);
      Object.assign(filter, dateFilter); // Apply date filter to the main filter
    } else {
      // Default: current date 00:00 to 23:59:59.999
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      filter.timestamp = { $gte: start, $lte: end };
    }

    // Fetch audit trail data with pagination
    const auditTrail = await AuditTrailModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditTrailModel.countDocuments(filter);

    res.json({
      auditTrail,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    res.status(500).json({ message: "Error fetching audit trail", error: error.message });
  }
});


// Get audit trail statistics
router.get("/api/audit-trail/stats", async (req, res) => {
  try {
    const { fromDate, toDate, groupBy, username } = req.query;
    // If no filters are applied (no fromDate, toDate, username), show stats for all time
    const noFilters = !fromDate && !toDate && !username;
    const dateFilter = {};
    let adjustedToDate = toDate;
    if (!noFilters) {
      if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        // If fromDate is after toDate, return error
        if (from > to) {
          return res.status(400).json({ message: "Invalid time range: fromDate must be before or equal to toDate" });
        }
        // If fromDate and toDate are the same day, increment toDate by 1 day
        if (
          from.getFullYear() === to.getFullYear() &&
          from.getMonth() === to.getMonth() &&
          from.getDate() === to.getDate()
        ) {
          to.setDate(to.getDate() + 1);
          adjustedToDate = to.toISOString().slice(0, 10);
        }
      }
      if (fromDate || toDate) {
        dateFilter.timestamp = {};
        if (fromDate) dateFilter.timestamp.$gte = new Date(fromDate);
        if (adjustedToDate) dateFilter.timestamp.$lte = new Date(adjustedToDate);
      } else {
        // Default: current date 00:00 to 23:59
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        dateFilter.timestamp = { $gte: start, $lte: end };
      }
      // Add username filter if provided
      if (username) {
        dateFilter.username = { $regex: `^${username}$`, $options: 'i' };
      }
    }
    // If no filters, do not add any date or username filter (all time, all users)
    // Aggregate statistics
    const stats = await AuditTrailModel.aggregate([
      { $match: noFilters ? {} : dateFilter },
      {
        $group: {
          _id: null,
          totalActions: { $sum: 1 },
          totalUsers: { $addToSet: "$username" },
          totalDocuments: { $addToSet: "$documentId" }
        }
      },
      {
        $project: {
          totalActions: 1,
          totalUsers: { $size: "$totalUsers" },
          totalDocuments: { $size: "$totalDocuments" }
        }
      }
    ]);

    // Get action breakdown
    const actionStats = await AuditTrailModel.aggregate([
      { $match: noFilters ? {} : dateFilter },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top users
    const topUsers = await AuditTrailModel.aggregate([
      { $match: noFilters ? {} : dateFilter },
      {
        $group: {
          _id: "$username",
          count: { $sum: 1 },
          lastActivity: { $max: "$timestamp" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get activity grouped by hour, day, week, or month
    let dateFormat = "%Y-%m-%d %H:00"; // default: hourly
    if (groupBy === "day") dateFormat = "%Y-%m-%d";
    else if (groupBy === "week") dateFormat = "%G-W%V"; // ISO week
    else if (groupBy === "month") dateFormat = "%Y-%m";

    const dailyActivity = await AuditTrailModel.aggregate([
      { $match: noFilters ? {} : dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      summary: stats[0] || {
        totalActions: 0,
        totalUsers: 0,
        totalDocuments: 0
      },
      actionBreakdown: actionStats,
      actionTypes: actionStats, // for frontend PieChart
      topUsers,
      dailyActivity: dailyActivity.map(item => ({ date: item._id, count: item.count }))
    });
  } catch (error) {
    console.error("Error fetching audit trail stats:", error);
    res.status(500).json({ message: "Error fetching audit trail stats", error: error.message });
  }
});

// Get field-level change history for a specific field in a job
router.get("/api/audit-trail/field-history/:job_no/:year/:fieldPath", async (req, res) => {
  try {
    const { job_no, year, fieldPath } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const auditTrail = await AuditTrailModel.find({
      job_no,
      year,
      'changes.fieldPath': fieldPath
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Extract only the relevant field changes
    const fieldHistory = auditTrail.map(entry => ({
      ...entry,
      changes: entry.changes.filter(change => change.fieldPath === fieldPath)
    }));

    const total = await AuditTrailModel.countDocuments({
      job_no,
      year,
      'changes.fieldPath': fieldPath
    });

    res.json({
      fieldHistory,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching field history:", error);
    res.status(500).json({ message: "Error fetching field history", error: error.message });
  }
});

// Get all user mappings (for admin purposes)
router.get("/api/audit/user-mappings", async (req, res) => {
  try {
    const userMappings = await getAllUserMappings();

    res.json({
      success: true,
      data: userMappings.map(mapping => ({
        userId: mapping.userId,
        username: mapping.username,
        createdAt: mapping.createdAt,
        lastUsed: mapping.lastUsed
      })),
      totalUsers: userMappings.length
    });
  } catch (error) {
    console.error("Error fetching user mappings:", error);
    res.status(500).json({ message: "Error fetching user mappings", error: error.message });
  }
});

// Get username by user ID
router.get("/api/audit/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const username = await getUsernameById(userId);

    if (username) {
      res.json({
        success: true,
        data: { userId, username }
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching username:", error);
    res.status(500).json({ message: "Error fetching username", error: error.message });
  }
});

// Get all users with activity statistics (for All Users page)
router.get("/api/audit-trail/all-active-users", async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      limit = 20,
      page = 1,
      username,
      action,
      sortBy = 'count',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    // Date range filter
    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = new Date(fromDate);
      if (toDate) filter.timestamp.$lte = new Date(toDate);
    }

    // Username filter (partial match)
    if (username) {
      filter.username = { $regex: username, $options: 'i' };
    }

    // Action filter
    if (action) {
      filter.action = action;
    }

    // First, get all users with their statistics (no limit for complete data)
    const allUsersStats = await AuditTrailModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$username",
          count: { $sum: 1 },
          lastActivity: { $max: "$timestamp" },
          firstActivity: { $min: "$timestamp" },
          actions: { $addToSet: "$action" }
        }
      },
      {
        $sort: {
          [sortBy]: sortOrder === 'desc' ? -1 : 1
        }
      }
    ]);

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalUsers = allUsersStats.length;
    const paginatedUsers = allUsersStats.slice(skip, skip + parseInt(limit));

    res.json({
      users: paginatedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalItems: totalUsers,
        hasNext: skip + parseInt(limit) < totalUsers,
        hasPrev: parseInt(page) > 1
      },
      debug: {
        totalAuditTrailUsers: totalUsers,
        message: `Showing users with audit trail activity. ${totalUsers} users have performed trackable actions.`
      }
    });
  } catch (error) {
    console.error("Error fetching all active users:", error);
    res.status(500).json({ message: "Error fetching all active users", error: error.message });
  }
});

// Get ALL system users (including those without audit activity)
router.get("/api/audit-trail/all-system-users", async (req, res) => {
  try {
    const {
      limit = 20,
      page = 1,
      username,
      sortBy = 'username',
      sortOrder = 'asc'
    } = req.query;

    // Get all users from UserModel
    const userFilter = {};
    if (username) {
      userFilter.username = { $regex: username, $options: 'i' };
    }

    const allSystemUsers = await UserModel.find(userFilter).lean();

    // Get audit activity for each user
    const usersWithActivity = await Promise.all(
      allSystemUsers.map(async (user) => {
        const userActivity = await AuditTrailModel.aggregate([
          { $match: { username: user.username } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              lastActivity: { $max: "$timestamp" },
              firstActivity: { $min: "$timestamp" },
              actions: { $addToSet: "$action" }
            }
          }
        ]);

        const activity = userActivity[0] || {
          count: 0,
          lastActivity: null,
          firstActivity: null,
          actions: []
        };

        return {
          _id: user.username,
          userDetails: {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role,
            company: user.company
          },
          count: activity.count,
          lastActivity: activity.lastActivity,
          firstActivity: activity.firstActivity,
          actions: activity.actions,
          hasActivity: activity.count > 0
        };
      })
    );

    // Sort users
    const sortField = sortBy === 'count' ? 'count' :
      sortBy === 'lastActivity' ? 'lastActivity' :
        '_id';

    usersWithActivity.sort((a, b) => {
      const aVal = a[sortField] || (sortField === '_id' ? a._id : 0);
      const bVal = b[sortField] || (sortField === '_id' ? b._id : 0);

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });

    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalUsers = usersWithActivity.length;
    const paginatedUsers = usersWithActivity.slice(skip, skip + parseInt(limit));

    res.json({
      users: paginatedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalItems: totalUsers,
        hasNext: skip + parseInt(limit) < totalUsers,
        hasPrev: parseInt(page) > 1
      },
      debug: {
        totalSystemUsers: totalUsers,
        activeUsers: usersWithActivity.filter(u => u.hasActivity).length,
        inactiveUsers: usersWithActivity.filter(u => !u.hasActivity).length,
        message: `Showing all system users including those without audit activity.`
      }
    });
  } catch (error) {
    console.error("Error fetching all system users:", error);
    res.status(500).json({ message: "Error fetching all system users", error: error.message });
  }
});

// Get top active users with flexible filtering and pagination
router.get("/api/audit-trail/top-users", async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      limit = 5,
      page = 1,
      username,
      action,
      sortBy = 'count',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    // Date range filter
    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = new Date(fromDate);
      if (toDate) filter.timestamp.$lte = new Date(toDate);
    }

    // Username filter (partial match)
    if (username) {
      filter.username = { $regex: username, $options: 'i' };
    }

    // Action filter
    if (action) {
      filter.action = action;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortDirection;

    const topUsers = await AuditTrailModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$username",
          count: { $sum: 1 },
          lastActivity: { $max: "$timestamp" },
          firstActivity: { $min: "$timestamp" },
          actions: { $addToSet: "$action" }
        }
      },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Get total count for pagination
    const totalUsers = await AuditTrailModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$username",
          count: { $sum: 1 }
        }
      },
      { $count: "total" }
    ]);

    const total = totalUsers[0]?.total || 0;

    res.json({
      topUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching top users:", error);
    res.status(500).json({ message: "Error fetching top users", error: error.message });
  }
});



// Get activity timeline for audit chart (day-wise for frontend line graph)
router.get("/api/audit-trail/activity-timeline", async (req, res) => {
  try {
    const { fromDate, toDate, username } = req.query;
    // Always group by day for this endpoint
    let dateFormat = "%Y-%m-%d";
    const dateFilter = {};
    if (fromDate) dateFilter.timestamp = { $gte: new Date(fromDate) };
    if (toDate) dateFilter.timestamp = { ...(dateFilter.timestamp || {}), $lte: new Date(toDate) };
    if (username) dateFilter.username = { $regex: `^${username}$`, $options: "i" };
    // Aggregate day-wise activity
    const dailyActivity = await AuditTrailModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$timestamp" } },
          actions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    // Fill missing days with 0 actions for a continuous line graph
    let results = [];
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      let current = new Date(start);
      const activityMap = Object.fromEntries(dailyActivity.map(item => [item._id, item.actions]));
      while (current <= end) {
        const dateStr = current.toISOString().slice(0, 10);
        results.push({ date: dateStr, actions: activityMap[dateStr] || 0 });
        current.setDate(current.getDate() + 1);
      }
    } else {
      results = dailyActivity.map(item => ({ date: item._id, actions: item.actions }));
    }
    res.json({ dailyActivity: results });
  } catch (error) {
    res.status(500).json({ message: "Error fetching activity timeline", error: error.message });
  }
});

export default router;
