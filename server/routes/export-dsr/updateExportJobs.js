import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// GET /api/dashboard-stats - Get dashboard statistics
router.get("/dashboard-stats", async (req, res) => {
  try {
    const {
      exporter = "",
      consignmentType = "",
      branch = "",
      year = "",
    } = req.query;

    const matchStage = {};
    if (!matchStage.$and) matchStage.$and = [];

    // Fetch user restrictions
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin") {
        const branchRestrictions = requester.selected_branches || [];
        if (branchRestrictions.length > 0) {
          matchStage.$and.push({ branch_code: { $in: branchRestrictions } });
        }

        const portRestrictions = requester.selected_ports || [];
        const icdRestrictions = requester.selected_icd_codes || [];
        const combinedRestrictions = [...new Set([...portRestrictions, ...icdRestrictions])];

        if (combinedRestrictions.length > 0) {
          const finalRestrictions = [];
          combinedRestrictions.forEach(res => {
            finalRestrictions.push(res);
            if (res.includes(" - ")) {
              finalRestrictions.push(res.split(" - ")[0].trim());
            }
          });

          const combinedRegexStr = finalRestrictions.map(r =>
            `^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
          ).join('|');

          matchStage.$and.push({
            $or: [
              { custom_house: { $regex: combinedRegexStr, $options: "i" } },
              { port_of_loading: { $regex: combinedRegexStr, $options: "i" } }
            ]
          });
        }
      }
    }

    // 1. Build Match Stage (Filtering)
    if (exporter) matchStage.$and.push({ exporter: { $regex: exporter, $options: "i" } });
    if (consignmentType) matchStage.$and.push({ consignmentType: consignmentType });
    if (branch) matchStage.$and.push({ branch_code: { $regex: `^${branch}$`, $options: "i" } });

    // Year filter - matches exact string "YY-YY" format (e.g. "25-26")
    if (year && year !== "all") {
      matchStage.$and.push({ year: year });
    }

    if (matchStage.$and.length === 0) delete matchStage.$and;

    // 2. Run Aggregation
    const stats = await ExportJobModel.aggregate([
      { $match: matchStage },
      {
        $facet: {
          // A. Counts — aligned with the same logic used in /exports?status=X
          counts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                // Cancelled takes highest priority
                cancelled: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: [{ $toLower: { $ifNull: ["$status", ""] } }, "cancelled"] },
                          { $eq: ["$isJobCanceled", true] },
                        ],
                      },
                      1, 0,
                    ],
                  },
                },
                // Completed: status=completed OR isJobtrackingEnabled=true (NOT cancelled)
                completed: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: [{ $toLower: { $ifNull: ["$status", ""] } }, "cancelled"] },
                          { $ne: ["$isJobCanceled", true] },
                          {
                            $or: [
                              { $eq: [{ $toLower: { $ifNull: ["$status", ""] } }, "completed"] },
                              { $eq: ["$isJobtrackingEnabled", true] },
                              // Treat anything else NOT pending/blank as completed
                              {
                                $and: [
                                  { $ne: [{ $toLower: { $ifNull: ["$status", ""] } }, "pending"] },
                                  { $ne: [{ $ifNull: ["$status", ""] }, ""] }
                                ]
                              }
                            ],
                          },
                        ],
                      },
                      1, 0,
                    ],
                  },
                },
                // Pending: (status=pending/blank) AND NOT jobTracking AND NOT cancelled
                // Mirrors the Jobs tab "Pending" filter exactly
                pending: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          // Not cancelled
                          { $ne: [{ $toLower: { $ifNull: ["$status", ""] } }, "cancelled"] },
                          { $ne: ["$isJobCanceled", true] },
                          // Not completed via tracking
                          { $ne: ["$isJobtrackingEnabled", true] },
                          // Status is pending or not set
                          {
                            $or: [
                              { $eq: [{ $toLower: { $ifNull: ["$status", ""] } }, "pending"] },
                              { $eq: [{ $ifNull: ["$status", ""] }, ""] },
                            ],
                          },
                        ],
                      },
                      1, 0,
                    ],
                  },
                },
              },
            },
          ],
          // B. Monthly Trend — group by year+month of effective date
          monthlyTrend: [
            {
              $addFields: {
                effectiveDate: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$job_date", null] },
                        { $ne: ["$job_date", ""] },
                        { $regexMatch: { input: { $ifNull: ["$job_date", ""] }, regex: "^\\d{2}-\\d{2}-\\d{4}" } }
                      ]
                    },
                    then: {
                      $dateFromString: {
                        dateString: "$job_date",
                        format: "%d-%m-%Y",
                        onError: "$createdAt"
                      }
                    },
                    else: "$createdAt"
                  }
                }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: "$effectiveDate" },
                  month: { $month: "$effectiveDate" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
        },
      },
    ]);

    const result = stats[0];
    const counts = result.counts[0] || {
      total: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };

    res.json({
      success: true,
      data: {
        ...counts,
        monthlyTrend: result.monthlyTrend,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
    });
  }
});

// GET /api/custom-house-list - Get list of unique custom houses from existing jobs
router.get("/custom-house-list", async (req, res) => {
  try {
    const customHouses = await ExportJobModel.distinct("custom_house");
    res.json({
      success: true,
      data: customHouses.filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching custom house list:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching custom house list",
    });
  }
});

// GET /api/global-search-jobs - Search for jobs across all statuses
router.get("/global-search-jobs", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      branch = "",
      year = "",
      status = "all",
      month = "",
      exporter = "",
      consignmentType = "",
      detailedStatus = "",
      customHouse = "",
      goods_stuffed_at = "",
      jobOwner = "",
    } = req.query;

    const filter = {};
    if (!filter.$and) filter.$and = [];

    // 1. Fetch user restrictions
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin" && (!search || String(search).trim() === "")) {
        const branchRestrictions = requester.selected_branches || [];
        if (branchRestrictions.length > 0) {
          filter.$and.push({ branch_code: { $in: branchRestrictions } });
        }

        const portRestrictions = requester.selected_ports || [];
        const icdRestrictions = requester.selected_icd_codes || [];
        const combinedRestrictions = [...new Set([...portRestrictions, ...icdRestrictions])];

        if (combinedRestrictions.length > 0) {
          const finalRestrictions = [];
          combinedRestrictions.forEach(res => {
            finalRestrictions.push(res);
            if (res.includes(" - ")) {
              finalRestrictions.push(res.split(" - ")[0].trim());
            }
          });

          const combinedRegexStr = finalRestrictions.map(r =>
            `^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
          ).join('|');

          filter.$and.push({
            $or: [
              { custom_house: { $regex: combinedRegexStr, $options: "i" } },
              { port_of_loading: { $regex: combinedRegexStr, $options: "i" } }
            ]
          });
        }
      }
    }
    
    if (jobOwner) filter.$and.push({ job_owner: { $regex: jobOwner, $options: "i" } });

    // 2. Status filter
    // CRITICAL FIX: If there is a search query, we IGNORE the status filter to make it truly global across tabs
    if ((!search || search.trim() === "") && status && status.toLowerCase() !== "all") {
      const statusLower = status.toLowerCase();
      
      if (statusLower === "pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
            { isJobCanceled: { $ne: true } },
          ],
        });
      } else if (statusLower === "completed") {
        filter.$and.push({
          $and: [
            { status: { $regex: "^(?!cancelled$).*", $options: "i" } },
            { isJobCanceled: { $ne: true } },
            {
              $or: [
                { status: { $regex: "^completed$", $options: "i" } },
                { detailedStatus: "Billing Done" },
              ],
            },
          ],
        });
      } else if (statusLower === "cancelled") {
        filter.$and.push({
          $or: [
            { status: { $regex: "^cancelled$", $options: "i" } },
            { isJobCanceled: true },
          ],
        });
      } else if (statusLower === "billing ready") {
        filter.$and.push({
            $and: [
                { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } },
                { "operations.statusDetails.handoverImageUpload": { $exists: true, $not: { $size: 0 } } },
                { "operations.statusDetails.billingDocsSentDt": { $in: [null, ""] } }
            ]
        });
      } else if (statusLower === "op completed" || statusLower === "billing pending") {
        filter.$and.push({
            "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] },
            $or: [
                { "operations.statusDetails.billingDocsSentDt": { $exists: false } },
                { "operations.statusDetails.billingDocsSentDt": null },
                { "operations.statusDetails.billingDocsSentDt": "" },
                { "operations.statusDetails": { $size: 0 } }
            ]
        });
      } else if (statusLower === "booking pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
          ],
          goods_stuffed_at: "DOCK",
          consignmentType: "FCL",
          sb_no: { $type: "string", $ne: "" },
          $or: [
            { "operations.statusDetails.leoDate": { $exists: false } },
            { "operations.statusDetails.leoDate": null },
            { "operations.statusDetails.leoDate": "" },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      } else if (statusLower === "handover pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
          ],
          "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
          $or: [
            { "operations.statusDetails.handoverForwardingNoteDate": { $exists: false } },
            { "operations.statusDetails.handoverForwardingNoteDate": null },
            { "operations.statusDetails.handoverForwardingNoteDate": "" },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      }
    }

    // 3. Search filter
    if (search) {
      filter.$and.push({
        $or: [
          { job_no: { $regex: search, $options: "i" } },
          { exporter: { $regex: search, $options: "i" } },
          { ieCode: { $regex: search, $options: "i" } },
          { "consignees.consignee_name": { $regex: search, $options: "i" } },
          { sb_no: { $regex: search, $options: "i" } },
          { "invoices.invoiceNumber": { $regex: search, $options: "i" } },
          { "containers.containerNo": { $regex: search, $options: "i" } }
        ],
      });
    }

    // 3. Apply OTHER filters ONLY if NOT searching globally
    if (!search || search.trim() === "") {
      if (branch) {
        filter.$and.push({ branch_code: { $regex: `^${branch}$`, $options: "i" } });
      }

      if (year && year !== "all") {
        filter.$and.push({ year: year });
      }

      if (exporter) {
        filter.$and.push({ exporter: { $regex: exporter, $options: "i" } });
      }

      if (consignmentType) {
        filter.$and.push({ consignmentType: consignmentType });
      }

      if (detailedStatus) {
        filter.$and.push({ detailedStatus: detailedStatus });
      }

      if (customHouse) {
        filter.$and.push({ custom_house: { $regex: customHouse, $options: "i" } });
      }

      if (goods_stuffed_at) {
        filter.$and.push({ goods_stuffed_at: goods_stuffed_at });
      }

      if (month) {
        if (month === "today") {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          filter.$and.push({ createdAt: { $gte: start, $lte: end } });
        } else if (month === "yesterday") {
          const start = new Date();
          start.setDate(start.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setDate(end.getDate() - 1);
          end.setHours(23, 59, 59, 999);
          filter.$and.push({ createdAt: { $gte: start, $lte: end } });
        } else if (month === "weekly") {
          const start = new Date();
          start.setDate(start.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          filter.$and.push({ createdAt: { $gte: start, $lte: end } });
        } else if (!isNaN(month)) {
          filter.$and.push({
            $expr: {
              $let: {
                vars: {
                  effDate: {
                    $cond: {
                      if: {
                        $and: [
                          { $ne: ["$job_date", null] },
                          { $ne: ["$job_date", ""] },
                          { $regexMatch: { input: { $ifNull: ["$job_date", ""] }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } }
                        ]
                      },
                      then: {
                        $dateFromString: {
                          dateString: "$job_date",
                          format: "%d-%m-%Y",
                          onError: "$createdAt"
                        }
                      },
                      else: "$createdAt"
                    }
                  }
                },
                in: {
                  $eq: [{ $month: "$$effDate" }, parseInt(month)]
                }
              }
            }
          });
        }
      }
    }

    if (filter.$and.length === 0) delete filter.$and;

    const skip = (page - 1) * limit;

    const [jobs, totalCount] = await Promise.all([
      ExportJobModel.find(filter)
        .select({
          job_no: 1,
          custom_house: 1,
          job_date: 1,
          consignmentType: 1,
          job_owner: 1,
          exporter: 1,
          exporter_ref_no: 1,
          "consignees.consignee_name": 1,
          "buyerThirdPartyInfo.buyer.name": 1,
          ieCode: 1,
          panNo: 1,
          exporter_gstin: 1,
          adCode: 1,
          "invoices.invoiceNumber": 1,
          "invoices.invoiceDate": 1,
          "invoices.termsOfInvoice": 1,
          "invoices.currency": 1,
          "invoices.invoiceValue": 1,
          "invoices.consigneeName": 1,
          "invoices.invoice_no": 1,
          "invoices.invoice_date": 1,
          "invoices.invValue": 1,
          sb_no: 1,
          sb_date: 1,
          destination_port: 1,
          destination_country: 1,
          port_of_discharge: 1,
          discharge_country: 1,
          total_no_of_pkgs: 1,
          package_unit: 1,
          gross_weight_kg: 1,
          net_weight_kg: 1,
          shipping_line_airline: 1,
          detailedStatus: 1,
          status: 1,
          otherInfo: 1,
          annexC1Details: 1,
          booking_copy: 1,
          "containers": 1,
          statusDetails: 1,
          "eSanchitDocuments.fileUrl": 1,
          "eSanchitDocuments.documentType": 1,
          "eSanchitDocuments.icegateFilename": 1,
          total_ar_amount: 1,
          outstanding_balance: 1,
          cha: 1,
          isLocked: 1,
          branch_code: 1,
          transportMode: 1,
          movement_type: 1,
          port_of_loading: 1,
          bookingDetails: 1,
          billingDetails: 1,
          "operations.statusDetails.containerPlacementDate": 1,
          "operations.statusDetails.handoverForwardingNoteDate": 1,
          "operations.statusDetails.railOutReachedDate": 1,
          "operations.statusDetails.leoDate": 1,
          "operations.statusDetails.leoUpload": 1,
          "operations.statusDetails.stuffingSheetUpload": 1,
          "operations.statusDetails.stuffingPhotoUpload": 1,
          "operations.statusDetails.eGatePassUpload": 1,
          "operations.statusDetails.handoverImageUpload": 1,
          "operations.statusDetails.billingDocsSentUpload": 1,
          "operations.statusDetails.billingDocsSentDt": 1,
          "operations.statusDetails.status": 1,
          "operations.transporterDetails.images": 1,
          "operations.bookingDetails.images": 1,
          lockedBy: 1,
          lockedAt: 1
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExportJobModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        total: totalCount,
      },
    });
  } catch (error) {
    console.error("Error in global search:", error);
    res.status(500).json({
      success: false,
      message: "Error searching jobs",
      error: error.message,
    });
  }
});

