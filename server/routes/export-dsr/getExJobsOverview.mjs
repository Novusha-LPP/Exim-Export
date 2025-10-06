import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

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

    // Conditions based on status
    if (statusLower === "pending") {
      matchQuery.$and.push(
        { status: { $regex: "^pending$", $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        {
          $or: [
            { bill_date: { $in: [null, ""] } },
            { status: { $regex: "^pending$", $options: "i" } },
          ],
        }
      );
    } else if (statusLower === "completed") {
      matchQuery.$and.push(
        { status: { $regex: "^completed$", $options: "i" } },
        { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
        {
          $or: [
            { bill_date: { $nin: [null, ""] } },
            { status: { $regex: "^completed$", $options: "i" } },
          ],
        }
      );
    } else if (statusLower === "cancelled") {
      matchQuery.$and.push({
        $or: [
          { status: { $regex: "^cancelled$", $options: "i" } },
          { be_no: { $regex: "^cancelled$", $options: "i" } },
        ],
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
          pendingJobs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: [{ $toLower: "$status" }, "pending"] },
                    { $ne: [{ $toLower: "$be_no" }, "cancelled"] },
                    {
                      $or: [
                        { $eq: ["$bill_date", null] },
                        { $eq: ["$bill_date", ""] },
                        { $eq: [{ $toLower: "$status" }, "pending"] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          completedJobs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: [{ $toLower: "$status" }, "completed"] },
                    { $ne: [{ $toLower: "$be_no" }, "cancelled"] },
                    {
                      $or: [
                        // completed means either bill_date is not null/empty OR status is completed
                        { $ne: ["$bill_date", null] },
                        { $ne: ["$bill_date", ""] },
                        { $eq: [{ $toLower: "$status" }, "completed"] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          cancelledJobs: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: [{ $toLower: "$status" }, "cancelled"] },
                    { $eq: [{ $toLower: "$be_no" }, "cancelled"] },
                  ],
                },
                1,
                0,
              ],
            },
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
