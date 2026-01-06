import express from "express";
import OpenPointProject from "../../model/openPoints/openPointProjectModel.mjs";
import OpenPoint from "../../model/openPoints/openPointModel.mjs";
import UserModel from "../../model/userModel.mjs";
import mongoose from "mongoose";

const router = express.Router();

// Middleware to verify if user is part of the project
const verifyProjectAccess = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.headers["user-id"]; // Assuming user-id is passed in headers

    if (!userId) {
      // console.log("Debug Auth: Missing User ID");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const project = await OpenPointProject.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const isOwner = project.owner.toString() === userId;
    const isMember = project.team_members.some(
      (m) => m.user.toString() === userId
    );

    if (!isOwner && !isMember) {
      return res
        .status(403)
        .json({ error: "Access Denied: You are not part of this project" });
    }

    req.project = project;
    req.userRole = isOwner
      ? "L4"
      : project.team_members.find((m) => m.user.toString() === userId)?.role;
    next();
  } catch (error) {
    console.error("Access Verify Error", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// --- Projects ---

// Create Project (L3/L4 Only - simplified to anyone for now, restrict in UI or added middleware)

// Create Project (L3/L4 Only - simplified to anyone for now, restrict in UI or added middleware)
router.post("/api/open-points/projects", async (req, res) => {
  try {
    // console.log("Create Project Request Body:", req.body);
    const { name, description, ownerUsername, team_members } = req.body;

    if (!ownerUsername) {
      console.error("Missing ownerUsername in request");
      return res.status(400).json({ error: "Owner username is required." });
    }

    // Look up user by username
    const owner = await UserModel.findOne({ username: ownerUsername });
    if (!owner) {
      return res.status(404).json({ error: "Owner user not found" });
    }

    const project = new OpenPointProject({
      name,
      description,
      owner: owner._id,
      team_members,
    });
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    console.error("Create Project Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Project (Owner Only)
router.delete("/api/open-points/projects/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.headers["user-id"];

    const project = await OpenPointProject.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    // Check if requester is owner
    if (project.owner.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Only project owner can delete the project" });
    }

    // Delete associated points first
    await OpenPoint.deleteMany({ project_id: projectId });

    // Delete project
    await OpenPointProject.findByIdAndDelete(projectId);

    res.json({
      message: "Project and all associated points deleted successfully",
    });
  } catch (error) {
    console.error("Delete Project Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add Member to Project (and auto-assign Open Points module)
router.post(
  "/api/open-points/project/:projectId/add-member",
  async (req, res) => {
    try {
      const { username, role } = req.body;
      const project = await OpenPointProject.findById(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const user = await UserModel.findOne({ username });
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check if already member
      const isMember = project.team_members.some(
        (m) => m.user.toString() === user._id.toString()
      );
      if (isMember)
        return res.status(400).json({ error: "User is already a member" });

      // Add to Project
      project.team_members.push({
        user: user._id,
        role: role || "L2",
        added_at: new Date(),
      });
      await project.save();

      // Auto-assign "Open Points" module if not present
      if (!user.access_modules) user.access_modules = [];
      if (!user.access_modules.includes("Open Points")) {
        user.access_modules.push("Open Points");
        await user.save();
      }

      res.json({ message: "Member added and module assigned", project });
    } catch (error) {
      console.error("Add Member Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Remove Member from Project (Owner only)
router.post(
  "/api/open-points/project/:projectId/remove-member",
  async (req, res) => {
    try {
      const { username, userId } = req.body;
      const project = await OpenPointProject.findById(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      // requester must be owner
      const requesterId = req.headers["user-id"];
      if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
      if (project.owner.toString() !== requesterId)
        return res
          .status(403)
          .json({ error: "Only project owner can remove members" });

      // find user by username or id
      let user = null;
      if (username) user = await UserModel.findOne({ username });
      else if (userId) user = await UserModel.findById(userId);

      if (!user) return res.status(404).json({ error: "User not found" });

      // Prevent removing owner
      if (project.owner.toString() === user._id.toString())
        return res.status(400).json({ error: "Cannot remove project owner" });

      // Remove from team_members
      const before = project.team_members.length;
      project.team_members = project.team_members.filter(
        (m) => m.user.toString() !== user._id.toString()
      );
      if (project.team_members.length === before)
        return res.status(400).json({ error: "User is not a member" });

      await project.save();

      // Unassign points for this user in this project
      await OpenPoint.updateMany(
        { project_id: req.params.projectId, responsible_person: user._id },
        { $unset: { responsible_person: 1 }, $set: { responsibility: "" } }
      );

      res.json({ message: "Member removed", project });
    } catch (error) {
      console.error("Remove Member Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get My Projects
router.get("/api/open-points/my-projects", async (req, res) => {
  try {
    const username = req.headers["username"] || req.headers["x-username"];
    console.log("GET My Projects - Username from headers:", username);
    console.log("GET My Projects - All headers:", req.headers);

    if (!username) {
      return res
        .status(401)
        .json({ error: "Username not provided in headers" });
    }

    // Look up user by username
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const projects = await OpenPointProject.find({
      $or: [{ owner: user._id }, { "team_members.user": user._id }],
    })
      .populate("owner", "username")
      .populate("team_members.user", "username employee_photo");

    // Calculate health stats for each project
    const projectStats = await Promise.all(
      projects.map(async (p) => {
        const points = await OpenPoint.find({ project_id: p._id });

        // Project Stats
        const red = points.filter((pt) => pt.status === "Red").length;
        const yellow = points.filter((pt) => pt.status === "Yellow").length;
        const orange = points.filter((pt) => pt.status === "Orange").length;
        const green = points.filter((pt) => pt.status === "Green").length;

        // My Stats (Assigned to me)
        const myPoints = points.filter(
          (pt) =>
            pt.responsible_person &&
            pt.responsible_person.toString() === user._id.toString()
        );
        const myRed = myPoints.filter((pt) => pt.status === "Red").length;
        const myYellow = myPoints.filter((pt) => pt.status === "Yellow").length;
        const myOrange = myPoints.filter((pt) => pt.status === "Orange").length;
        const myGreen = myPoints.filter((pt) => pt.status === "Green").length;

        return {
          ...p.toObject(),
          stats: { red, yellow, orange, green, total: points.length },
          myStats: {
            red: myRed,
            yellow: myYellow,
            orange: myOrange,
            green: myGreen,
            total: myPoints.length,
          },
        };
      })
    );

    res.json(projectStats);
  } catch (error) {
    console.error("Get My Projects Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- Points ---

// Get Project Details (including team members)
router.get(
  "/api/open-points/project/:projectId",
  verifyProjectAccess,
  async (req, res) => {
    try {
      const project = await OpenPointProject.findById(req.params.projectId)
        .populate("owner", "username")
        .populate("team_members.user", "username email");

      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get Points for Project
router.get(
  "/api/open-points/project/:projectId/points",
  verifyProjectAccess,
  async (req, res) => {
    try {
      // Auto-update overdue points
      const today = new Date();
      await OpenPoint.updateMany(
        {
          project_id: req.params.projectId,
          status: { $ne: "Green" },
          target_date: { $lt: today },
        },
        {
          $set: { status: "Red" },
        }
      );

      const points = await OpenPoint.find({ project_id: req.params.projectId })
        .populate("responsible_person", "username")
        .populate("reviewer", "username")
        .sort({ status: 1, target_date: 1 }); // Sort by status Priority (Red logic needs custom sort but simplified)

      res.json(points);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create Point
router.post("/api/open-points/points", async (req, res) => {
  try {
    const point = new OpenPoint(req.body);
    await point.save();
    res.status(201).json(point);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Point (Generic)
router.put("/api/open-points/points/:pointId", async (req, res) => {
  try {
    const { status, remarks, evidence, userId, ...otherFields } = req.body;
    const point = await OpenPoint.findById(req.params.pointId);

    if (!point) return res.status(404).json({ error: "Point not found" });

    // 1. Handle Status Change Logic
    if (status && status !== point.status) {
      // Logic: Green requires evidence
      // Start of Logic: Green used to require evidence, but we are disabling this check for now as UI for evidence is not ready.
      // if (status === 'Green' && (!evidence || evidence.length === 0)) { ... }

      point.status = status;
      if (status === "Green") point.completion_date = new Date();

      point.history.push({
        action: `Status changed to ${status}`,
        changed_by: userId,
        remarks: remarks || "",
        timestamp: new Date(),
      });
    }

    // 2. Handle Evidence Update
    if (evidence && evidence.length > 0) {
      point.evidence = [...point.evidence, ...evidence];
    }

    // 3. Handle Other Fields (Excel Inline Edits)
    Object.keys(otherFields).forEach((key) => {
      if (key !== "history" && key !== "_id") {
        // Protect sensitive fields
        point[key] = otherFields[key];
      }
    });

    await point.save();
    res.json(point);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Point
router.delete("/api/open-points/points/:pointId", async (req, res) => {
  try {
    const point = await OpenPoint.findByIdAndDelete(req.params.pointId);
    if (!point) return res.status(404).json({ error: "Point not found" });
    res.json({ message: "Point deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics Endpoint
router.get("/api/open-points/analytics/global", async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    // Find projects user has access to
    const projects = await OpenPointProject.distinct("_id", {
      $or: [{ owner: userId }, { "team_members.user": userId }],
    });

    const stats = await OpenPoint.aggregate([
      { $match: { project_id: { $in: projects } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Assignment Endpoints ---

// Get All Project Names (for Assignment UI)
router.get("/api/open-points/all-project-names", async (req, res) => {
  try {
    const projects = await OpenPointProject.find({}, "name");
    res.json(projects.map((p) => p.name).sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User's Assigned Project Names
router.get(
  "/api/open-points/user/:username/assigned-projects",
  async (req, res) => {
    try {
      const user = await UserModel.findOne({ username: req.params.username });
      if (!user) return res.status(404).json({ error: "User not found" });

      const projects = await OpenPointProject.find(
        {
          $or: [{ owner: user._id }, { "team_members.user": user._id }],
        },
        "name"
      );
      res.json(projects.map((p) => p.name).sort());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Assign Projects to User (Bulk Update)
router.post(
  "/api/open-points/user/:username/assign-projects",
  async (req, res) => {
    try {
      const { projectNames } = req.body; // Array of strings
      const user = await UserModel.findOne({ username: req.params.username });
      if (!user) return res.status(404).json({ error: "User not found" });

      // 1. Remove user from ALL projects first (to handle unassignment)
      // only remove from team_members, do NOT touch owner field
      await OpenPointProject.updateMany(
        { "team_members.user": user._id },
        { $pull: { team_members: { user: user._id } } }
      );

      // 2. Add user to the projects in the list
      if (projectNames && projectNames.length > 0) {
        await OpenPointProject.updateMany(
          { name: { $in: projectNames } },
          {
            $addToSet: {
              team_members: {
                user: user._id,
                role: "L2", // Default role for assigned members
                added_at: new Date(),
              },
            },
          }
        );
      }

      res.json({ message: "Projects assigned successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
