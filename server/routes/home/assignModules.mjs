import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.post("/api/assign-modules", async (req, res) => {
  const { modules, username, category } = req.body;

  if (!["Transport", "Import", "Export"].includes(category)) {
    return res.status(400).send("Invalid category");
  }

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).send("User not found");
    }

    if (category === "Transport") {
      user.transport_modules = [
        ...new Set([...(user.transport_modules || []), ...modules]),
      ];
    } else if (category === "Import") {
      user.import_modules = [
        ...new Set([...(user.import_modules || []), ...modules]),
      ];
    } else if (category === "Export") {
      user.export_modules = [
        ...new Set([...(user.export_modules || []), ...modules]),
      ];
    }

    await user.save();
    res.send(user);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

export default router;
