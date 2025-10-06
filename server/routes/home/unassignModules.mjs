import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.post("/api/unassign-modules", async (req, res) => {
  const { modules, username, category } = req.body;

  if (!["Transport", "Import", "Export"].includes(category)) {
    return res.status(400).send("Invalid category");
  }

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Fix: Use the modules array directly from req.body
    // The modules should be an array of module names to remove
    if (category === "Transport") {
      user.transport_modules = (user.transport_modules || []).filter(
        (module) => !modules.includes(module)
      );
    } else if (category === "Import") {
      user.import_modules = (user.import_modules || []).filter(
        (module) => !modules.includes(module)
      );
    } else if (category === "Export") {
      user.export_modules = (user.export_modules || []).filter(
        (module) => !modules.includes(module)
      );
    }

    await user.save();
    res.send(user);
  } catch (err) {
    console.error("Error unassigning modules:", err);
    res.status(500).send("Server error");
  }
});

export default router;
