import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// Helper to build search conditions
const buildSearchQuery = (search) => {
  return {
    $or: [
      { status: { $regex: search, $options: "i" } },
      { be_no: { $regex: search, $options: "i" } },
      { bill_date: { $regex: search, $options: "i" } },
    ],
  };
};

router.get("/api/get-exjobs-overview/:year", async (req, res) => {
  try {
    const { year } = req.params;
    const status = req.query.status;
    const search = req.query.search;

    const statusLower = status ? status.toLowerCase() : null;

    // Start building the match query
    const matchQuery = { $and: [{ year: year }] };

    // Fetch user restrictions
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin") {
        if (requester.selected_branches && requester.selected_branches.length > 0) {
          matchQuery.$and.push({ branch_code: { $in: requester.selected_branches } });
        }
        if (requester.selected_ports && requester.selected_ports.length > 0) {
          matchQuery.$and.push({
            $or: [
              { custom_house: { $in: requester.selected_ports } },
              { port_of_loading: { $in: requester.selected_ports } }
            ]
          });
        }
      }
    }

    // Conditions based on status
    if (statusLower === "pending") {
      matchQuery.$and.push({
        $and: [
          { status: { $not: { $regex: "^completed", $options: "i" } } },
          { isCompleted: { $ne: true } },
          { status: { $not: { $regex: "^cancelled", $options: "i" } } },
          { isJobCanceled: { $ne: true } }
        ]
      });
    } else if (statusLower === "completed") {
      matchQuery.$and.push({
        $or: [
          { status: { $regex: "^completed", $options: "i" } },
          { isCompleted: true }
        ]
      });
    } else if (statusLower === "cancelled") {
      matchQuery.$and.push({
        $or: [
          { status: { $regex: "^cancelled", $options: "i" } },
          { isJobCanceled: true }
        ]
      });
    }

    // Add search conditions if provided
    if (search) {
      matchQuery.$and.push(buildSearchQuery(search));
    }

    const jobCounts = await ExJobModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          completedJobs: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: [{ $trim: { input: { $toLower: { $ifNull: ["$status", ""] } } } }, "completed"] },
                    { $eq: ["$isCompleted", true] }
                  ]
                },
                1, 0
              ]
            }
          },
          cancelledJobs: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: [{ $trim: { input: { $toLower: { $ifNull: ["$status", ""] } } } }, "cancelled"] },
                    { $eq: ["$isJobCanceled", true] }
                  ]
                },
                1, 0
              ]
            }
          },
          pendingJobs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: [{ $trim: { input: { $toLower: { $ifNull: ["$status", ""] } } } }, "completed"] },
                    { $ne: ["$isCompleted", true] },
                    { $ne: [{ $trim: { input: { $toLower: { $ifNull: ["$status", ""] } } } }, "cancelled"] },
                    { $ne: ["$isJobCanceled", true] }
                  ]
                },
                1, 0
              ]
            }
          },
          totalJobs: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          pendingJobs: 1,
          completedJobs: 1,
          cancelledJobs: 1,
          totalJobs: 1,
        },
      },
    ]);

    const responseObj = jobCounts[0] || {
      pendingJobs: 0,
      completedJobs: 0,
      cancelledJobs: 0,
      totalJobs: 0,
    };

    res.json(responseObj);
  } catch (error) {
    console.error("Error fetching job counts:", error);
    res.status(500).json({ error: "Error fetching job counts" });
  }
});

export default router;
