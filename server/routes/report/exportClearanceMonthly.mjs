import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

const BRANCH_CUSTOM_HOUSE_MAP = {
  AMD: ["AHMEDABAD AIR CARGO", "ICD SABARMATI", "ICD SACHANA", "ICD VIROCHAN NAGAR", "THAR DRY PORT"],
  BRD: ["ANKLESHWAR ICD", "ICD VARNAMA"],
  GIM: ["MUNDRA SEA", "KANDLA SEA"],
  COK: ["COCHIN AIR CARGO", "COCHIN SEA"],
  HAZ: ["HAZIRA"],
};

const SCRAP_HS_CODES = [
  "26203090", "26204010", "72041000", "72042110", "72042190",
  "72042910", "72042990", "72044900", "72045000", "74040011",
  "74040012", "74040022", "75030010", "76020010", "76020090",
  "79020010", "81042010", "81083000", "83100010",
];

router.get("/api/report/export-clearance/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const monthInt = parseInt(month, 10);
  const grade = req.query.grade || "";
  const branchCode = (req.query.branch_code || "").toUpperCase();
  const branchCustomHouses = BRANCH_CUSTOM_HOUSE_MAP[branchCode] || [];

  try {
    const matchConditions = {
      year,
      // Check for LEO Date presence in operations.statusDetails.leoDate
      "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
      sb_date: { $type: "string", $ne: "" },
      exporter: { $ne: null, $ne: "" },
      transportMode: { $ne: "AIR" }, // Air jobs should not appear in detailed report
    };

    if (branchCustomHouses.length > 0) {
      matchConditions.custom_house = { $in: branchCustomHouses };
    }

    const pipeline = [
      {
        $match: matchConditions,
      },
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
      },
    ];

    if (month !== "all") {
      pipeline.push({
        $match: {
          leoMonth: monthInt,
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
          teus: {
            $sum: {
              $map: {
                input: "$uniqueContainers.list",
                as: "c",
                in: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$$c.containerSize", "20"] },
                        { $regexMatch: { input: { $ifNull: ["$$c.type", ""] }, regex: /^20/ } }
                      ]
                    },
                    1,
                    {
                      $cond: [
                        {
                          $or: [
                            { $eq: ["$$c.containerSize", "40"] },
                            { $regexMatch: { input: { $ifNull: ["$$c.type", ""] }, regex: /^40/ } }
                          ]
                        },
                        2,
                        0
                      ]
                    },
                  ],
                },
              },
            },
          },
          milestoneRemarks: {
            $reduce: {
              input: {
                $filter: {
                  input: { $ifNull: ["$milestones", []] },
                  as: "m",
                  cond: { $ne: [{ $ifNull: ["$$m.remarks", ""] }, ""] },
                },
              },
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", "\n"] },
                  "$$this.milestoneName",
                  ": ",
                  "$$this.remarks",
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          remarks: "$milestoneRemarks",

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
          productDescriptions: {
            $reduce: {
              input: {
                $reduce: {
                  input: { $ifNull: ["$invoices", []] },
                  initialValue: [],
                  in: {
                    $concatArrays: [
                      "$$value",
                      { $ifNull: ["$$this.products", []] },
                    ],
                  },
                },
              },
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                  "$$this.description",
                ],
              },
            },
          },
          // Aggregate Invoice Value
          totalInvoiceValue: { $sum: "$invoices.invoiceValue" },
          firstCurrency: { $arrayElemAt: ["$invoices.currency", 0] },
        },
      },
      {
        $project: {
          _id: 0,
          job_no: "$jobNumber", // Map to job_no expected by UI
          location: "$custom_house",
          exporter: 1, // Changed from importer
          commodity: "$productDescriptions",
          inv_currency: "$firstCurrency",
          invoice_value: "$totalInvoiceValue", // Changed from cif_amount
          sb_no: 1, // Changed from be_no
          sb_date: {
            $dateToString: {
              date: "$sbDateObj",
              format: "%Y-%m-%d"
            }
          },
          containerNumbers: 1,
          totalContainers: {
            $cond: [
              { $eq: ["$consignmentType", "LCL"] },
              1,
              { $size: { $ifNull: ["$uniqueContainers.list", []] } },
            ],
          },
          noOfContrSize: 1,
          teus: {
            $cond: [{ $eq: ["$consignmentType", "LCL"] }, 0, "$teus"],
          },
          leo_date: {
            $dateToString: {
              date: "$leoDateObj",
              format: "%Y-%m-%d"
            }
          },
          remarks: 1,
          consignment_type: "$consignmentType",
          type_of_sb: "$sb_type", // Comparable to type_of_b_e
          transport_mode: "$transportMode",
          pol: "$port_of_loading",
          pod: "$port_of_discharge",
          country: "$discharge_country",
          rawInvoices: "$invoices",
          rawConsignees: "$consignees",
          rawContainers: "$uniqueContainers.list",
          shipping_line: { $ifNull: ["$shipping_line_airline", ""] },
          gross_weight: { $ifNull: ["$gross_weight_kg", ""] },
          net_weight: { $ifNull: ["$net_weight_kg", ""] },
          packages: { $ifNull: ["$total_no_of_pkgs", ""] },
          package_unit: { $ifNull: ["$package_unit", ""] },
          drawback_scroll_no: { $ifNull: ["$drawback_scroll_no", ""] },
          drawback_scroll_date: { $ifNull: ["$drawback_scroll_date", ""] },
        },
      },
    ]);

    // apply grade filter at the top of pipeline if present
    if (grade) {
      pipeline.unshift({
        $match: {
          description: { $regex: grade, $options: "i" },
        },
      });
    }

    const result = await ExJobModel.aggregate(pipeline);

    const formattedResult = result.map((row) => {
      const hsnSet = new Set();
      const eximSet = new Set();
      const invNoSet = new Set();
      const invDateSet = new Set();
      let totalFob = 0;

      const rodtepRateSet = new Set();
      const rodtepClaimSet = new Set();
      let totalRodtepAmount = 0;

      const dbkRateSet = new Set();
      const dbkSrNoSet = new Set();
      const dbkScrollNoSet = new Set();
      const dbkScrollDateSet = new Set();
      let totalDbkAmount = 0;

      const rosctlRateSet = new Set();
      const rosctlClaimSet = new Set();
      let totalRosctlAmount = 0;

      const igstStatusSet = new Set();
      const originStateSet = new Set();
      const originDistrictSet = new Set();
      const rewardItemSet = new Set();

      if (row.drawback_scroll_no) dbkScrollNoSet.add(String(row.drawback_scroll_no).trim());
      if (row.drawback_scroll_date) dbkScrollDateSet.add(String(row.drawback_scroll_date).trim());

      (row.rawInvoices || []).forEach((inv) => {
        if (inv.invoiceNumber) invNoSet.add(String(inv.invoiceNumber).trim());
        if (inv.invoiceDate) invDateSet.add(String(inv.invoiceDate).trim());
        const fobAmt = parseFloat(inv.freightInsuranceCharges?.fobValue?.amount);
        if (!isNaN(fobAmt)) totalFob += fobAmt;

        (inv.products || []).forEach((p) => {
          const hsn =
            (typeof p.ritc === "object"
              ? p.ritc?.ritcCode || p.ritc?.hsnCode
              : p.ritc) ||
            p.hsn_code ||
            p.hsnCode ||
            p.hsn;
          if (hsn && String(hsn).trim()) hsnSet.add(String(hsn).trim());

          const exim = p.eximCode || p.scheme_code || p.schemeCode;
          if (exim && String(exim).trim()) eximSet.add(String(exim).trim());

          // RoDTEP Details
          if (p.rodtepInfo) {
            if (p.rodtepInfo.ratePercent && parseFloat(p.rodtepInfo.ratePercent) > 0) {
              rodtepRateSet.add(`${p.rodtepInfo.ratePercent}%`);
            }
            if (p.rodtepInfo.amountINR) {
              const rAmt = parseFloat(p.rodtepInfo.amountINR);
              if (!isNaN(rAmt)) totalRodtepAmount += rAmt;
            }
            if (p.rodtepInfo.claim) {
              rodtepClaimSet.add(String(p.rodtepInfo.claim).trim());
            }
          }

          // DBK (Duty Drawback) Details
          if (Array.isArray(p.drawbackDetails)) {
            p.drawbackDetails.forEach((d) => {
              if (d.dbkRate && parseFloat(d.dbkRate) > 0) {
                dbkRateSet.add(d.percentageOfFobValue || `${d.dbkRate}%`);
              }
              if (d.dbkAmount) {
                const dAmt = parseFloat(d.dbkAmount);
                if (!isNaN(dAmt)) totalDbkAmount += dAmt;
              }
              if (d.dbkSrNo) dbkSrNoSet.add(String(d.dbkSrNo).trim());
              if (d.drawback_scroll_no) dbkScrollNoSet.add(String(d.drawback_scroll_no).trim());
              if (d.drawback_scroll_date) dbkScrollDateSet.add(String(d.drawback_scroll_date).trim());
            });
          } else if (p.dbkRate || p.dbkAmount || p.dbkitem || p.dbkSrNo) {
            if (p.dbkRate) dbkRateSet.add(String(p.dbkRate));
            if (p.dbkAmount) totalDbkAmount += parseFloat(p.dbkAmount) || 0;
            if (p.dbkSrNo || p.dbkitem) dbkSrNoSet.add(String(p.dbkSrNo || p.dbkitem));
          }

          // RoSCTL Details
          if (p.rosctlInfo) {
            const sl = parseFloat(p.rosctlInfo.slRate) || 0;
            const ctl = parseFloat(p.rosctlInfo.ctlRate) || 0;
            if (sl > 0 || ctl > 0) rosctlRateSet.add(`${sl + ctl}%`);
            if (p.rosctlInfo.amountINR) {
              const rosAmt = parseFloat(p.rosctlInfo.amountINR);
              if (!isNaN(rosAmt)) totalRosctlAmount += rosAmt;
            }
            if (p.rosctlInfo.claim) rosctlClaimSet.add(String(p.rosctlInfo.claim).trim());
          }

          // Additional customs attributes
          if (p.igstCompensationCess?.igstPaymentStatus) {
            igstStatusSet.add(String(p.igstCompensationCess.igstPaymentStatus).trim());
          }
          if (p.originState) originStateSet.add(String(p.originState).trim());
          if (p.originDistrict) originDistrictSet.add(String(p.originDistrict).trim());
          if (p.rewardItem !== undefined && p.rewardItem !== null) {
            rewardItemSet.add(p.rewardItem ? "Yes" : "No");
          }
        });
      });

      const consigneeName =
        row.consignee || (row.rawConsignees?.[0]?.consignee_name || "");

      const containerDetails = (row.rawContainers || []).map((c) => ({
        containerNo: c.containerNo || c.container_number || "",
        containerSize: c.containerSize || c.type || "",
        sealNo: c.sealNo || c.customSealNo || "",
        lineSealNo: c.shippingLineSealNo || "",
        pkgs: c.pkgsStuffed || "",
        grossWeight: c.grossWeight || "",
      }));

      const { rawInvoices, rawConsignees, rawContainers, ...cleanRow } = row;

      return {
        ...cleanRow,
        hsn_code: Array.from(hsnSet).join(", "),
        exim_code: Array.from(eximSet).join(", "),
        fob_value: totalFob > 0 ? totalFob : "",
        invoice_no: Array.from(invNoSet).join(", "),
        invoice_date: Array.from(invDateSet).join(", "),
        consignee: consigneeName,
        containerDetails,
        rodtep_rate: Array.from(rodtepRateSet).join(", "),
        rodtep_amount: totalRodtepAmount > 0 ? totalRodtepAmount.toFixed(2) : "",
        rodtep_claim: Array.from(rodtepClaimSet).join(", "),
        dbk_rate: Array.from(dbkRateSet).join(", "),
        dbk_amount: totalDbkAmount > 0 ? totalDbkAmount.toFixed(2) : "",
        dbk_sr_no: Array.from(dbkSrNoSet).join(", "),
        dbk_scroll_no: Array.from(dbkScrollNoSet).join(", "),
        dbk_scroll_date: Array.from(dbkScrollDateSet).join(", "),
        rosctl_rate: Array.from(rosctlRateSet).join(", "),
        rosctl_amount: totalRosctlAmount > 0 ? totalRosctlAmount.toFixed(2) : "",
        rosctl_claim: Array.from(rosctlClaimSet).join(", "),
        igst_status: Array.from(igstStatusSet).join(", "),
        origin_state: Array.from(originStateSet).join(", "),
        origin_district: Array.from(originDistrictSet).join(", "),
        reward_item: Array.from(rewardItemSet).join(", "),
      };
    });

    res.status(200).json(formattedResult);
  } catch (error) {
    console.error("❌ Error in export clearance route:", error);
    res
      .status(500)
      .json({ message: "Failed to generate export clearance report." });
  }
});

export default router;
