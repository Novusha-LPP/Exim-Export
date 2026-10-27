import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";

const router = express.Router();

// Route: /api/report/monthly-containers/:year/:month
router.get("/api/report/monthly-containers/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const { custom_house, branch_code } = req.query;
  const isWholeYear = month === "all" || month === "0" || month === "whole_year";
  const monthInt = isWholeYear ? null : parseInt(month);

  try {
    // Create base match condition
    const baseMatch = {
      year,
      exporter: { $ne: null, $ne: "" },
      isGeneralJob: { $ne: true },
      job_no: { $not: /^FF/i },
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
                    case: { $regexMatch: { input: { $toString: { $ifNull: ["$sb_date", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}$" } },
                    then: { $toDate: "$sb_date" },
                  },
                  {
                    case: { $regexMatch: { input: { $toString: { $ifNull: ["$sb_date", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } },
                    then: { $dateFromString: { dateString: "$sb_date", format: "%d-%m-%Y", onError: null } }
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
        ...(isWholeYear ? [
          {
            $match: {
              $expr: {
                $or: [
                  { $ne: ["$sbDateObj", null] },
                  { $gt: [{ $size: "$leoDates" }, 0] }
                ]
              }
            }
          }
        ] : [
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
                                      case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}$" } },
                                      then: { $toDate: "$$d" }
                                    },
                                    {
                                      case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } },
                                      then: { $dateFromString: { dateString: "$$d", format: "%d-%m-%Y", onError: null } }
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
          }
        ]),
        {
          $group: {
            _id: groupId,
            container20Ft: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ["$consignmentType", "AIR"] }, { $eq: ["$consignmentType", "LCL"] }] },
                  0,
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
                  { $or: [{ $eq: ["$consignmentType", "AIR"] }, { $eq: ["$consignmentType", "LCL"] }] },
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
              $sum: {
                $cond: [
                  { $eq: ["$consignmentType", "LCL"] },
                  {
                    $cond: [
                      {
                        $gt: [
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
                          },
                          0
                        ]
                      },
                      0,
                      {
                        $max: [
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
                    ]
                  },
                  0
                ]
              }
            },
            lcl40Ft: {
              $sum: {
                $cond: [
                  { $eq: ["$consignmentType", "LCL"] },
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
                  },
                  0
                ]
              }
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
                    case: { $regexMatch: { input: { $toString: { $ifNull: ["$sb_date", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}$" } },
                    then: { $toDate: "$sb_date" },
                  },
                  {
                    case: { $regexMatch: { input: { $toString: { $ifNull: ["$sb_date", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } },
                    then: { $dateFromString: { dateString: "$sb_date", format: "%d-%m-%Y", onError: null } }
                  },
                ],
                default: null,
              },
            },
          },
        },
        { $match: { sbDateObj: { $ne: null } } },
        ...(isWholeYear ? [] : [
          { $addFields: { sbMonth: { $month: "$sbDateObj" } } },
          { $match: { sbMonth: monthInt } }
        ]),
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
        ...(isWholeYear ? [
          {
            $addFields: {
              matchedInMonth: {
                $size: {
                  $filter: {
                    input: "$leoDates",
                    as: "d",
                    cond: { $ne: ["$$d", ""] }
                  }
                }
              }
            }
          }
        ] : [
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
                                  case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}$" } },
                                  then: { $toDate: "$$d" }
                                },
                                {
                                  case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } },
                                  then: { $dateFromString: { dateString: "$$d", format: "%d-%m-%Y", onError: null } }
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
          }
        ]),
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
        ...(isWholeYear ? [
          {
            $addFields: {
              matchedInMonth: {
                $size: {
                  $filter: {
                    input: "$leoDates",
                    as: "d",
                    cond: { $ne: ["$$d", ""] }
                  }
                }
              }
            }
          }
        ] : [
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
                                  case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}$" } },
                                  then: { $toDate: "$$d" }
                                },
                                {
                                  case: { $regexMatch: { input: { $toString: { $ifNull: ["$$d", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } },
                                  then: { $dateFromString: { dateString: "$$d", format: "%d-%m-%Y", onError: null } }
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
          }
        ]),
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

// Route: /api/report/freight-forwarding-monthly/:year/:month
router.get("/api/report/freight-forwarding-monthly/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const { shipment_type } = req.query;
  const isWholeYear = month === "all" || month === "0" || month === "whole_year";
  const monthInt = isWholeYear ? null : parseInt(month);

  try {
    const baseMatch = {
      organization_name: { $ne: null, $ne: "" }
    };

    if (shipment_type && shipment_type !== "all" && shipment_type !== "") {
      baseMatch.shipment_type = { $regex: new RegExp(`^${shipment_type.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, "i") };
    }

    const stats = await FreightEnquiryModel.aggregate([
      {
        $addFields: {
          dateObj: {
            $switch: {
              branches: [
                {
                  case: { $regexMatch: { input: { $toString: { $ifNull: ["$enquiry_date", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}$" } },
                  then: { $toDate: "$enquiry_date" },
                },
                {
                  case: { $regexMatch: { input: { $toString: { $ifNull: ["$enquiry_date", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } },
                  then: { $dateFromString: { dateString: "$enquiry_date", format: "%d-%m-%Y", onError: null } }
                },
              ],
              default: null,
            },
          }
        }
      },
      {
        $addFields: {
          enquiryMonth: { $month: "$dateObj" },
          enquiryYearStr: {
            $let: {
              vars: {
                y: { $year: "$dateObj" },
                m: { $month: "$dateObj" }
              },
              in: {
                $cond: {
                  if: { $gte: ["$$m", 4] },
                  then: {
                    $concat: [
                      { $substr: [{ $toString: "$$y" }, 2, 2] },
                      "-",
                      { $substr: [{ $toString: { $add: ["$$y", 1] } }, 2, 2] }
                    ]
                  },
                  else: {
                    $concat: [
                      { $substr: [{ $toString: { $subtract: ["$$y", 1] } }, 2, 2] },
                      "-",
                      { $substr: [{ $toString: "$$y" }, 2, 2] }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      {
        $match: {
          ...baseMatch,
          enquiryYearStr: year,
          ...(isWholeYear ? {} : { enquiryMonth: monthInt })
        }
      },
      {
        $group: {
          _id: "$organization_name",
          leoCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$documents.leo_copy", null] },
                    { $ne: ["$documents.leo_copy", ""] }
                  ]
                },
                1,
                0
              ]
            }
          },
          sbDateCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $and: [{ $ne: ["$documents.invoice", null] }, { $ne: ["$documents.invoice", ""] }] },
                    { $and: [{ $ne: ["$documents.booking_copy", null] }, { $ne: ["$documents.booking_copy", ""] }] }
                  ]
                },
                1,
                0
              ]
            }
          },
          container20Ft: {
            $sum: {
              $cond: [
                { $regexMatch: { input: { $toLower: { $ifNull: ["$shipment_type", ""] } }, regex: "air" } },
                0,
                {
                  $cond: [
                    { $regexMatch: { input: { $toLower: { $ifNull: ["$container_size", ""] } }, regex: "20" } },
                    { $cond: [ { $gt: [{ $size: { $ifNull: ["$containers", []] } }, 0] }, { $size: "$containers" }, 1 ] },
                    0
                  ]
                }
              ]
            }
          },
          container40Ft: {
            $sum: {
              $cond: [
                { $regexMatch: { input: { $toLower: { $ifNull: ["$shipment_type", ""] } }, regex: "air" } },
                0,
                {
                  $cond: [
                    { $regexMatch: { input: { $toLower: { $ifNull: ["$container_size", ""] } }, regex: "40" } },
                    { $cond: [ { $gt: [{ $size: { $ifNull: ["$containers", []] } }, 0] }, { $size: "$containers" }, 1 ] },
                    0
                  ]
                }
              ]
            }
          },
          airCount: {
            $sum: {
              $cond: [
                { $regexMatch: { input: { $toLower: { $ifNull: ["$shipment_type", ""] } }, regex: "air" } },
                1,
                0
              ]
            }
          },
          lcl20Ft: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$consignment_type", "LCL"] },
                    { $not: { $regexMatch: { input: { $toLower: { $ifNull: ["$container_size", ""] } }, regex: "40" } } }
                  ]
                },
                1,
                0
              ]
            }
          },
          lcl40Ft: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$consignment_type", "LCL"] },
                    { $regexMatch: { input: { $toLower: { $ifNull: ["$container_size", ""] } }, regex: "40" } }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          exporter: "$_id",
          leoCount: 1,
          sbDateCount: 1,
          container20Ft: 1,
          container40Ft: 1,
          airCount: 1,
          lcl20Ft: 1,
          lcl40Ft: 1
        }
      },
      { $sort: { exporter: 1 } }
    ]);

    res.status(200).json(stats);
  } catch (error) {
    console.error("❌ Aggregation error for Freight Forwarding:", error);
    res.status(500).json({
      message: "Server Error while aggregating Freight Forwarding data.",
      details: error.message,
    });
  }
});

// Helper to normalize Freight Forwarding port names
function normalizeFfPort(pol, pod, shipmentType) {
  const isImport = (shipmentType || "").toLowerCase().includes("import");
  const rawPort = (isImport && pod ? pod : pol) || pol || pod || "DIRECT / OTHER";
  const upper = String(rawPort).toUpperCase().trim();

  if (upper.includes("AMD4") || upper.includes("AHMEDABAD AIR")) return "AHMEDABAD AIR";
  if (upper.includes("MUNDRA")) return "MUNDRA";
  if (upper.includes("NHAVA") || upper.includes("NSA1")) return "NHAVA SHEVA";
  if (upper.includes("HAZIRA") || upper.includes("HZA1")) return "HAZIRA";
  if (upper.includes("PIPAVAV") || upper.includes("PPV")) return "PORT PIPAVAV";
  if (upper.includes("SHANGHAI PU DONG") || upper.includes("PVG")) return "SHANGHAI AIR";
  if (upper.includes("SHANGHAI") || upper.includes("SHA")) return "SHANGHAI";
  if (upper.includes("SHEKOU") || upper.includes("SHK")) return "SHEKOU";
  if (upper.includes("NINGBO") || upper.includes("NGB")) return "NINGBO";
  if (upper.includes("TIANJIN") || upper.includes("TXG")) return "TIANJIN";
  if (upper.includes("QINGDAO") || upper.includes("TAO")) return "QINGDAO";
  if (upper.includes("MILAN") || upper.includes("MXP")) return "MILAN AIR";
  if (upper.includes("VENEZIA") || upper.includes("VENICE") || upper.includes("VCE")) return "VENICE";
  if (upper.includes("KANDLA")) return "KANDLA";
  if (upper.includes("COCHIN") || upper.includes("COK")) return "COCHIN";

  const match = upper.match(/^[A-Z0-9]+\s*-\s*(.+)$/);
  if (match) return match[1].trim();
  const matchParen = upper.match(/^\([A-Z0-9]+\)\s*(.+)$/);
  if (matchParen) return matchParen[1].trim();

  return upper || "DIRECT / OTHER";
}

// Route: /api/report/freight-forwarding-summary/:year/:month
// Detailed / job-level data for SummaryComparisonModal
router.get("/api/report/freight-forwarding-summary/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const { shipment_type, months } = req.query;

  try {
    const baseMatch = {
      organization_name: { $ne: null, $ne: "" }
    };

    if (shipment_type && shipment_type !== "all" && shipment_type !== "") {
      baseMatch.shipment_type = { $regex: new RegExp(`^${shipment_type.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, "i") };
    }

    const pipeline = [
      {
        $addFields: {
          dateObj: {
            $switch: {
              branches: [
                {
                  case: { $regexMatch: { input: { $toString: { $ifNull: ["$enquiry_date", ""] } }, regex: "^\\d{4}-\\d{2}-\\d{2}$" } },
                  then: { $toDate: "$enquiry_date" },
                },
                {
                  case: { $regexMatch: { input: { $toString: { $ifNull: ["$enquiry_date", ""] } }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } },
                  then: { $dateFromString: { dateString: "$enquiry_date", format: "%d-%m-%Y", onError: null } }
                },
              ],
              default: null,
            },
          }
        }
      },
      {
        $addFields: {
          enquiryMonth: { $month: "$dateObj" },
          enquiryYearStr: {
            $let: {
              vars: {
                y: { $year: "$dateObj" },
                m: { $month: "$dateObj" }
              },
              in: {
                $cond: {
                  if: { $gte: ["$$m", 4] },
                  then: {
                    $concat: [
                      { $substr: [{ $toString: "$$y" }, 2, 2] },
                      "-",
                      { $substr: [{ $toString: { $add: ["$$y", 1] } }, 2, 2] }
                    ]
                  },
                  else: {
                    $concat: [
                      { $substr: [{ $toString: { $subtract: ["$$y", 1] } }, 2, 2] },
                      "-",
                      { $substr: [{ $toString: "$$y" }, 2, 2] }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      {
        $match: {
          ...baseMatch,
          enquiryYearStr: year
        }
      }
    ];

    // Filter by months if provided (e.g. months="4,5,6,7" or month="6")
    let targetMonths = null;
    if (months) {
      targetMonths = months.split(",").map(m => parseInt(m.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 12);
    } else if (month && month !== "all" && month !== "0" && month !== "whole_year") {
      const parsed = parseInt(month, 10);
      if (!isNaN(parsed)) {
        targetMonths = [parsed];
      }
    }

    if (targetMonths && targetMonths.length > 0) {
      pipeline.push({
        $match: {
          enquiryMonth: { $in: targetMonths }
        }
      });
    }

    const docs = await FreightEnquiryModel.aggregate(pipeline);

    // Map each doc to normalized job format for SummaryComparisonModal
    const results = docs.map(d => {
      const isAir = (d.shipment_type || "").toLowerCase().includes("air") || d.consignment_type === "AIR";
      const isLCL = d.consignment_type === "LCL";
      
      let count20 = 0;
      let count40 = 0;
      if (!isAir) {
        const sizeStr = (d.container_size || "").toLowerCase();
        const numContainers = Array.isArray(d.containers) && d.containers.length > 0 ? d.containers.length : 1;
        if (sizeStr.includes("20")) {
          count20 = numContainers;
        } else if (sizeStr.includes("40")) {
          count40 = numContainers;
        } else {
          count20 = numContainers;
        }
      }

      // Calculate TEUs: 20ft + 2 * 40ft; for Air and LCL, at least 1 unit / shipment
      let teus = count20 + (2 * count40);
      if (teus === 0 && (isAir || isLCL)) {
        teus = 1;
      }

      let noOfContrSize = "";
      if (count20 > 0 && count40 > 0) {
        noOfContrSize = `${count20}x20 + ${count40}x40`;
      } else if (count20 > 0) {
        noOfContrSize = `${count20}x20`;
      } else if (count40 > 0) {
        noOfContrSize = `${count40}x40`;
      } else if (isAir) {
        noOfContrSize = "AIR";
      } else if (isLCL) {
        noOfContrSize = "LCL";
      }

      const normLocation = normalizeFfPort(d.port_of_loading, d.port_of_destination, d.shipment_type);

      return {
        job_no: d.enquiry_no || d.success_no || "",
        exporter: (d.organization_name || "UNKNOWN").trim(),
        location: normLocation,
        port_of_loading: d.port_of_loading || "",
        port_of_destination: d.port_of_destination || "",
        shipment_type: d.shipment_type || "Export-Sea",
        consignment_type: isAir ? "AIR" : (isLCL ? "LCL" : "FCL"),
        enquiry_date: d.enquiry_date || "",
        leo_date: d.enquiry_date || "",
        leo_month: d.enquiryMonth,
        month: d.enquiryMonth,
        containerNumbers: Array.isArray(d.containers) ? d.containers.map(c => c.container_number).filter(Boolean) : [],
        totalContainers: count20 + count40 || (isAir || isLCL ? 1 : 0),
        noOfContrSize,
        count20,
        count40,
        isAir,
        isLCL,
        teus,
        transport_mode: isAir ? "AIR" : "SEA",
        status: d.status || "",
        has_leo: Boolean(d.documents && d.documents.leo_copy),
        has_booking: Boolean(d.documents && (d.documents.booking_copy || d.documents.invoice))
      };
    });

    res.status(200).json(results);
  } catch (error) {
    console.error("❌ Aggregation error for Freight Forwarding Summary:", error);
    res.status(500).json({
      message: "Server Error while aggregating Freight Forwarding summary data.",
      details: error.message,
    });
  }
});

export default router;