// GET /exports - List all exports with pagination & filtering
// Updated exports API with status filtering
// If jobTracking is enabled and all milestones are completed, status is treated as "completed"
router.get("/exports/:status?", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      exporter = "",
      country = "",
      consignmentType = "",
      branch = "",
      status = "all",
      year = "",
      detailedStatus = "",
      jobOwner = "",
      month = "",
    } = { ...req.params, ...req.query };

    const filter = {};

    // Initialize $and array for complex queries
    if (!filter.$and) filter.$and = [];

    // 1. Fetch user restrictions
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin") {
        // Enforce Branch Restriction
        const branchRestrictions = requester.selected_branches || [];
        if (branchRestrictions.length > 0) {
          filter.$and.push({
            branch_code: { $in: branchRestrictions }
          });
        }

        // Enforce Port & ICD Restriction
        const portRestrictions = requester.selected_ports || [];
        const icdRestrictions = requester.selected_icd_codes || [];
        const combinedRestrictions = [...new Set([...portRestrictions, ...icdRestrictions])];

        if (combinedRestrictions.length > 0) {
          const finalRestrictions = [];
          combinedRestrictions.forEach(res => {
            finalRestrictions.push(res);
            if (res.includes(" - ")) {
              finalRestrictions.push(res.split(" - ")[0].trim());
            }
          });

          const combinedRegexStr = finalRestrictions.map(r =>
            `^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
          ).join('|');

          filter.$and.push({
            $or: [
              { custom_house: { $regex: combinedRegexStr, $options: "i" } },
              { port_of_loading: { $regex: combinedRegexStr, $options: "i" } }
            ]
          });
        }
      }
    }

    if (jobOwner) {
      filter.$and.push({
        job_owner: { $regex: jobOwner, $options: "i" },
      });
    }

    // Status filtering logic with job tracking consideration
    // Job is considered "completed" if:
    // 1. Explicit status is "completed", OR
    // 2. jobTracking is enabled (regardless of milestone status)
    if (status && status.toLowerCase() !== "all") {
      const statusLower = status.toLowerCase();

      if (statusLower === "pending") {
        // Pending: Status is pending or not set
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
            { isJobCanceled: { $ne: true } },
          ],
        });
      } else if (statusLower === "completed") {
        // Completed: Explicit status is completed OR final milestone reached
        filter.$and.push({
          $and: [
            // Exclude Cancelled
            {
              $and: [
                { status: { $regex: "^(?!cancelled$).*", $options: "i" } },
                { isJobCanceled: { $ne: true } },
              ],
            },
            // Include if tracking done OR completed status
            {
              $or: [
                { status: { $regex: "^completed$", $options: "i" } },
                { detailedStatus: "Billing Done" },
              ],
            },
          ],
        });
      } else if (statusLower === "cancelled") {
        filter.$and.push({
          $or: [
            { status: { $regex: "^cancelled$", $options: "i" } },
            { isJobCanceled: true },
          ],
        });
      } else if (statusLower === "booking pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
          ],
          goods_stuffed_at: "DOCK",
          consignmentType: "FCL",
          sb_no: { $type: "string", $ne: "" },
          $or: [
            { "operations.statusDetails.leoDate": { $exists: false } },
            { "operations.statusDetails.leoDate": null },
            { "operations.statusDetails.leoDate": "" },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      } else if (statusLower === "handover pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
          ],
          "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
          $or: [
            { "operations.statusDetails.handoverForwardingNoteDate": { $exists: false } },
            { "operations.statusDetails.handoverForwardingNoteDate": null },
            { "operations.statusDetails.handoverForwardingNoteDate": "" },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      } else if (statusLower === "billing pending") {
        filter.$and.push({
          $and: [
            {
              $or: [
                { status: { $regex: "^pending$", $options: "i" } },
                { status: { $exists: false } },
                { status: null },
                { status: "" },
              ],
            },
            { detailedStatus: { $ne: "Billing Done" } },
          ],
          "operations.statusDetails.handoverForwardingNoteDate": { $type: "string", $ne: "" },
          $or: [
            { "operations.statusDetails.billingDocsSentDt": { $exists: false } },
            { "operations.statusDetails.billingDocsSentDt": null },
            { "operations.statusDetails.billingDocsSentDt": "" },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      } else {
        filter.$and.push({
          status: { $regex: `^${status}$`, $options: "i" },
        });
      }
    }

    // Search filter
    // Search filter
    if (search) {
      filter.$and.push({
        $or: [
          { job_no: { $regex: search, $options: "i" } },
          { exporter: { $regex: search, $options: "i" } },
          { ieCode: { $regex: search, $options: "i" } },
          { "consignees.consignee_name": { $regex: search, $options: "i" } },

          // 1. Search by SB Number (Shipping Bill)
          { sb_no: { $regex: search, $options: "i" } },

          // 2. Search in Invoices Array (Invoice Number)
          { "invoices.invoiceNumber": { $regex: search, $options: "i" } },

          // 4. Search in Containers Array
          { "containers.containerNo": { $regex: search, $options: "i" } }
        ],
      });
    }

    // Additional filters
    if (exporter && exporter.toLowerCase() !== "all") {
      filter.$and.push({
        exporter: { $regex: exporter, $options: "i" },
      });
    }

    if (country) {
      filter.$and.push({
        destination_country: { $regex: country, $options: "i" },
      });
    }

    if (consignmentType) {
      filter.$and.push({
        consignmentType: consignmentType,
      });
    }
    if (branch) {
      filter.$and.push({
        branch_code: { $regex: `^${branch}$`, $options: "i" },
      });
    }

    // Year filter - matches exact string "YY-YY" format (e.g. "25-26")
    if (year && year !== "all") {
      filter.$and.push({ year: year });
    }

    if (month) {
      if (month === "today") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        filter.$and.push({ createdAt: { $gte: start, $lte: end } });
      } else if (month === "yesterday") {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        filter.$and.push({ createdAt: { $gte: start, $lte: end } });
      } else if (month === "weekly") {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        filter.$and.push({ createdAt: { $gte: start, $lte: end } });
      } else if (!isNaN(month)) {
        filter.$and.push({
          $expr: {
            $let: {
              vars: {
                effDate: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$job_date", null] },
                        { $ne: ["$job_date", ""] },
                        { $regexMatch: { input: { $ifNull: ["$job_date", ""] }, regex: "^\\d{2}-\\d{2}-\\d{4}" } }
                      ]
                    },
                    then: {
                      $dateFromString: {
                        dateString: "$job_date",
                        format: "%d-%m-%Y",
                        onError: "$createdAt"
                      }
                    },
                    else: "$createdAt"
                  }
                }
              },
              in: {
                $eq: [{ $month: "$$effDate" }, parseInt(month)]
              }
            }
          }
        });
      }
    }

    if (req.query.customHouse) {
      filter.$and.push({
        custom_house: { $regex: req.query.customHouse, $options: "i" },
      });
    }

    if (detailedStatus) {
      filter.$and.push({
        detailedStatus: detailedStatus,
      });
    }

    if (req.query.goods_stuffed_at) {
      filter.$and.push({
        goods_stuffed_at: req.query.goods_stuffed_at,
      });
    }

    // Remove empty $and array if no conditions were added
    if (filter.$and && filter.$and.length === 0) {
      delete filter.$and;
    }

    const skip = (page - 1) * limit;

    // Sorting logic
    const { sortKey, sortOrder } = req.query;
    const sort = {};
    if (sortKey) {
      sort[sortKey] = sortOrder === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1; // Default sort
    }

    // Selected fields to reduce payload size for the frontend table
    const selectProjection = {
      job_no: 1,
      custom_house: 1,
      job_date: 1,
      consignmentType: 1,
      job_owner: 1,
      exporter: 1,
      exporter_ref_no: 1,
      exporter_branch_name: 1,
      "consignees.consignee_name": 1,
      "buyerThirdPartyInfo.buyer.name": 1,
      ieCode: 1,
      panNo: 1,
      exporter_gstin: 1,
      adCode: 1,
      "invoices.invoiceNumber": 1,
      "invoices.invoiceDate": 1,
      "invoices.termsOfInvoice": 1,
      "invoices.currency": 1,
      "invoices.invoiceValue": 1,
      "invoices.consigneeName": 1,
      "invoices.invoice_no": 1,
      "invoices.invoice_date": 1,
      "invoices.invValue": 1,
      sb_no: 1,
      sb_date: 1,
      destination_port: 1,
      destination_country: 1,
      port_of_discharge: 1,
      discharge_country: 1,
      total_no_of_pkgs: 1,
      package_unit: 1,
      gross_weight_kg: 1,
      net_weight_kg: 1,
      shipping_line_airline: 1,
      detailedStatus: 1,
      status: 1,
      otherInfo: 1,
      annexC1Details: 1,
      booking_copy: 1,
      "containers": 1,
      statusDetails: 1,
      "eSanchitDocuments.fileUrl": 1,
      "eSanchitDocuments.documentType": 1,
      "eSanchitDocuments.icegateFilename": 1,
      total_ar_amount: 1,
      outstanding_balance: 1,
      cha: 1,
      isLocked: 1,
      branch_code: 1,
      transportMode: 1,
      movement_type: 1,
      port_of_loading: 1,
      "operations.bookingDetails.bookingNo": 1,
      "operations.bookingDetails.shippingLineName": 1,
      "operations.statusDetails.containerPlacementDate": 1,
      "operations.statusDetails.handoverForwardingNoteDate": 1,
      "operations.statusDetails.railOutReachedDate": 1,
      "operations.statusDetails.leoDate": 1,
      "operations.statusDetails.leoUpload": 1,
      "operations.statusDetails.stuffingSheetUpload": 1,
      "operations.statusDetails.stuffingPhotoUpload": 1,
      "operations.statusDetails.eGatePassUpload": 1,
      "operations.statusDetails.handoverImageUpload": 1,
      "operations.statusDetails.billingDocsSentUpload": 1,
      "operations.statusDetails.billingDocsSentDt": 1,
      "operations.statusDetails.status": 1,
      "operations.transporterDetails.images": 1,
      "operations.bookingDetails.images": 1,
      lockedBy: 1,
      lockedAt: 1
    };

    // Execute queries in parallel
    const [jobs, totalCount] = await Promise.all([
      ExportJobModel.find(filter)
        .select(selectProjection)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExportJobModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasNextPage: page < Math.ceil(totalCount / parseInt(limit)),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching export jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching export jobs",
      error: error.message,
    });
  }
});

// POST /api/exports - Create new export job
router.post("/exports", auditMiddleware("Job"), async (req, res) => {
  try {
    const newJob = new ExportJobModel(req.body);
    const savedJob = await newJob.save();
    res.status(201).json({ success: true, data: savedJob });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating job",
      error: error.message,
    });
  }
});

router.get("/:job_no(.*)", async (req, res, next) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    // List of prefixes that are certainly NOT job numbers
    // Robust check for Export Job Number format (e.g., BRANCH/EXP/MODE/SEQ/YEAR)
    // This prevents the wildcard route from eating other API request paths.
    // We require slashes and the presence of "EXP" (case-insensitive) to be considered a job number.
    const isJobNumber =
      job_no &&
      typeof job_no === "string" &&
      job_no.includes("/") &&
      job_no.split("/").length >= 3;

    if (!isJobNumber) {
      return next();
    }

    const username = req.headers["username"]; // Identify who is requesting

    const exportJob = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
    });

    if (!exportJob) {
      return res.status(404).json({ message: "Export job not found" });
    }

    // Check for stale locks (e.g., older than 30 minutes)
    const LOCK_TIMEOUT = 30 * 60 * 1000;
    if (
      exportJob.lockedBy &&
      exportJob.lockedAt &&
      new Date() - new Date(exportJob.lockedAt) > LOCK_TIMEOUT
    ) {
      exportJob.lockedBy = null;
      exportJob.lockedAt = null;
      await exportJob.save();
    }

    // If locked by someone else, return localized info
    if (exportJob.lockedBy && exportJob.lockedBy !== username) {
      return res.status(423).json({
        message: `Job is currently locked by ${exportJob.lockedBy}`,
        lockedBy: exportJob.lockedBy,
        job: exportJob, // Still send data if they just want to "view" (optional, but 423 is standard for locked)
      });
    }

    res.json(exportJob);
  } catch (error) {
    console.error("Error fetching export job:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Lock a job
router.put("/:job_no(.*)/lock", async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required to lock" });
    }

    const job = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
    });

    if (!job) return res.status(404).json({ message: "Job not found" });

    // Check if already locked by someone else
    const LOCK_TIMEOUT = 30 * 60 * 1000;
    const isStale =
      job.lockedAt && new Date() - new Date(job.lockedAt) > LOCK_TIMEOUT;

    if (job.lockedBy && job.lockedBy !== username && !isStale) {
      return res.status(423).json({
        message: `Already locked by ${job.lockedBy}`,
        lockedBy: job.lockedBy,
      });
    }

    job.lockedBy = username;
    job.lockedAt = new Date();
    await job.save();

    res.json({ message: "Job locked successfully", lockedBy: username });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Unlock a job
router.put("/:job_no(.*)/unlock", async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);
    const { username } = req.body;

    const job = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
    });

    if (!job) return res.status(404).json({ message: "Job not found" });

    // Only let the owner or an admin unlock? For now, if username matches
    if (job.lockedBy === username) {
      job.lockedBy = null;
      job.lockedAt = null;
      await job.save();
      return res.json({ message: "Job unlocked successfully" });
    }

    // Explicitly allow non-lockers to "succeed" during cleanup to prevent frontend errors
    return res.json({ message: "Job released" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update export job (full)
router.put("/:job_no(.*)", auditMiddleware("Job"), async (req, res, next) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);

    // Robust check for Export Job Number format (e.g., BRANCH/EXP/MODE/SEQ/YEAR)
    // This prevents the wildcard route from eating other API request paths.
    const isJobNumber =
      job_no &&
      typeof job_no === "string" &&
      job_no.includes("/") &&
      job_no.split("/").length >= 3;

    if (!isJobNumber) {
      return next();
    }

    const username = req.headers["username"];

    // Enforce lock check
    const existingJob = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
    });
    if (
      existingJob &&
      existingJob.lockedBy &&
      existingJob.lockedBy !== username
    ) {
      const LOCK_TIMEOUT = 30 * 60 * 1000;
      if (
        existingJob.lockedAt &&
        new Date() - new Date(existingJob.lockedAt) < LOCK_TIMEOUT
      ) {
        return res.status(403).json({
          message: `Update blocked: Job is locked by ${existingJob.lockedBy}`,
        });
      }
    }

    const updateData = { ...req.body, updatedAt: new Date() };

    // Gracefully handle if detailedStatus arrives as an array from the frontend
    if (Array.isArray(updateData.detailedStatus)) {
      updateData.detailedStatus = updateData.detailedStatus.length > 0
        ? String(updateData.detailedStatus[updateData.detailedStatus.length - 1])
        : "";
    }

    // Business Logic: If "Billing Done" is selected in detailedStatus, mark job as completed
    if (updateData.detailedStatus === "Billing Done") {
      updateData.status = "Completed";
    }

    const updatedExportJob = await ExJobModel.findOneAndUpdate(
      { job_no: { $regex: `^${job_no}$`, $options: "i" } },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedExportJob) {
      return res.status(404).json({ message: "Export job not found" });
    }

    // Force Mongoose to run pre-save hook calculation for milestones and status
    updatedExportJob.markModified("milestones");
    updatedExportJob.markModified("detailedStatus");
    await updatedExportJob.save();

    res.json({
      message: "Export job updated successfully",
      data: updatedExportJob,
    });
  } catch (error) {
    console.error("Error updating export job:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PATCH fields
router.patch(
  "/:job_no(.*)/fields",
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const raw = req.params.job_no || "";
      const job_no = decodeURIComponent(raw);

      const { fieldUpdates } = req.body;
      const updateObject = {};
      (fieldUpdates || []).forEach(({ field, value }) => {
        updateObject[field] = value;
      });
      updateObject.updatedAt = new Date();

      // Gracefully handle if detailedStatus arrives as an array from the frontend
      if (Array.isArray(updateObject.detailedStatus)) {
        updateObject.detailedStatus = updateObject.detailedStatus.length > 0
          ? String(updateObject.detailedStatus[updateObject.detailedStatus.length - 1])
          : "";
      }

      // Business Logic: If Billing Done is selected, mark as Completed
      if (updateObject.detailedStatus === "Billing Done") {
        updateObject.status = "Completed";
      }

      const updatedExportJob = await ExJobModel.findOneAndUpdate(
        { job_no: { $regex: `^${job_no}$`, $options: "i" } },
        { $set: updateObject },
        { new: true }
      );

      if (!updatedExportJob) {
        return res.status(404).json({ message: "Export job not found" });
      }

      // Force Pre-Save calculations for milestones and detailedStatus
      updatedExportJob.markModified("milestones");
      updatedExportJob.markModified("detailedStatus");
      await updatedExportJob.save();

      res.json({
        message: "Fields updated successfully",
        updatedFields: Object.keys(updateObject),
        data: updatedExportJob,
      });
    } catch (error) {
      console.error("Error updating export job fields:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PUT documents
router.put(
  "/:job_no(.*)/documents",
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const raw = req.params.job_no || "";
      const job_no = decodeURIComponent(raw);

      const { export_documents } = req.body;

      const updatedExportJob = await ExJobModel.findOneAndUpdate(
        { job_no: { $regex: `^${job_no}$`, $options: "i" } },
        { $set: { export_documents, updatedAt: new Date() } },
        { new: true }
      );

      if (!updatedExportJob) {
        return res.status(404).json({ message: "Export job not found" });
      }

      res.json({
        message: "Documents updated successfully",
        data: updatedExportJob,
      });
    } catch (error) {
      console.error("Error updating export documents:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PUT containers
router.put(
  "/:job_no(.*)/containers",
  auditMiddleware("Job"),
  async (req, res) => {
    try {
      const raw = req.params.job_no || "";
      const job_no = decodeURIComponent(raw);

      const { containers } = req.body;

      const updatedExportJob = await ExJobModel.findOneAndUpdate(
        { job_no: { $regex: `^${job_no}$`, $options: "i" } },
        { $set: { containers, updatedAt: new Date() } },
        { new: true }
      );

      if (!updatedExportJob) {
        return res.status(404).json({ message: "Export job not found" });
      }

      res.json({
        message: "Containers updated successfully",
        data: updatedExportJob,
      });
    } catch (error) {
      console.error("Error updating containers:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
