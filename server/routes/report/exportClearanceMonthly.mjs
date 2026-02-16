import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

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

  try {
    const pipeline = [
      {
        $match: {
          year,
          // Check for LEO Date presence in operations.statusDetails.leoDate
          "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
          sb_date: { $type: "string", $ne: "" },
          exporter: { $ne: null, $ne: "" },
        },
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
            $convert: {
              input: "$firstStatus.leoDate",
              to: "date",
              onError: null,
              onNull: null,
            },
          },
          sbDateObj: {
            $convert: {
              input: "$sb_date",
              to: "date",
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        $addFields: {
          leoMonth: { $month: "$leoDateObj" },
        },
      },
      {
        $match: {
          leoMonth: monthInt,
        },
      },
      {
        $addFields: {
          containerNumbers: {
            $map: {
              input: { $ifNull: ["$firstOp.containerDetails", []] },
              as: "c",
              in: "$$c.containerNo",
            },
          },
          sizeCounts: {
            $reduce: {
              input: { $ifNull: ["$firstOp.containerDetails", []] },
              initialValue: { ft20: 0, ft40: 0 },
              in: {
                ft20: {
                  $add: [
                    "$$value.ft20",
                    { $cond: [{ $eq: ["$$this.containerSize", "20"] }, 1, 0] },
                  ],
                },
                ft40: {
                  $add: [
                    "$$value.ft40",
                    { $cond: [{ $eq: ["$$this.containerSize", "40"] }, 1, 0] },
                  ],
                },
              },
            },
          },
          teus: {
            $sum: {
              $map: {
                input: { $ifNull: ["$firstOp.containerDetails", []] },
                as: "c",
                in: {
                  $cond: [
                    { $eq: ["$$c.containerSize", "20"] },
                    1,
                    { $cond: [{ $eq: ["$$c.containerSize", "40"] }, 2, 0] },
                  ],
                },
              },
            },
          },
          // Determine if Scrap based on RITC in products (nested in invoices)
          isScrap: {
            $gt: [
              {
                $size: {
                  $filter: {
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
                    as: "p",
                    cond: { $in: ["$$p.ritc", SCRAP_HS_CODES] },
                  },
                },
              },
              0,
            ],
          },
          rmsStatus: {
            $cond: [
              {
                $and: [
                  { $ne: ["$firstStatus.rms", null] },
                  { $ne: ["$firstStatus.rms", ""] },
                ],
              },
              "RMS",
              "No RMS",
            ],
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
          remarks: {
            $concat: [
              { $cond: ["$isScrap", "SCRAP", "OTHERS"] },
              "\n",
              "$rmsStatus",
              { $cond: [{ $eq: ["$milestoneRemarks", ""] }, "", "\n"] },
              "$milestoneRemarks",
            ],
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
          sb_date: 1, // Changed from be_date
          containerNumbers: 1,
          totalContainers: {
            $cond: [
              { $eq: ["$consignmentType", "LCL"] },
              1,
              { $size: { $ifNull: ["$firstOp.containerDetails", []] } },
            ],
          },
          noOfContrSize: 1,
          teus: {
            $cond: [{ $eq: ["$consignmentType", "LCL"] }, 1, "$teus"],
          },
          leo_date: "$firstStatus.leoDate", // Changed from out_of_charge
          remarks: 1,
          consignment_type: "$consignmentType",
          type_of_sb: "$sb_type", // Comparable to type_of_b_e
        },
      },
    ];

    // apply grade filter at the top of pipeline if present
    if (grade) {
      pipeline.unshift({
        $match: {
          description: { $regex: grade, $options: "i" },
        },
      });
    }

    const result = await ExJobModel.aggregate(pipeline);
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Error in export clearance route:", error);
    res
      .status(500)
      .json({ message: "Failed to generate export clearance report." });
  }
});

export default router;
