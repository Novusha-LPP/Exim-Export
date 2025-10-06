import express from "express";
import UserModel from "../../model/userModel.mjs";
import ImporterModel from "../../model/importerSchemaModel.mjs";
const router = express.Router();

router.post("/api/assign-role", async (req, res) => {
  const { username, role } = req.body;

  try {
    // Find the user by username
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Update the user's role
    user.role = role;
    await user.save();

    // Return the updated user object
    res.status(200).send({
      message: "User role assigned successfully",
      updatedUser: {
        username: user.username,
        role: user.role,
        employee_photo: user.employee_photo || null,
        assigned_importer: user.assigned_importer || [],
      },
    });
  } catch (error) {
    console.error("Error assigning role:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

router.get("/api/users-by-role", async (req, res) => {
  const { role } = req.query;

  if (!role) {
    return res.status(400).send({
      success: false,
      message: "Role is required",
    });
  }

  try {
    const users = await UserModel.find(
      { role },
      "username role employee_photo  assigned_importer_name"
    );

    if (users.length === 0) {
      return res.status(200).send({
        success: true,
        message: `No users found for the role: ${role}`,
        users: [],
      });
    }

    res.status(200).send({
      success: true,
      message: "Users fetched successfully",
      users,
    });
  } catch (error) {
    console.error("Error fetching users by role:", error);
    res.status(500).send({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

// PATCH: Add an importer to a user
router.patch("/api/users/:username/add-importer", async (req, res) => {
  const { username } = req.params;
  const { importerName } = req.body;

  if (!importerName) {
    return res.status(400).send({ message: "Importer name is required" });
  }

  try {
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    if (user.assigned_importer.includes(importerName)) {
      return res
        .status(400)
        .send({ message: "Importer already assigned to this user" });
    }

    user.assigned_importer.push(importerName);
    await user.save();

    res.status(200).send({
      message: "Importer added successfully",
      assigned_importer: user.assigned_importer,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
});
export default router;
