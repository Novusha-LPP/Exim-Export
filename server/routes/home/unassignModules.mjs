import express from "express";
import UserModel from "../../model/userModel.mjs";
import { requireAdmin } from "../../middleware/adminAuth.mjs";

const router = express.Router();

// Admin-only route: Unassign modules from a user
router.post("/api/unassign-modules", requireAdmin, async (req, res) => {
  const { modules, username } = req.body;

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Use single modules array - remove specified modules
    user.modules = (user.modules || []).filter(
      (module) => !modules.includes(module)
    );

    await user.save();
    res.send(user);
  } catch (err) {
    console.error("Error unassigning modules:", err);
    res.status(500).send("Server error");
  }
});

export default router;
