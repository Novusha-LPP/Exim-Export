import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

// Route: /api/report/monthly-containers/:year/:month
router.get("/api/report/monthly-containers/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const { custom_house } = req.query;
  const monthInt = parseInt(month);

  try {
    // Create base match condition
    const baseMatch = {
      year,
      exporter: { $ne: null, $ne: "" },
    };

    // Add custom_house filter if provided
    if (custom_house) {
      baseMatch.custom_house = custom_house;
    }

    // Dynamic grouping
    const groupId = custom_house
      ? { exporter: "$exporter", custom_house: "$custom_house" }
      : { exporter: "$exporter" };

    const [containerStats, sbStats, leoStats, airStats] = await Promise.all([
      // CONTAINER AGGREGATION (based on LEO dates)
      // Uses operations.containerDetails[].containerSize ("20" or "40")
      // For AIR consignmentType: count as one 20ft container
      ExJobModel.aggregate([
        { $match: baseMatch },
        { $unwind: { path: "$operations", preserveNullAndEmptyArrays: false } },
        { $unwind: { path: "$operations.statusDetails", preserveNullAndEmptyArrays: false } },
        {
          $addFields: {
            leoDateParsed: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$operations.statusDetails.leoDate", null] },
                    { $ne: ["$operations.statusDetails.leoDate", ""] },
                    { $regexMatch: { input: "$operations.statusDetails.leoDate", regex: /^\d{4}-\d{2}-\d{2}/ } },
                  ],
                },
                then: { $toDate: "$operations.statusDetails.leoDate" },
                else: null,
              },
            },
          },
        },
        { $match: { leoDateParsed: { $ne: null } } },
        { $addFields: { leoMonth: { $month: "$leoDateParsed" } } },
        { $match: { leoMonth: monthInt } },
        {
          $group: {
            _id: groupId,
            container20Ft: {
              $sum: {
                $cond: [
                  // For AIR: count as 1 twenty-ft container
                  { $eq: ["$consignmentType", "AIR"] },
                  1,
                  // For non-AIR: count from containerDetails where containerSize = "20"
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ["$operations.containerDetails", []] },
                        as: "container",
                        cond: { $eq: ["$$container.containerSize", "20"] },
                      },
                    },
                  },
                ],
              },
            },
            container40Ft: {
              $sum: {
                $cond: [
                  // AIR jobs have no 40ft containers
                  { $eq: ["$consignmentType", "AIR"] },
                  0,
                  // For non-AIR: count from containerDetails where containerSize = "40"
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ["$operations.containerDetails", []] },
                        as: "container",
                        cond: { $eq: ["$$container.containerSize", "40"] },
                      },
                    },
                  },
                ],
              },
            },
            lcl20Ft: {
              $sum: {
                $cond: [
                  { $eq: ["$consignmentType", "LCL"] },
                  1,
                  0,
                ],
              },
            },
            lcl40Ft: {
              $sum: {
                $cond: [
                  { $eq: ["$consignmentType", "LCL"] },
                  0,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            exporter: "$_id.exporter",
            custom_house: custom_house ? "$_id.custom_house" : null,
            container20Ft: 1,
            container40Ft: 1,
            lcl20Ft: 1,
            lcl40Ft: 1,
          },
        },
      ]),

      // SB FILED AGGREGATION
      // SB is filed if sb_no has a value (non-null, non-empty)
      // Still filtered by sb_date month for monthly grouping
      ExJobModel.aggregate([
        {
          $match: {
            year,
            sb_no: { $ne: null, $ne: "" },
            exporter: { $ne: null, $ne: "" },
            ...(custom_house ? { custom_house } : {}),
          },
        },
        {
          $addFields: {
            sbDateObj: {
              $switch: {
                branches: [
                  // YYYY-MM-DD format
                  {
                    case: {
                      $and: [
                        { $ne: ["$sb_date", null] },
                        { $ne: ["$sb_date", ""] },
                        { $regexMatch: { input: "$sb_date", regex: /^\d{4}-\d{2}-\d{2}/ } },
                      ],
                    },
                    then: { $toDate: "$sb_date" },
                  },
                  // DD-MM-YYYY format
                  {
                    case: {
                      $and: [
                        { $ne: ["$sb_date", null] },
                        { $ne: ["$sb_date", ""] },
                        { $regexMatch: { input: "$sb_date", regex: /^\d{2}-\d{2}-\d{4}/ } },
                      ],
                    },
                    then: {
                      $dateFromString: {
                        dateString: "$sb_date",
                        format: "%d-%m-%Y",
                      },
                    },
                  },
                ],
                default: null,
              },
            },
          },
        },
        { $match: { sbDateObj: { $ne: null } } },
        { $addFields: { sbMonth: { $month: "$sbDateObj" } } },
        { $match: { sbMonth: monthInt } },
        {
          $group: {
            _id: groupId,
            sbDateCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            exporter: "$_id.exporter",
            custom_house: custom_house ? "$_id.custom_house" : null,
            sbDateCount: 1,
          },
        },
      ]),

      // LEO COUNT (monthly, exporter-wise)
      ExJobModel.aggregate([
        {
          $match: {
            year,
            exporter: { $ne: null, $ne: "" },
            ...(custom_house ? { custom_house } : {}),
          },
        },
        { $unwind: { path: "$operations", preserveNullAndEmptyArrays: false } },
        { $unwind: { path: "$operations.statusDetails", preserveNullAndEmptyArrays: false } },
        {
          $addFields: {
            leoDateObj: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$operations.statusDetails.leoDate", null] },
                    { $ne: ["$operations.statusDetails.leoDate", ""] },
                    { $regexMatch: { input: "$operations.statusDetails.leoDate", regex: /^\d{4}-\d{2}-\d{2}/ } },
                  ],
                },
                then: { $toDate: "$operations.statusDetails.leoDate" },
                else: null,
              },
            },
          },
        },
        { $match: { leoDateObj: { $ne: null } } },
        { $addFields: { leoMonth: { $month: "$leoDateObj" } } },
        { $match: { leoMonth: monthInt } },
        {
          $group: {
            _id: groupId,
            leoCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            exporter: "$_id.exporter",
            custom_house: custom_house ? "$_id.custom_house" : null,
            leoCount: 1,
          },
        },
      ]),

      // AIR CONSIGNMENT COUNT (monthly, exporter-wise based on LEO dates)
      ExJobModel.aggregate([
        {
          $match: {
            year,
            consignmentType: "AIR",
            exporter: { $ne: null, $ne: "" },
            ...(custom_house ? { custom_house } : {}),
          },
        },
        { $unwind: { path: "$operations", preserveNullAndEmptyArrays: false } },
        { $unwind: { path: "$operations.statusDetails", preserveNullAndEmptyArrays: false } },
        {
          $addFields: {
            leoDateObj: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$operations.statusDetails.leoDate", null] },
                    { $ne: ["$operations.statusDetails.leoDate", ""] },
                    { $regexMatch: { input: "$operations.statusDetails.leoDate", regex: /^\d{4}-\d{2}-\d{2}/ } },
                  ],
                },
                then: { $toDate: "$operations.statusDetails.leoDate" },
                else: null,
              },
            },
          },
        },
        { $match: { leoDateObj: { $ne: null } } },
        { $addFields: { leoMonth: { $month: "$leoDateObj" } } },
        { $match: { leoMonth: monthInt } },
        {
          $group: {
            _id: groupId,
            airCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            exporter: "$_id.exporter",
            custom_house: custom_house ? "$_id.custom_house" : null,
            airCount: 1,
          },
        },
      ]),
    ]);

    // MERGE RESULTS BY EXPORTER (+ custom_house if provided)
    const merged = {};

    for (const entry of containerStats) {
      const key = custom_house
        ? `${entry.exporter}|${entry.custom_house || ""}`
        : entry.exporter;

      merged[key] = {
        exporter: entry.exporter,
        ...(custom_house && { custom_house: entry.custom_house || "" }),
        container20Ft: entry.container20Ft,
        container40Ft: entry.container40Ft,
        lcl20Ft: entry.lcl20Ft,
        lcl40Ft: entry.lcl40Ft,
        sbDateCount: 0,
        leoCount: 0,
        airCount: 0,
      };
    }

    for (const entry of sbStats) {
      const key = custom_house
        ? `${entry.exporter}|${entry.custom_house || ""}`
        : entry.exporter;

      if (merged[key]) {
        merged[key].sbDateCount = entry.sbDateCount;
      } else {
        merged[key] = {
          exporter: entry.exporter,
          ...(custom_house && { custom_house: entry.custom_house || "" }),
          container20Ft: 0,
          container40Ft: 0,
          lcl20Ft: 0,
          lcl40Ft: 0,
          sbDateCount: entry.sbDateCount,
          leoCount: 0,
          airCount: 0,
        };
      }
    }

    for (const entry of leoStats) {
      const key = custom_house
        ? `${entry.exporter}|${entry.custom_house || ""}`
        : entry.exporter;

      if (merged[key]) {
        merged[key].leoCount = entry.leoCount;
      } else {
        merged[key] = {
          exporter: entry.exporter,
          ...(custom_house && { custom_house: entry.custom_house || "" }),
          container20Ft: 0,
          container40Ft: 0,
          lcl20Ft: 0,
          lcl40Ft: 0,
          sbDateCount: 0,
          leoCount: entry.leoCount,
          airCount: 0,
        };
      }
    }

    for (const entry of airStats) {
      const key = custom_house
        ? `${entry.exporter}|${entry.custom_house || ""}`
        : entry.exporter;

      if (merged[key]) {
        merged[key].airCount = entry.airCount;
      } else {
        merged[key] = {
          exporter: entry.exporter,
          ...(custom_house && { custom_house: entry.custom_house || "" }),
          container20Ft: 0,
          container40Ft: 0,
          lcl20Ft: 0,
          lcl40Ft: 0,
          sbDateCount: 0,
          leoCount: 0,
          airCount: entry.airCount,
        };
      }
    }

    const result = Object.values(merged).sort((a, b) =>
      a.exporter.localeCompare(b.exporter)
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Aggregation error:", error);
    res.status(500).json({
      message: "Server Error while aggregating data.",
      details: error.message,
    });
  }
});

export default router;
