import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// GET /api/export-jobs-module-users - Get users with export-jobs module assigned
router.get("/api/export-jobs-module-users", async (req, res) => {
  try {
    // Find all users that:
    // 1. Have modules field (not null/undefined)
    // 2. Have "export-jobs" in their modules array (case-insensitive)
    const users = await UserModel.find({
      modules: { $exists: true, $ne: null },
      $expr: {
        $gt: [
          {
            $size: {
              $filter: {
                input: "$modules",
                as: "module",
                cond: {
                  $regexMatch: {
                    input: "$$module",
                    regex: "export.*jobs",
                    options: "i",
                  },
                },
              },
            },
          },
          0,
        ],
      },
    }).select("username first_name last_name id modules");

    const formattedUsers = users.map((user) => ({
      id: user._id,
      username: user.username,
      fullName:
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.username,
      modules: user.modules,
    }));

    res.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    console.error("Error fetching export-jobs module users:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
});

export default router;
