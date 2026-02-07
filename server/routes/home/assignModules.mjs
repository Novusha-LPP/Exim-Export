import express from "express";
import UserModel from "../../model/userModel.mjs";
import { requireAdmin } from "../../middleware/adminAuth.mjs";

const router = express.Router();

// Admin-only route: Assign modules to a user
router.post("/api/assign-modules", requireAdmin, async (req, res) => {
  const { modules, username } = req.body;

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Use single modules array - add new modules without duplicates
    user.modules = [
      ...new Set([...(user.modules || []), ...modules]),
    ];

    await user.save();
    res.send(user);
  } catch (err) {
    console.error("Error assigning modules:", err);
    res.status(500).send("Server error");
  }
});

export default router;
