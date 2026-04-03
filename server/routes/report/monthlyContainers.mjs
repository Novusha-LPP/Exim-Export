import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

// Route: /api/report/monthly-containers/:year/:month
router.get("/api/report/monthly-containers/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const { custom_house, branch_code } = req.query;
  const monthInt = parseInt(month);

  try {
    // Create base match condition
    const baseMatch = {
      year,
      exporter: { $ne: null, $ne: "" },
    };

    // Add custom_house filter if provided
    if (custom_house) {
      baseMatch.custom_house = { $regex: new RegExp(`^${custom_house}$`, 'i') };
    }
    
    // Add branch_code filter if provided
    if (branch_code) {
      baseMatch.branch_code = branch_code;
    }

    // Dynamic grouping
    const groupId = custom_house
      ? { exporter: "$exporter", custom_house: "$custom_house" }
      : { exporter: "$exporter" };

    const [containerStats, sbStats, leoStats, airStats] = await Promise.all([
      // 1. CONTAINER & VOLUME AGGREGATION (based on LEO or SB dates)
      ExJobModel.aggregate([
        { $match: baseMatch },
        {
          $addFields: {
            // 1. Identify if SB was filed in this month
            sbDateObj: {
              $switch: {
                branches: [
                  {
                    case: { $regexMatch: { input: { $toString: { $ifNull: ["$sb_date", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}" } },
                    then: { $toDate: "$sb_date" },
                  },
                  {
                    case: { $regexMatch: { input: { $toString: { $ifNull: ["$sb_date", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}" } },
                    then: { $dateFromString: { dateString: "$sb_date", format: "%d-%m-%Y" } }
                  },
                ],
                default: null,
              },
            },
            // 2. Identify all possible LEO dates
            leoDates: {
              $concatArrays: [
                {
                  $reduce: {
                    input: { $ifNull: ["$operations", []] },
                    initialValue: [],
                    in: {
                      $concatArrays: [
                        "$$value",
                        {
                          $reduce: {
                            input: { $ifNull: ["$$this.statusDetails", []] },
                            initialValue: [],
                            in: { $concatArrays: ["$$value", [{ $ifNull: ["$$this.leoDate", ""] }]] }
                          }
                        }
                      ]
                    }
                  }
                },
                [{ $ifNull: ["$leo_date", ""] }]
              ]
            }
          }
        },
        {
          $addFields: {
            isSbInMonth: { $eq: [{ $month: { $ifNull: ["$sbDateObj", new Date(0)] } }, monthInt] },
            isLeoInMonth: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$leoDates",
                      as: "d",
                      cond: {
                        $let: {
                          vars: {
                            parsed: {
                              $switch: {
                                branches: [
                                  {
                                    case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}" } },
                                    then: { $toDate: "$$d" }
                                  },
                                  {
                                    case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}" } },
                                    then: { $dateFromString: { dateString: "$$d", format: "%d-%m-%Y" } }
                                  }
                                ],
                                default: null
                              }
                            }
                          },
                          in: {
                            $and: [
                              { $ne: ["$$parsed", null] },
                              { $eq: [{ $month: { $ifNull: ["$$parsed", new Date(0)] } }, monthInt] }
                            ]
                          }
                        }
                      }
                    }
                  }
                },
                0
              ]
            }
          }
        },
        {
          $match: {
            $or: [{ isSbInMonth: true }, { isLeoInMonth: true }]
          }
        },
        {
          $group: {
            _id: groupId,
            container20Ft: {
              $sum: {
                $cond: [
                  { $eq: ["$consignmentType", "AIR"] },
                  1,
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ["$containers", []] },
                        as: "c",
                        cond: {
                          $or: [
                            { $eq: ["$$c.containerSize", "20"] },
                            { $regexMatch: { input: { $toString: { $ifNull: ["$$c.type", ""] } }, regex: "\\b20\\b" } }
                          ]
                        }
                      }
                    }
                  }
                ]
              }
            },
            container40Ft: {
              $sum: {
                $cond: [
                  { $eq: ["$consignmentType", "AIR"] },
                  0,
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ["$containers", []] },
                        as: "c",
                        cond: {
                          $or: [
                            { $eq: ["$$c.containerSize", "40"] },
                            { $regexMatch: { input: { $toString: { $ifNull: ["$$c.type", ""] } }, regex: "\\b40\\b" } }
                          ]
                        }
                      }
                    }
                  }
                ]
              }
            },
            lcl20Ft: {
              $sum: { $cond: [{ $eq: ["$consignmentType", "LCL"] }, 1, 0] }
            },
            lcl40Ft: {
              $sum: { $cond: [{ $eq: ["$consignmentType", "LCL"] }, 0, 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            exporter: "$_id.exporter",
            custom_house: custom_house ? "$_id.custom_house" : null,
            container20Ft: 1,
            container40Ft: 1,
            lcl20Ft: 1,
            lcl40Ft: 1
          }
        }
      ]),

      // 2. SB FILED AGGREGATION
      ExJobModel.aggregate([
        {
          $match: {
            ...baseMatch,
            sb_no: { $ne: null, $ne: "" },
          },
        },
        {
          $addFields: {
            sbDateObj: {
              $switch: {
                branches: [
                  {
                    case: { $regexMatch: { input: { $toString: { $ifNull: ["$sb_date", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}" } },
                    then: { $toDate: "$sb_date" },
                  },
                  {
                    case: { $regexMatch: { input: { $toString: { $ifNull: ["$sb_date", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}" } },
                    then: { $dateFromString: { dateString: "$sb_date", format: "%d-%m-%Y" } }
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
            sbDateCount: { $sum: 1 }
          },
        },
        {
          $project: {
            _id: 0,
            exporter: "$_id.exporter",
            custom_house: custom_house ? "$_id.custom_house" : null,
            sbDateCount: 1
          },
        },
      ]),

      // 3. LEO COUNT (monthly, exporter-wise)
      ExJobModel.aggregate([
        { $match: baseMatch },
        {
          $addFields: {
            // Flatten LEO dates from nested and top-level
            leoDates: {
              $concatArrays: [
                {
                  $reduce: {
                    input: { $ifNull: ["$operations", []] },
                    initialValue: [],
                    in: {
                      $concatArrays: [
                        "$$value",
                        {
                          $reduce: {
                            input: { $ifNull: ["$$this.statusDetails", []] },
                            initialValue: [],
                            in: { $concatArrays: ["$$value", [{ $ifNull: ["$$this.leoDate", ""] }]] }
                          }
                        }
                      ]
                    }
                  }
                },
                [{ $ifNull: ["$leo_date", ""] }]
              ]
            }
          }
        },
        {
          $addFields: {
            matchedInMonth: {
              $size: {
                $filter: {
                  input: "$leoDates",
                  as: "d",
                  cond: {
                    $let: {
                      vars: {
                        parsed: {
                          $switch: {
                            branches: [
                              {
                                case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}" } },
                                then: { $toDate: "$$d" }
                              },
                              {
                                case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}" } },
                                then: { $dateFromString: { dateString: "$$d", format: "%d-%m-%Y" } }
                              }
                            ],
                            default: null
                          }
                        }
                      },
                      in: {
                        $and: [
                          { $ne: ["$$parsed", null] },
                          { $eq: [{ $month: { $ifNull: ["$$parsed", new Date(0)] } }, monthInt] }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        { $match: { matchedInMonth: { $gt: 0 } } },
        {
          $group: {
            _id: groupId,
            leoCount: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            exporter: "$_id.exporter",
            custom_house: custom_house ? "$_id.custom_house" : null,
            leoCount: 1
          }
        }
      ]),

      // 4. AIR CONSIGNMENT COUNT (monthly, exporter-wise based on LEO dates)
      ExJobModel.aggregate([
        {
          $match: {
            ...baseMatch,
            consignmentType: "AIR",
          },
        },
        {
          $addFields: {
            leoDates: {
              $concatArrays: [
                {
                  $reduce: {
                    input: { $ifNull: ["$operations", []] },
                    initialValue: [],
                    in: {
                      $concatArrays: [
                        "$$value",
                        {
                          $reduce: {
                            input: { $ifNull: ["$$this.statusDetails", []] },
                            initialValue: [],
                            in: { $concatArrays: ["$$value", [{ $ifNull: ["$$this.leoDate", ""] }]] }
                          }
                        }
                      ]
                    }
                  }
                },
                [{ $ifNull: ["$leo_date", ""] }]
              ]
            }
          }
        },
        {
          $addFields: {
            matchedInMonth: {
              $size: {
                $filter: {
                  input: "$leoDates",
                  as: "d",
                  cond: {
                    $let: {
                      vars: {
                        parsed: {
                          $switch: {
                            branches: [
                              {
                                case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}" } },
                                then: { $toDate: "$$d" }
                              },
                              {
                                case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}" } },
                                then: { $dateFromString: { dateString: "$$d", format: "%d-%m-%Y" } }
                              }
                            ],
                            default: null
                          }
                        }
                      },
                      in: {
                        $and: [
                          { $ne: ["$$parsed", null] },
                          { $eq: [{ $month: { $ifNull: ["$$parsed", new Date(0)] } }, monthInt] }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        { $match: { matchedInMonth: { $gt: 0 } } },
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
