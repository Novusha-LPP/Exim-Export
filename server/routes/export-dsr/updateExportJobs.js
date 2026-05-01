import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// GET /api/job-numbers-search - Search for job numbers for 'Copy From' feature
router.get("/job-numbers-search", async (req, res) => {
  try {
    const { q = "" } = req.query;
    const filter = {};
    if (q) {
      filter.job_no = { $regex: q, $options: "i" };
    }

    const jobs = await ExJobModel.find(filter)
      .select("job_no")
      .limit(20)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: jobs.map(j => j.job_no) });
  } catch (error) {
    console.error("Error searching job numbers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

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
          $or: [
            // FCL jobs completed with Rail/Road reached
            {
              $and: [
                { consignmentType: { $ne: "LCL" } },
                { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                {
                  $or: [
                    { "operations.statusDetails.railOutReachedDate": { $exists: true, $nin: [null, ""] } },
                    { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $exists: true, $nin: [null, ""] } }
                  ]
                }
              ]
            },
            // Air/LCL jobs completed with Handover date
            {
              $and: [
                {
                  $or: [
                    { consignmentType: "LCL" },
                    { job_no: { $regex: "/AIR/", $options: "i" } }
                  ]
                },
                { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } }
              ]
            }
          ],
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
            // FCL: Handover pending if Rail/Road reach is missing
            {
              $and: [
                { consignmentType: { $ne: "LCL" } },
                { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                {
                  $or: [
                    { "operations.statusDetails.railOutReachedDate": { $in: [null, ""] } },
                    { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $in: [null, ""] } },
                    { "operations.statusDetails": { $size: 0 } }
                  ]
                }
              ]
            },
            // Air/LCL: Handover pending if handover date is missing
            {
              $and: [
                {
                  $or: [
                    { consignmentType: "LCL" },
                    { job_no: { $regex: "/AIR/", $options: "i" } }
                  ]
                },
                {
                  $or: [
                    { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
                    { "operations.statusDetails": { $size: 0 } }
                  ]
                }
              ]
            }
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
        let statusArray = Array.isArray(detailedStatus) ? detailedStatus : [detailedStatus];
        if (statusArray.includes("Rail Out")) {
          statusArray = [...statusArray, "Road Out", "Road out", "road out", "RAIL OUT", "ROAD OUT"];
        }

        if (statusArray.includes("Pending")) {
          filter.$and.push({
            $or: [
              { detailedStatus: { $in: statusArray } },
              { detailedStatus: { $in: [null, "", "Pending"] } },
              { detailedStatus: { $exists: false } }
            ]
          });
        } else {
          filter.$and.push({ detailedStatus: { $in: statusArray } });
        }
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
          gstin: 1,
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
          freight_done: 1,
          freight_enquiry_id: 1,
          isLocked: 1,
          branch_code: 1,
          transportMode: 1,
          movement_type: 1,
          port_of_loading: 1,
          billingDetails: 1,
          "operations.statusDetails.containerPlacementDate": 1,
          "operations.statusDetails.handoverForwardingNoteDate": 1,
          "operations.statusDetails.railOutReachedDate": 1,
          "operations.statusDetails.leoDate": 1,
          "operations.statusDetails.leoUpload": 1,
          "operations.statusDetails.booking_copy": 1,
          "operations.statusDetails.bookingUpload": 1,
          "operations.statusDetails.forwardingNoteDocUpload": 1,
          "operations.statusDetails.manualVgmUpload": 1,
          "operations.statusDetails.odexVgmUpload": 1,
          "operations.statusDetails.odexEsbUpload": 1,
          "operations.statusDetails.odexForm13Upload": 1,
          "operations.statusDetails.cmaForwardingNoteUpload": 1,
          "operations.statusDetails.otherDocUpload": 1,
          "operations.statusDetails.stuffingSheetUpload": 1,
          "operations.statusDetails.stuffingPhotoUpload": 1,
          "operations.statusDetails.eGatePassUpload": 1,
          "operations.statusDetails.clpUpload": 1,
          "operations.statusDetails.completionCopyUpload": 1,
          "operations.statusDetails.movementCopyUpload": 1,
          "operations.statusDetails.shippingInstructionsUpload": 1,
          "operations.statusDetails.form13CopyUpload": 1,
          "operations.statusDetails.handoverImageUpload": 1,
          "operations.statusDetails.billingDocsSentUpload": 1,
          "operations.statusDetails.billingDocsSentDt": 1,
          "operations.statusDetails.status": 1,
          "operations.transporterDetails.images": 1,
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
      pendingQueries = false,
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

    // Separate General Jobs from Actual Jobs
    if (status && status.toLowerCase() === "general-jobs") {
      filter.$and.push({ isGeneralJob: true });
    } else {
      filter.$and.push({ isGeneralJob: { $ne: true } });
    }

    // Exclude Freight Forwarding jobs (FF/) from Export module
    filter.$and.push({ job_no: { $not: /^FF\//i } });

    // Status filtering logic with job tracking consideration
    // Job is considered "completed" if:
    // 1. Explicit status is "completed", OR
    // 2. jobTracking is enabled (regardless of milestone status)
    if (status && status.toLowerCase() !== "all" && status.toLowerCase() !== "general-jobs") {
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
            // FCL: Handover pending if Rail/Road reach is missing
            {
              $and: [
                { consignmentType: { $ne: "LCL" } },
                { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                {
                  $or: [
                    { "operations.statusDetails.railOutReachedDate": { $in: [null, ""] } },
                    { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $in: [null, ""] } },
                    { "operations.statusDetails": { $size: 0 } }
                  ]
                }
              ]
            },
            // Air/LCL: Handover pending if handover date is missing
            {
              $and: [
                {
                  $or: [
                    { consignmentType: "LCL" },
                    { job_no: { $regex: "/AIR/", $options: "i" } }
                  ]
                },
                {
                  $or: [
                    { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
                    { "operations.statusDetails": { $size: 0 } }
                  ]
                }
              ]
            }
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
          $or: [
            // FCL jobs completed with Rail/Road reached
            {
              $and: [
                { consignmentType: { $ne: "LCL" } },
                { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                {
                  $or: [
                    { "operations.statusDetails.railOutReachedDate": { $exists: true, $nin: [null, ""] } },
                    { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $exists: true, $nin: [null, ""] } }
                  ]
                }
              ]
            },
            // Air/LCL jobs completed with Handover date
            {
              $and: [
                {
                  $or: [
                    { consignmentType: "LCL" },
                    { job_no: { $regex: "/AIR/", $options: "i" } }
                  ]
                },
                { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } }
              ]
            }
          ],
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

    if (pendingQueries === "true" || pendingQueries === true) {
      const QueryModel = (await import("../../model/export/QueryModel.mjs")).default;
      const queryFilter = { status: "open" };
      const openQueries = await QueryModel.find(queryFilter).select("job_no").lean();
      const openJobNos = [...new Set(openQueries.map(q => q.job_no))];
      filter.$and.push({ job_no: { $in: openJobNos } });
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
      let statusArray = Array.isArray(detailedStatus) ? detailedStatus : [detailedStatus];
      if (statusArray.includes("Rail Out")) {
        statusArray = [...statusArray, "Road Out"];
      }

      if (statusArray.includes("Pending")) {
        filter.$and.push({
          $or: [
            { detailedStatus: { $in: statusArray } },
            { detailedStatus: { $in: [null, "", "Pending"] } },
            { detailedStatus: { $exists: false } }
          ]
        });
      } else {
        filter.$and.push({
          detailedStatus: { $in: statusArray },
        });
      }
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
      operational_lock: 1,
      exporter: 1,
      exporter_ref_no: 1,
      exporter_branch_name: 1,
      "consignees.consignee_name": 1,
      "buyerThirdPartyInfo.buyer.name": 1,
      ieCode: 1,
      panNo: 1,
      gstin: 1,
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
      booking_no: 1,
      booking_date: 1,
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
      isGeneralJob: 1,
      "operations.statusDetails.containerPlacementDate": 1,
      "operations.statusDetails.handoverForwardingNoteDate": 1,
      "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": 1,
      "operations.statusDetails.railOutReachedDate": 1,
      "operations.statusDetails.leoDate": 1,
      "operations.statusDetails.railRoad": 1,
      "operations.statusDetails.leoUpload": 1,
      "operations.statusDetails.booking_copy": 1,
      "operations.statusDetails.forwardingNoteDocUpload": 1,
      "operations.statusDetails.manualVgmUpload": 1,
      "operations.statusDetails.odexVgmUpload": 1,
      "operations.statusDetails.odexEsbUpload": 1,
      "operations.statusDetails.odexForm13Upload": 1,
      "operations.statusDetails.cmaForwardingNoteUpload": 1,
      "operations.statusDetails.otherDocUpload": 1,
      "operations.statusDetails.stuffingSheetUpload": 1,
      "operations.statusDetails.stuffingPhotoUpload": 1,
      "operations.statusDetails.eGatePassUpload": 1,
      "operations.statusDetails.clpUpload": 1,
      "operations.statusDetails.completionCopyUpload": 1,
      "operations.statusDetails.movementCopyUpload": 1,
      "operations.statusDetails.shippingInstructionsUpload": 1,
      "operations.statusDetails.form13CopyUpload": 1,
      "operations.statusDetails.handoverImageUpload": 1,
      "operations.statusDetails.billingDocsSentUpload": 1,
      "operations.statusDetails.billingDocsSentDt": 1,
      "operations.statusDetails.status": 1,
      "operations.transporterDetails.images": 1,
      lockedBy: 1,
      lockedAt: 1
    };

    // When search is active, use aggregation to prioritize results by match type
    // Priority: 1=job_no, 2=sb_no, 3=container, 4=invoice, 5=exporter/other
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const aggPipeline = [
        { $match: filter },
        {
          $addFields: {
            _searchPriority: {
              $switch: {
                branches: [
                  { case: { $regexMatch: { input: { $ifNull: ["$job_no", ""] }, regex: escapedSearch, options: "i" } }, then: 1 },
                  { case: { $regexMatch: { input: { $ifNull: ["$sb_no", ""] }, regex: escapedSearch, options: "i" } }, then: 2 },
                  { case: { $gt: [{ $size: { $filter: { input: { $ifNull: ["$containers", []] }, as: "c", cond: { $regexMatch: { input: { $ifNull: ["$$c.containerNo", ""] }, regex: escapedSearch, options: "i" } } } } }, 0] }, then: 3 },
                  { case: { $gt: [{ $size: { $filter: { input: { $ifNull: ["$invoices", []] }, as: "inv", cond: { $regexMatch: { input: { $ifNull: ["$$inv.invoiceNumber", ""] }, regex: escapedSearch, options: "i" } } } } }, 0] }, then: 4 },
                ],
                default: 5
              }
            }
          }
        },
        { $sort: { _searchPriority: 1, ...sort } },
        { $project: selectProjection },
      ];

      const totalCount = await ExportJobModel.countDocuments(filter);
      const jobs = await ExportJobModel.aggregate([
        ...aggPipeline,
        { $skip: skip },
        { $limit: parseInt(limit) },
      ]);

      return res.json({
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
    }

    // No search - use standard find with sort
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

// GET /api/filtered-exporters - Get unique list of exporters matching current filters
router.get("/filtered-exporters", async (req, res) => {
  try {
    const {
      search = "",
      consignmentType = "",
      branch = "",
      status = "all",
      year = "",
      detailedStatus = "",
      jobOwner = "",
      month = "",
      customHouse = "",
      goods_stuffed_at = "",
    } = req.query;

    const filter = {};
    if (!filter.$and) filter.$and = [];

    // 1. Fetch user restrictions
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin") {
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

    // 2. Status filtering logic (mirrors /exports)
    if (status && status.toLowerCase() !== "all") {
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

    // 3. Search filter
    if (search) {
      filter.$and.push({
        $or: [
          { job_no: { $regex: search, $options: "i" } },
          { exporter: { $regex: search, $options: "i" } },
          { "consignees.consignee_name": { $regex: search, $options: "i" } },
          { sb_no: { $regex: search, $options: "i" } },
          { "invoices.invoiceNumber": { $regex: search, $options: "i" } },
          { "containers.containerNo": { $regex: search, $options: "i" } }
        ],
      });
    }

    // 4. Other fields
    if (consignmentType) filter.$and.push({ consignmentType: consignmentType });
    if (branch) filter.$and.push({ branch_code: { $regex: `^${branch}$`, $options: "i" } });
    if (year && year !== "all") filter.$and.push({ year: year });
    if (detailedStatus) {
      let statusArray = Array.isArray(detailedStatus) ? detailedStatus : [detailedStatus];
      if (statusArray.includes("Rail Out")) {
        statusArray = [...statusArray, "Road Out"];
      }

      if (statusArray.includes("Pending")) {
        filter.$and.push({
          $or: [
            { detailedStatus: { $in: statusArray } },
            { detailedStatus: { $in: [null, "", "Pending"] } },
            { detailedStatus: { $exists: false } }
          ]
        });
      } else {
        filter.$and.push({ detailedStatus: { $in: statusArray } });
      }
    }
    if (customHouse) filter.$and.push({ custom_house: { $regex: customHouse, $options: "i" } });
    if (goods_stuffed_at) filter.$and.push({ goods_stuffed_at: goods_stuffed_at });

    if (month) {
      // Month logic same as /exports
      if (month === "today") {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        filter.$and.push({ createdAt: { $gte: start, $lte: end } });
      } else if (month === "yesterday") {
        const start = new Date(); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
        filter.$and.push({ createdAt: { $gte: start, $lte: end } });
      } else if (month === "weekly") {
        const start = new Date(); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
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
                    then: { $dateFromString: { dateString: "$job_date", format: "%d-%m-%Y", onError: "$createdAt" } },
                    else: "$createdAt"
                  }
                }
              },
              in: { $eq: [{ $month: "$$effDate" }, parseInt(month)] }
            }
          }
        });
      }
    }

    if (filter.$and && filter.$and.length === 0) delete filter.$and;

    const uniqueExporters = await ExportJobModel.distinct("exporter", filter);
    res.json({ success: true, data: uniqueExporters.filter(Boolean).sort() });
  } catch (error) {
    console.error("Error fetching filtered exporters:", error);
    res.status(500).json({ success: false, message: "Error fetching filtered exporters" });
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

// POST /api/create-general-job - Create a new general job
router.post("/create-general-job", auditMiddleware("Job"), async (req, res) => {
  try {
    const { year } = req.body;
    if (!year) return res.status(400).json({ success: false, message: "Year is required" });

    // Generate next job number using max sequence finding
    // Sequence: GEN/EXP/XXXX/YY-YY
    const jobs = await ExportJobModel.find({
      job_no: new RegExp(`^GEN/EXP/\\d+/${year}$`, 'i')
    }).select('job_no').lean();

    let maxNum = 0;
    jobs.forEach(job => {
      if (job && job.job_no) {
        const parts = job.job_no.split('/');
        const currentNum = parseInt(parts[2]);
        if (!isNaN(currentNum) && currentNum > maxNum) {
          maxNum = currentNum;
        }
      }
    });

    const nextNum = maxNum + 1;

    const job_no = `GEN/EXP/${String(nextNum).padStart(4, '0')}/${year}`;

    const requester = await UserModel.findOne({ username: req.headers["username"] || req.headers["x-username"] });
    let branch_code = "";
    if (requester && requester.selected_branches && requester.selected_branches.length > 0) {
      const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
      branch_code = BRANCH_MAP[requester.selected_branches[0].toUpperCase()] || requester.selected_branches[0];
    }

    const { exporter, exporter_address, gstin, panNo } = req.body;

    const newJobData = {
      job_no,
      jobNumber: job_no, // REQUIRED for unique index
      year,
      isGeneralJob: true,
      status: "Pending",
      exporter: exporter || "GENERAL JOB",
      exporter_address: exporter_address || "",
      gstin: gstin || "",
      panNo: panNo || "",
      branch_code: branch_code || "GEN",
      custom_house: "GEN",
      job_date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      createdBy: req.headers["username"] || "System",
    };

    const newJob = new ExportJobModel(newJobData);
    const savedJob = await newJob.save();
    res.status(201).json({ success: true, data: savedJob });
  } catch (error) {
    console.error("Error creating general job:", error);
    res.status(500).json({
      success: false,
      message: "Error creating general job",
      error: error.message,
    });
  }
});

// POST /api/sync-all-job-statuses - One-time sync to match detailed status for all jobs
router.post("/sync-all-job-statuses", async (req, res) => {
  try {
    const jobs = await ExportJobModel.find({});
    let count = 0;
    for (const job of jobs) {
      await job.save(); // Triggers the pre-save hook logic
      count++;
    }
    res.json({
      success: true,
      message: `Successfully synchronized ${count} jobs.`,
    });
  } catch (error) {
    console.error("Error syncing jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error synchronizing jobs",
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

    let exportJob = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
    });

    // JIT CREATION: If not found and it's a Freight Forwarding enquiry, create from FreightEnquiry
    if (!exportJob && job_no.startsWith("FF/")) {
      const enquiry = await FreightEnquiryModel.findOne({
        enquiry_no: job_no,
        status: "Converted"
      });
      if (enquiry) {
        console.log(`[JIT] Creating job record for converted enquiry: ${job_no}`);
        exportJob = new ExJobModel({
          job_no: enquiry.enquiry_no,
          jobNumber: enquiry.enquiry_no,
          year: String(new Date().getFullYear()).slice(-2) + "-" + String(new Date().getFullYear() + 1).slice(-2),
          job_date: enquiry.enquiry_date || new Date().toISOString().split("T")[0],
          exporter: enquiry.organization_name,
          consignmentType: enquiry.consignment_type,
          port_of_loading: enquiry.port_of_loading,
          port_of_discharge: enquiry.port_of_destination,
          isGeneralJob: true,
          status: "Pending",
          detailedStatus: "Created from Freight Enquiry"
        });
        await exportJob.save();
      }
    }

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
    if (exportJob.lockedBy && (exportJob.lockedBy || "").toLowerCase() !== (username || "").toLowerCase()) {
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

    if (job.lockedBy && (job.lockedBy || "").toLowerCase() !== (username || "").toLowerCase() && !isStale) {
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

// Unlock a job (Supports both PUT and POST for sendBeacon support)
router.route("/:job_no(.*)/unlock").all(async (req, res) => {
  try {
    const raw = req.params.job_no || "";
    const job_no = decodeURIComponent(raw);
    const { username } = req.body;

    const job = await ExJobModel.findOne({
      job_no: { $regex: `^${job_no}$`, $options: "i" },
    });

    if (!job) return res.status(404).json({ message: "Job not found" });

    // Only let the owner or an admin unlock? For now, if username matches
    if ((job.lockedBy || "").toLowerCase() === (username || "").toLowerCase()) {
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

    // Business Logic: Status is determined by pre-save hook in the model
    // but we can set it here if desired. Removing one-way logic to allow model to handle it.

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

      // Business Logic: Status is determined by pre-save hook in the model

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
