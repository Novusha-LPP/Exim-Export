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
 * Returns all users with safe projection (no pagination).
 * 
 * @returns {Array} - Array of user objects
 */
router.get("/api/get-all-users", async (req, res) => {
  try {
    const users = await UserModel.find({})
      .select(USER_LIST_PROJECTION)
      .lean()
      .maxTimeMS(30000); // 30 second timeout

    res.json(users);
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
