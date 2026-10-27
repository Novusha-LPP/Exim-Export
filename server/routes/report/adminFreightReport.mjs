import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

function parseDateHelper(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    return new Date(Date.UTC(y, m, d));
  }
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    const d = parseInt(ymdMatch[3], 10);
    return new Date(Date.UTC(y, m, d));
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function calculateTatDays(sbDateStr, billingDateStr) {
  if (!sbDateStr || !billingDateStr) return "";
  const d1 = parseDateHelper(sbDateStr);
  const d2 = parseDateHelper(billingDateStr);
  if (!d1 || !d2) return "";
  const diffMs = d2.getTime() - d1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

const BRANCH_CUSTOM_HOUSE_MAP = {
  AMD: ["AHMEDABAD AIR CARGO", "ICD SABARMATI", "ICD SACHANA", "ICD VIROCHAN NAGAR", "THAR DRY PORT"],
  BRD: ["ANKLESHWAR ICD", "ICD VARNAMA"],
  GIM: ["MUNDRA SEA", "KANDLA SEA"],
  COK: ["COCHIN AIR CARGO", "COCHIN SEA"],
  HAZ: ["HAZIRA"],
};

router.get("/api/report/admin-freight/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const monthInt = parseInt(month, 10);
  const branchCode = (req.query.branch_code || "").toUpperCase();
  const branchCustomHouses = BRANCH_CUSTOM_HOUSE_MAP[branchCode] || [];

  try {
    const matchConditions = {
      year,
      "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
      sb_date: { $type: "string", $ne: "" },
      exporter: { $ne: null, $ne: "" },
      transportMode: { $ne: "AIR" },
    };

    if (branchCustomHouses.length > 0) {
      matchConditions.custom_house = { $in: branchCustomHouses };
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $addFields: {
          firstOp: { $arrayElemAt: [{ $ifNull: ["$operations", []] }, 0] },
        },
      },
      {
        $addFields: {
          firstStatus: {
            $arrayElemAt: [{ $ifNull: ["$firstOp.statusDetails", []] }, 0],
          },
        },
      },
      {
        $addFields: {
          leoDateObj: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $ne: ["$firstStatus.leoDate", null] },
                      { $ne: ["$firstStatus.leoDate", ""] },
                      { $regexMatch: { input: "$firstStatus.leoDate", regex: /^\d{4}-\d{2}-\d{2}$/ } },
                    ],
                  },
                  then: { $toDate: "$firstStatus.leoDate" },
                },
                {
                  case: {
                    $and: [
                      { $ne: ["$firstStatus.leoDate", null] },
                      { $ne: ["$firstStatus.leoDate", ""] },
                      { $regexMatch: { input: "$firstStatus.leoDate", regex: /^\d{2}-\d{2}-\d{4}$/ } },
                    ],
                  },
                  then: {
                    $dateFromString: {
                      dateString: "$firstStatus.leoDate",
                      format: "%d-%m-%Y",
                      onError: null
                    },
                  },
                },
              ],
              default: null,
            },
          },
          sbDateObj: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $ne: ["$sb_date", null] },
                      { $ne: ["$sb_date", ""] },
                      { $regexMatch: { input: "$sb_date", regex: /^\d{4}-\d{2}-\d{2}$/ } },
                    ],
                  },
                  then: { $toDate: "$sb_date" },
                },
                {
                  case: {
                    $and: [
                      { $ne: ["$sb_date", null] },
                      { $ne: ["$sb_date", ""] },
                      { $regexMatch: { input: "$sb_date", regex: /^\d{2}-\d{2}-\d{4}$/ } },
                    ],
                  },
                  then: {
                    $dateFromString: {
                      dateString: "$sb_date",
                      format: "%d-%m-%Y",
                      onError: null
                    },
                  },
                },
              ],
              default: null,
            },
          },
        },
      },
      {
        $addFields: {
          leoMonth: { $month: "$leoDateObj" },
        },
      }
    ];

    const monthsQuery = req.query.months;
    let targetMonths = null;

    if (monthsQuery) {
      targetMonths = monthsQuery.split(',').map(m => parseInt(m.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 12);
    } else if (req.query.start_month && req.query.end_month) {
      const s = parseInt(req.query.start_month, 10);
      const e = parseInt(req.query.end_month, 10);
      if (!isNaN(s) && !isNaN(e)) {
        if (s <= e) {
          targetMonths = Array.from({ length: e - s + 1 }, (_, i) => s + i);
        } else {
          targetMonths = [];
          for (let m = s; m <= 12; m++) targetMonths.push(m);
          for (let m = 1; m <= e; m++) targetMonths.push(m);
        }
      }
    } else if (month !== "all") {
      if (typeof month === 'string' && month.includes(',')) {
        targetMonths = month.split(',').map(m => parseInt(m.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 12);
      } else if (typeof month === 'string' && month.includes('-')) {
        const [s, e] = month.split('-').map(m => parseInt(m.trim(), 10));
        if (!isNaN(s) && !isNaN(e) && s <= e) {
          targetMonths = Array.from({ length: e - s + 1 }, (_, i) => s + i);
        }
      } else if (!isNaN(monthInt)) {
        targetMonths = [monthInt];
      }
    }

    if (targetMonths && targetMonths.length > 0) {
      pipeline.push({
        $match: {
          leoMonth: { $in: targetMonths },
        },
      });
    }

    pipeline.push(...[
      {
        $addFields: {
          uniqueContainers: {
            $reduce: {
              input: { $ifNull: ["$containers", []] },
              initialValue: { list: [], seen: [] },
              in: {
                $let: {
                  vars: {
                    normalizedNo: {
                      $toUpper: {
                        $trim: { input: { $ifNull: ["$$this.containerNo", ""] } }
                      }
                    }
                  },
                  in: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ["$$normalizedNo", ""] },
                          { $in: ["$$normalizedNo", "$$value.seen"] }
                        ]
                      },
                      "$$value",
                      {
                        list: { $concatArrays: ["$$value.list", ["$$this"]] },
                        seen: { $concatArrays: ["$$value.seen", ["$$normalizedNo"]] }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
      },
      {
        $addFields: {
          containerNumbers: {
            $map: {
              input: "$uniqueContainers.list",
              as: "c",
              in: "$$c.containerNo",
            },
          },
          sizeCounts: {
            $reduce: {
              input: "$uniqueContainers.list",
              initialValue: { ft20: 0, ft40: 0 },
              in: {
                ft20: {
                  $add: [
                    "$$value.ft20",
                    {
                      $cond: [
                        {
                          $or: [
                            { $eq: ["$$this.containerSize", "20"] },
                            { $regexMatch: { input: { $ifNull: ["$$this.type", ""] }, regex: /^20/ } }
                          ]
                        },
                        1,
                        0
                      ]
                    },
                  ],
                },
                ft40: {
                  $add: [
                    "$$value.ft40",
                    {
                      $cond: [
                        {
                          $or: [
                            { $eq: ["$$this.containerSize", "40"] },
                            { $regexMatch: { input: { $ifNull: ["$$this.type", ""] }, regex: /^40/ } }
                          ]
                        },
                        1,
                        0
                      ]
                    },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          noOfContrSize: {
            $trim: {
              input: {
                $concat: [
                  {
                    $cond: [
                      { $gt: ["$sizeCounts.ft20", 0] },
                      { $concat: [{ $toString: "$sizeCounts.ft20" }, "x20"] },
                      "",
                    ],
                  },
                  {
                    $cond: [
                      {
                        $and: [
                          { $gt: ["$sizeCounts.ft20", 0] },
                          { $gt: ["$sizeCounts.ft40", 0] },
                        ],
                      },
                      " + ",
                      "",
                    ],
                  },
                  {
                    $cond: [
                      { $gt: ["$sizeCounts.ft40", 0] },
                      { $concat: [{ $toString: "$sizeCounts.ft40" }, "x40"] },
                      "",
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      // Data is extracted directly from ExJobModel
      {
        $project: {
          _id: 0,
          job_no: "$jobNumber",
          exporter: 1,
          location: "$custom_house",
          sb_no: 1,
          sb_date: {
            $dateToString: {
              date: "$sbDateObj",
              format: "%Y-%m-%d"
            }
          },
          leo_date: {
            $dateToString: {
              date: "$leoDateObj",
              format: "%Y-%m-%d"
            }
          },
          leo_month: "$leoMonth",
          containerNumbers: 1,
          totalContainers: {
            $cond: [
              { $eq: ["$consignmentType", "LCL"] },
              1,
              { $size: { $ifNull: ["$uniqueContainers.list", []] } },
            ],
          },
          noOfContrSize: 1,
          consignment_type: "$consignmentType",
          pol: "$port_of_loading",
          pod: "$port_of_discharge",
          country: "$discharge_country",
          movement_type: "$consignmentType", // LCL, FCL, AIR
          shipping_line: "$shipping_line_airline",
          term_of_invoice: { $arrayElemAt: ["$invoices.termsOfInvoice", 0] },
          freight_amount: { $arrayElemAt: ["$invoices.freightInsuranceCharges.freight.amount", 0] },
          currency: { $arrayElemAt: ["$invoices.freightInsuranceCharges.freight.currency", 0] },
          forwarder_name: {
            $let: {
              vars: {
                op: { $arrayElemAt: [{ $ifNull: ["$operations", []] }, 0] }
              },
              in: {
                $let: {
                  vars: {
                    status: { $arrayElemAt: [{ $ifNull: ["$op.statusDetails", []] }, 0] }
                  },
                  in: {
                    $cond: [
                      { $and: [{ $ne: ["$status.forwarderName", null] }, { $ne: ["$status.forwarderName", ""] }] },
                      "$status.forwarderName",
                      "$forwarder"
                    ]
                  }
                }
              }
            }
          },
          billing_date: {
            $let: {
              vars: {
                bDate: {
                  $ifNull: [
                    "$firstStatus.billing_details.agency_bill_date",
                    {
                      $ifNull: [
                        "$firstStatus.billing_details.reimbursement_bill_date",
                        {
                          $ifNull: [
                            "$billing_details.agency_bill_date",
                            {
                              $ifNull: [
                                "$agency_bill_date",
                                {
                                  $ifNull: [
                                    "$billing_date",
                                    "$send_for_billing_date"
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              },
              in: { $ifNull: ["$bDate", ""] }
            }
          },
          agency_bill_date: {
            $ifNull: [
              "$firstStatus.billing_details.agency_bill_date",
              { $ifNull: ["$billing_details.agency_bill_date", { $ifNull: ["$agency_bill_date", ""] }] }
            ]
          },
          send_for_billing_date: { $ifNull: ["$send_for_billing_date", ""] },
        },
      },
    ]);

    const result = await ExJobModel.aggregate(pipeline);
    const formattedResult = result.map(row => {
      const rawBillingDate = row.billing_date || row.agency_bill_date || row.send_for_billing_date || "";
      const tatVal = calculateTatDays(row.sb_date, rawBillingDate);
      return {
        ...row,
        billing_date: rawBillingDate,
        tat: tatVal !== "" ? tatVal : ""
      };
    });
    res.status(200).json(formattedResult);
  } catch (error) {
    console.error("❌ Error in admin freight report route:", error);
    res.status(500).json({ message: "Failed to generate admin freight report." });
  }
});

export default router;
