import express from "express";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

/**
 * Safe projection for user list - excludes heavy/sensitive fields
 * Reduces payload size significantly
 */
const USER_LIST_PROJECTION = {
  _id: 1,
  username: 1,
  first_name: 1,
  last_name: 1,
  email: 1,
  role: 1,
  company: 1,
  modules: 1,
  selected_icd_code: 1,
  assigned_importer_name: 1
};

/**
 * GET /api/get-all-users
 * 
 * Returns paginated list of users with safe projection.
 * Prevents unbounded data fetches that caused bandwidth explosion.
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 200)
 * 
 * @returns {{ users: Array, pagination: Object }}
 */
router.get("/api/get-all-users", async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 50), 200);
    const skip = (safePage - 1) * safeLimit;

    const [users, totalCount] = await Promise.all([
      UserModel.find({})
        .select(USER_LIST_PROJECTION)
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .maxTimeMS(30000), // 30 second timeout
      UserModel.countDocuments({})
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: safePage,
        pageSize: safeLimit,
        totalPages: Math.ceil(totalCount / safeLimit),
        totalCount,
        hasNextPage: skip + safeLimit < totalCount,
        hasPrevPage: safePage > 1
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
      message: error.message
    });
  }
});

export default router;
