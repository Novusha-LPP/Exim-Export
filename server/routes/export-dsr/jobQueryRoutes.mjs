import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";
import UserModel from "../../model/userModel.mjs";
import { escapeRegex, isFreightForwardingJob, hasClubBillingDate } from "./exportJobHelpers.mjs";

const router = express.Router();

router.get("/job-numbers-search", async (req, res) => {
  try {
    const { q = "", year = "", completed } = req.query;
    const filter = { job_no: { $not: /^FF/i } };
    const andConditions = [];
    if (q) {
      andConditions.push({ job_no: { $regex: q, $options: "i" } });
    }
    if (year) {
      andConditions.push({ year: year });
    }
    if (completed === "true") {
      andConditions.push({ status: "Completed" });
    }
    if (andConditions.length > 0) {
      filter.$and = andConditions;
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
        let branchRestrictions = requester.selected_branches || [];
        const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
        branchRestrictions = branchRestrictions.map(b => BRANCH_MAP[b.toUpperCase()] || b);

        if (branchRestrictions.length > 0) {
          const branchRegexStr = branchRestrictions.map(r => String(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
          const fallbackRegex = `^(${branchRegexStr})(/|$)`;
          matchStage.$and.push({
            $or: [
              { branch_code: { $in: branchRestrictions } },
              {
                $and: [
                  { $or: [{ branch_code: "" }, { branch_code: null }, { branch_code: { $exists: false } }] },
                  { job_no: { $regex: fallbackRegex, $options: "i" } }
                ]
              }
            ]
          });
        } else {
          matchStage.$and.push({ branch_code: { $in: [] } });
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
    if (exporter) matchStage.$and.push({ exporter: { $regex: escapeRegex(exporter), $options: "i" } });
    if (consignmentType) matchStage.$and.push({ consignmentType: consignmentType });
    if (branch) matchStage.$and.push({ branch_code: { $regex: `^${escapeRegex(branch)}$`, $options: "i" } });

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

function parseDetailedStatusParam(queryObj) {
  if (!queryObj) return [];
  const val = queryObj.detailedStatus || queryObj["detailedStatus[]"] || queryObj["detailedStatus"];
  if (!val) return [];
  let list = [];
  if (Array.isArray(val)) {
    list = val;
  } else if (typeof val === "string") {
    list = val.split(",");
  }
  return list.map(s => String(s).trim()).filter(s => s !== "" && s !== "null" && s !== "undefined");
}

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
        let branchRestrictions = requester.selected_branches || [];
        const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
        branchRestrictions = branchRestrictions.map(b => BRANCH_MAP[b.toUpperCase()] || b);

        if (branchRestrictions.length > 0) {
          const branchRegexStr = branchRestrictions.map(r => String(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
          const fallbackRegex = `^(${branchRegexStr})(/|$)`;
          filter.$and.push({
            $or: [
              { branch_code: { $in: branchRestrictions } },
              {
                $and: [
                  { $or: [{ branch_code: "" }, { branch_code: null }, { branch_code: { $exists: false } }] },
                  { job_no: { $regex: fallbackRegex, $options: "i" } }
                ]
              }
            ]
          });
        } else {
          filter.$and.push({ branch_code: { $in: [] } });
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

    // Exclude Freight Forwarding jobs (FF) from Export module global search
    filter.$and.push({ job_no: { $not: /^FF/i } });

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
            { "operations.statusDetails.billingDocsSentDt": { $in: [null, ""] } },
            {
              $or: [
                { "operations.statusDetails.billing_details.agency_bill_date": { $in: [null, ""] } },
                { "operations.statusDetails.billing_details.agency_bill_no": { $in: [null, ""] } }
              ]
            },
            {
              $or: [
                { "operations.statusDetails.billing_details.reimbursement_bill_date": { $in: [null, ""] } },
                { "operations.statusDetails.billing_details.reimbursement_bill_no": { $in: [null, ""] } }
              ]
            }
          ]
        });
      } else if (statusLower === "op completed") {
        filter.$and.push({
          $or: [
            // FCL jobs completed ONLY if LEO, Handover, Rail Out, and Rail Reached dates are all set
            {
              $and: [
                { consignmentType: { $ne: "LCL" } },
                { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
                { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } },
                { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $exists: true, $nin: [null, ""] } },
                { "operations.statusDetails.railOutReachedDate": { $exists: true, $nin: [null, ""] } }
              ]
            },
            // Air/LCL jobs completed ONLY if LEO and Handover dates are set
            {
              $and: [
                {
                  $or: [
                    { consignmentType: "LCL" },
                    { job_no: { $regex: "/AIR/", $options: "i" } }
                  ]
                },
                { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
                { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } }
              ]
            }
          ]
        });
        filter.$and.push({
          $or: [
            { "operations.statusDetails.billingDocsSentDt": { $exists: false } },
            { "operations.statusDetails.billingDocsSentDt": null },
            { "operations.statusDetails.billingDocsSentDt": "" },
            { "operations.statusDetails.billing_details.agency_bill_date": { $exists: false } },
            { "operations.statusDetails.billing_details.agency_bill_date": null },
            { "operations.statusDetails.billing_details.agency_bill_date": "" },
            { "operations.statusDetails.billing_details.agency_bill_no": { $exists: false } },
            { "operations.statusDetails.billing_details.agency_bill_no": null },
            { "operations.statusDetails.billing_details.agency_bill_no": "" },
            { "operations.statusDetails.billing_details.reimbursement_bill_date": { $exists: false } },
            { "operations.statusDetails.billing_details.reimbursement_bill_date": null },
            { "operations.statusDetails.billing_details.reimbursement_bill_date": "" },
            { "operations.statusDetails.billing_details.reimbursement_bill_no": { $exists: false } },
            { "operations.statusDetails.billing_details.reimbursement_bill_no": null },
            { "operations.statusDetails.billing_details.reimbursement_bill_no": "" },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      } else if (statusLower === "booking pending") {
        filter.$and.push({ $nor: [CLUB_JOB_BILLING_COMPLETE_FILTER] });
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
        filter.$and.push({ $nor: [CLUB_JOB_BILLING_COMPLETE_FILTER] });
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
            { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      }
    }

    // 3. Search filter
    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and.push({
        $or: [
          { job_no: { $regex: escapedSearch, $options: "i" } },
          { exporter: { $regex: escapedSearch, $options: "i" } },
          { ieCode: { $regex: escapedSearch, $options: "i" } },
          { "consignees.consignee_name": { $regex: escapedSearch, $options: "i" } },
          { sb_no: { $regex: escapedSearch, $options: "i" } },
          { "invoices.invoiceNumber": { $regex: escapedSearch, $options: "i" } },
          { "containers.containerNo": { $regex: escapedSearch, $options: "i" } },
          { port_of_discharge: { $regex: escapedSearch, $options: "i" } },
          { exporter_ref_no: { $regex: escapedSearch, $options: "i" } },
          { awb_bl_no: { $regex: escapedSearch, $options: "i" } },
          { custom_house: { $regex: escapedSearch, $options: "i" } },
          { booking_no: { $regex: escapedSearch, $options: "i" } },
          { "invoices.invoiceNo": { $regex: escapedSearch, $options: "i" } },
          { port_of_loading: { $regex: escapedSearch, $options: "i" } },
          { destination_port: { $regex: escapedSearch, $options: "i" } }
        ],
      });
    }

    // 3. Apply OTHER filters ONLY if NOT searching globally
    if (!search || search.trim() === "") {
      if (branch) {
        filter.$and.push({ branch_code: { $regex: `^${escapeRegex(branch)}$`, $options: "i" } });
      }

      if (year && year !== "all") {
        filter.$and.push({ year: year });
      }

      if (exporter) {
        filter.$and.push({ exporter: { $regex: escapeRegex(exporter), $options: "i" } });
      }

      if (consignmentType) {
        filter.$and.push({ consignmentType: consignmentType });
      }

      const statusArrayInput = parseDetailedStatusParam(req.query);
      if (statusArrayInput.length > 0) {
        let statusArray = [...statusArrayInput];
        if (statusArray.includes("Rail Out")) {
          statusArray = [...statusArray, "Road Out", "Road out", "road out", "RAIL OUT", "ROAD OUT"];
        }

        // Handle "Send for Billing" as a virtual status (not stored in detailedStatus field)
        const hasSendForBilling = statusArray.includes("Send for Billing");
        const filteredStatusArray = statusArray.filter(s => s !== "Send for Billing");

        const orConditions = [];

        if (filteredStatusArray.length > 0) {
          if (filteredStatusArray.includes("Pending")) {
            orConditions.push(
              { detailedStatus: { $in: filteredStatusArray } },
              { detailedStatus: { $in: [null, "", "Pending"] } },
              { detailedStatus: { $exists: false } }
            );
          } else {
            orConditions.push({ detailedStatus: { $in: filteredStatusArray } });
          }
        }

        if (hasSendForBilling) {
          orConditions.push({
            send_for_billing: true,
            send_for_billing_date: { $exists: true, $nin: [null, ""] }
          });
        }

        if (orConditions.length > 0) {
          filter.$and.push({ $or: orConditions });
        }

        if (!hasSendForBilling && filteredStatusArray.length > 0 && !filteredStatusArray.includes("Pending")) {
          filter.$and.push({
            $or: [
              { send_for_billing: { $ne: true } },
              { send_for_billing_date: { $exists: false } },
              { send_for_billing_date: { $in: [null, ""] } }
            ]
          });
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
          buyerThirdPartyInfo: 1,
          forwarder: 1,
          booking_no: 1,
          drawback_scroll_no: 1,
          drawback_scroll_date: 1,
          rosctl_scroll_no: 1,
          rosctl_scroll_date: 1,
          ieCode: 1,
          panNo: 1,
          gstin: 1,
          adCode: 1,
          egm_no: 1,
          egm_date: 1,
          "invoices.invoiceNumber": 1,
          "invoices.invoiceDate": 1,
          "invoices.termsOfInvoice": 1,
          "invoices.currency": 1,
          "invoices.invoiceValue": 1,
          "invoices.consigneeName": 1,
          "invoices.invoice_no": 1,
          "invoices.invoice_date": 1,
          "invoices.invValue": 1,
          "invoices.products.drawbackDetails": 1,
          sb_no: 1,
          goods_stuffed_at: 1,
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
          vgm_done: 1,
          vgm_date: 1,
          form13_done: 1,
          form13_date: 1,
          shipping_bill_done: 1,
          shipping_bill_done_date: 1,
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
          "operations.statusDetails.otherDocsCustom": 1,
          "operations.statusDetails.stuffingSheetUpload": 1,
          "operations.statusDetails.stuffingPhotoUpload": 1,
          "operations.statusDetails.eGatePassUpload": 1,
          "operations.statusDetails.clpUpload": 1,
          "operations.statusDetails.completionCopyUpload": 1,
          "operations.statusDetails.movementCopyUpload": 1,
          "operations.statusDetails.shippingInstructionsUpload": 1,
          "operations.statusDetails.form13CopyUpload": 1,
          "operations.statusDetails.assessmentCopy": 1,
          "operations.statusDetails.handoverImageUpload": 1,
          "operations.statusDetails.billingDocsSentUpload": 1,
          "operations.statusDetails.billingDocsSentDt": 1,
          "operations.statusDetails.billing_details": 1,
          "operations.statusDetails.status": 1,
          "operations.transporterDetails": 1,
          lockedBy: 1,
          lockedAt: 1,
          is_club_job_parent: 1,
          parent_club_job: 1
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

const CLUB_JOB_BILLING_COMPLETE_FILTER = {
  $or: [
    { detailedStatus: "Billing Done" },
    { "operations.statusDetails.billing_details.agency_bill_date": { $exists: true, $nin: [null, ""] } },
    { "operations.statusDetails.billing_details.reimbursement_bill_date": { $exists: true, $nin: [null, ""] } },
  ],
};

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
      startDate = "",
      endDate = "",
    } = { ...req.params, ...req.query };

    const ClientQueryModel = (await import("../../model/export/ClientQueryModel.mjs")).default;
    const openClientQueryJobs = await ClientQueryModel.find({ status: "open" }).distinct("job_no");

    const filter = {};

    // Initialize $and array for complex queries
    if (!filter.$and) filter.$and = [];

    // 1. Fetch user restrictions
    const requesterUsername = req.headers["username"] || req.headers["x-username"];
    if (requesterUsername) {
      const requester = await UserModel.findOne({ username: requesterUsername });
      if (requester && requester.role !== "Admin") {
        // Enforce Branch Restriction
        let branchRestrictions = requester.selected_branches || [];
        const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
        branchRestrictions = branchRestrictions.map(b => BRANCH_MAP[b.toUpperCase()] || b);

        if (branchRestrictions.length > 0) {
          const branchRegexStr = branchRestrictions.map(r => String(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
          const fallbackRegex = `^(${branchRegexStr})(/|$)`;
          filter.$and.push({
            $or: [
              { branch_code: { $in: branchRestrictions } },
              {
                $and: [
                  { $or: [{ branch_code: "" }, { branch_code: null }, { branch_code: { $exists: false } }] },
                  { job_no: { $regex: fallbackRegex, $options: "i" } }
                ]
              }
            ]
          });
        } else {
          filter.$and.push({ branch_code: { $in: [] } });
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

    const isAllTab = status && status.toLowerCase() === "all";

    // Separate General Jobs from Actual Jobs
    if (status && status.toLowerCase() === "general-jobs") {
      filter.$and.push({ isGeneralJob: true });
    } else if (!isAllTab) {
      filter.$and.push({ isGeneralJob: { $ne: true } });
      filter.$and.push({ job_no: { $not: /^GEN/i } });
    }

    // Exclude Freight Forwarding jobs (FF) from Export module on every tab
    filter.$and.push({ job_no: { $not: /^FF/i } });



    // Status filtering logic with job tracking consideration
    // Job is considered "completed" if:
    // 1. Explicit status is "completed", OR
    // 2. jobTracking is enabled (regardless of milestone status)
    if (status && status.toLowerCase() !== "all" && status.toLowerCase() !== "general-jobs") {
      const statusLower = status.toLowerCase();

      if (statusLower === "pending") {
        // Pending: Status is strictly pending
        filter.$and.push({
          $and: [
            { status: { $regex: "^pending$", $options: "i" } },
            { detailedStatus: { $ne: "Billing Done" } },
            { isJobCanceled: { $ne: true } },
          ],
        });
        filter.$and.push({ $nor: [CLUB_JOB_BILLING_COMPLETE_FILTER] });
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
                CLUB_JOB_BILLING_COMPLETE_FILTER,
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
            { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
            { "operations.statusDetails": { $size: 0 } }
          ]
        });
      } else if (statusLower === "prepare for billing") {
        filter.$and.push({ $nor: [CLUB_JOB_BILLING_COMPLETE_FILTER] });
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
          ]
        });
        filter.$and.push({
          $or: [
            // FCL jobs completed ONLY if LEO, Handover, Rail Out, and Rail Reached dates are all set
            {
              $and: [
                { consignmentType: { $ne: "LCL" } },
                { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
                { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } },
                { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $exists: true, $nin: [null, ""] } },
                { "operations.statusDetails.railOutReachedDate": { $exists: true, $nin: [null, ""] } }
              ]
            },
            // Air/LCL jobs completed ONLY if LEO and Handover dates are set
            {
              $and: [
                {
                  $or: [
                    { consignmentType: "LCL" },
                    { job_no: { $regex: "/AIR/", $options: "i" } }
                  ]
                },
                { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
                { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } }
              ]
            }
          ]
        });
        filter.$and.push({
          $or: [
            { send_for_billing: { $exists: false } },
            { send_for_billing: null },
            { send_for_billing: false },
          ]
        });
      } else if (statusLower === "sent for billing") {
        filter.$and.push({ $nor: [CLUB_JOB_BILLING_COMPLETE_FILTER] });
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
          ]
        });
        filter.$and.push({
          send_for_billing: true
        });
      } else if (statusLower === "club-jobs") {
        filter.$and.push({
          $or: [
            { is_club_job_parent: true },
            { parent_club_job: { $exists: true, $ne: null, $ne: "" } }
          ]
        });
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
            { status: { $regex: "^(?!cancelled$).*", $options: "i" } },
            { status: { $not: { $regex: "^completed$", $options: "i" } } },
            { detailedStatus: { $ne: "Billing Done" } },
            { isJobCanceled: { $ne: true } },
          ],
        });
        filter.$and.push({ $nor: [CLUB_JOB_BILLING_COMPLETE_FILTER] });
      } else {
        filter.$and.push({
          status: { $regex: `^${status}$`, $options: "i" },
        });
      }
    } else if (status && status.toLowerCase() === "all") {
      filter.$and.push({
        status: { $regex: "^(?!cancelled$).*", $options: "i" },
        isJobCanceled: { $ne: true }
      });
    }

    // Search filter
    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and.push({
        $or: [
          { job_no: { $regex: escapedSearch, $options: "i" } },
          { exporter: { $regex: escapedSearch, $options: "i" } },
          { ieCode: { $regex: escapedSearch, $options: "i" } },
          { exporter_ref_no: { $regex: escapedSearch, $options: "i" } },
          { "consignees.consignee_name": { $regex: escapedSearch, $options: "i" } },
          { sb_no: { $regex: escapedSearch, $options: "i" } },
          { "invoices.invoiceNumber": { $regex: escapedSearch, $options: "i" } },
          { "containers.containerNo": { $regex: escapedSearch, $options: "i" } },
          { port_of_discharge: { $regex: escapedSearch, $options: "i" } },
          { awb_bl_no: { $regex: escapedSearch, $options: "i" } },
          { custom_house: { $regex: escapedSearch, $options: "i" } },
          { booking_no: { $regex: escapedSearch, $options: "i" } },
          { "invoices.invoiceNo": { $regex: escapedSearch, $options: "i" } },
          { port_of_loading: { $regex: escapedSearch, $options: "i" } },
          { destination_port: { $regex: escapedSearch, $options: "i" } }
        ],
      });
    }



    // Additional filters
    if (exporter && exporter.toLowerCase() !== "all") {
      filter.$and.push({
        exporter: { $regex: escapeRegex(exporter), $options: "i" },
      });
    }

    if (country) {
      filter.$and.push({
        destination_country: { $regex: escapeRegex(country), $options: "i" },
      });
    }

    if (consignmentType) {
      filter.$and.push({
        consignmentType: consignmentType,
      });
    }
    if (branch) {
      filter.$and.push({
        branch_code: { $regex: `^${escapeRegex(branch)}$`, $options: "i" },
      });
    }

    // Year filter - matches exact string "YY-YY" format (e.g. "25-26")
    if (year && year !== "all") {
      filter.$and.push({ year: year });
    }

    if (startDate || endDate) {
      const getEffDateExpr = () => ({
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
      });

      filter.$and.push({
        $expr: {
          $let: {
            vars: {
              effDate: getEffDateExpr()
            },
            in: {
              $and: [
                ...(startDate ? [{ $gte: ["$$effDate", new Date(startDate + "T00:00:00.000Z")] }] : []),
                ...(endDate ? [{ $lte: ["$$effDate", new Date(endDate + "T23:59:59.999Z")] }] : [])
              ]
            }
          }
        }
      });
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

    const statusArrayInput = parseDetailedStatusParam(req.query);
    if (statusArrayInput.length > 0) {
      let statusArray = [...statusArrayInput];
      if (statusArray.includes("Rail Out")) {
        statusArray = [...statusArray, "Road Out", "Road out", "road out", "RAIL OUT", "ROAD OUT"];
      }

      // Handle "Send for Billing" as a virtual status
      const hasSendForBilling = statusArray.includes("Send for Billing");
      const filteredStatusArray = statusArray.filter(s => s !== "Send for Billing");

      const orConditions = [];

      if (filteredStatusArray.length > 0) {
        if (filteredStatusArray.includes("Pending")) {
          orConditions.push(
            { detailedStatus: { $in: filteredStatusArray } },
            { detailedStatus: { $in: [null, "", "Pending"] } },
            { detailedStatus: { $exists: false } }
          );
        } else {
          orConditions.push({ detailedStatus: { $in: filteredStatusArray } });
        }
      }

      if (hasSendForBilling) {
        orConditions.push({
          send_for_billing: true,
          send_for_billing_date: { $exists: true, $nin: [null, ""] }
        });
      }

      if (orConditions.length > 0) {
        filter.$and.push({ $or: orConditions });
      }

      if (!hasSendForBilling && filteredStatusArray.length > 0 && !filteredStatusArray.includes("Pending")) {
        filter.$and.push({
          $or: [
            { send_for_billing: { $ne: true } },
            { send_for_billing_date: { $exists: false } },
            { send_for_billing_date: { $in: [null, ""] } }
          ]
        });
      }
    }

    if (req.query.goods_stuffed_at) {
      filter.$and.push({
        goods_stuffed_at: req.query.goods_stuffed_at,
      });
    }

    const currentModule = req.query.currentModule || "export-dsr";

    // Find all job numbers matching the current tab and filters (excluding pendingQueries filter)
    const matchingJobsForCount = await ExportJobModel.find(filter).select("job_no").lean();
    const allJobNos = matchingJobsForCount.map(j => j.job_no).filter(Boolean);

    const QueryModel = (await import("../../model/export/QueryModel.mjs")).default;
    const jobsWithOpenQueries = await QueryModel.find({
      job_no: { $in: allJobNos },
      status: "open",
      targetModule: currentModule
    }).distinct("job_no");

    const pendingQueriesCount = jobsWithOpenQueries.length;

    // Apply pendingQueries filter if active
    if (pendingQueries === "true" || pendingQueries === true) {
      if (!filter.$and) filter.$and = [];
      filter.$and.push({ job_no: { $in: jobsWithOpenQueries } });
    }

    // Remove empty $and array if no conditions were added
    if (filter.$and && filter.$and.length === 0) {
      delete filter.$and;
    }

    const skip = (page - 1) * limit;

    // Sorting logic
    const { sortKey, sortOrder } = req.query;
    const sort = {};
    if (sortKey && sortKey !== "null" && sortKey !== "undefined" && sortKey !== "") {
      sort[sortKey] = sortOrder === "asc" ? 1 : -1;
      if (sortKey !== "createdAt") {
        sort.createdAt = -1;
      }
      sort._id = -1;
    } else {
      sort.isClientJobRank = -1;
      sort.createdAt = -1;
      sort._id = -1;
    }


    // Selected fields to reduce payload size for the frontend table
    const selectProjection = {
      forwarder: 1,
      job_no: 1,
      docClicks: 1,
      custom_house: 1,
      job_date: 1,
      consignmentType: 1,
      job_owner: 1,
      send_for_billing: 1,
      send_for_billing_date: 1,
      operational_lock: 1,
      exporter: 1,
      exporter_ref_no: 1,
      exporter_branch_name: 1,
      "consignees.consignee_name": 1,
      buyerThirdPartyInfo: 1,
      forwarder: 1,
      drawback_scroll_no: 1,
      drawback_scroll_date: 1,
      rosctl_scroll_no: 1,
      rosctl_scroll_date: 1,
      ieCode: 1,
      panNo: 1,
      gstin: 1,
      adCode: 1,
      egm_no: 1,
      egm_date: 1,
      "invoices.invoiceNumber": 1,
      "invoices.invoiceDate": 1,
      "invoices.termsOfInvoice": 1,
      "invoices.currency": 1,
      "invoices.invoiceValue": 1,
      "invoices.consigneeName": 1,
      "invoices.invoice_no": 1,
      "invoices.invoice_date": 1,
      "invoices.invValue": 1,
      "invoices.products.drawbackDetails": 1,
      sb_no: 1,
      goods_stuffed_at: 1,
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
      sb_or_seal_changed_notif: 1,
      sb_or_seal_changed_details: 1,
      vgm_done: 1,
      vgm_date: 1,
      form13_done: 1,
      form13_date: 1,
      shipping_bill_done: 1,
      shipping_bill_done_date: 1,
      freight_done: 1,
      freight_enquiry_id: 1,
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
      "operations.statusDetails.otherDocsCustom": 1,
      "operations.statusDetails.stuffingSheetUpload": 1,
      "operations.statusDetails.stuffingPhotoUpload": 1,
      "operations.statusDetails.eGatePassUpload": 1,
      "operations.statusDetails.clpUpload": 1,
      "operations.statusDetails.completionCopyUpload": 1,
      "operations.statusDetails.movementCopyUpload": 1,
      "operations.statusDetails.shippingInstructionsUpload": 1,
      "operations.statusDetails.form13CopyUpload": 1,
      "operations.statusDetails.assessmentCopy": 1,
      "operations.statusDetails.handoverImageUpload": 1,
      "operations.statusDetails.billingDocsSentUpload": 1,
      "operations.statusDetails.billingDocsSentDt": 1,
      "operations.statusDetails.billing_details": 1,
      "operations.statusDetails.status": 1,
      "operations.transporterDetails": 1,
      lockedBy: 1,
      lockedAt: 1,
      is_club_job_parent: 1,
      parent_club_job: 1,
      is_client_job: 1,
      created_by_client: 1
    };

    const clientJobCondition = {
      $cond: {
        if: {
          $or: [
            { $eq: ["$is_client_job", true] },
            { $eq: ["$created_by_client", true] },
            { $ne: [{ $ifNull: ["$freight_enquiry_id", ""] }, ""] },
            { $regexMatch: { input: { $ifNull: ["$detailedStatus", ""] }, regex: "Freight Enquiry", options: "i" } }
          ]
        },
        then: 1,
        else: 0
      }
    };

    // When search is active, use aggregation to prioritize results by match type
    // Priority: 1=job_no, 2=sb_no, 3=container, 4=invoice, 5=exporter/other
    let finalJobs = [];
    let finalTotalCount = 0;

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const aggPipeline = [
        { $match: filter },
        {
          $addFields: {
            hasOpenClientQuery: { $in: ["$job_no", openClientQueryJobs] },
            isClientJobRank: clientJobCondition,
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
      finalTotalCount = await ExportJobModel.countDocuments(filter);
      finalJobs = await ExportJobModel.aggregate([
        ...aggPipeline,
        { $skip: skip },
        { $limit: parseInt(limit) },
      ]);
    } else {
      const aggPipeline = [
        { $match: filter },
        {
          $addFields: {
            hasOpenClientQuery: { $in: ["$job_no", openClientQueryJobs] },
            isClientJobRank: clientJobCondition
          }
        },
        { $sort: { ...sort } },
        { $project: selectProjection }
      ];
      const [jobs, totalCount] = await Promise.all([
        ExportJobModel.aggregate([
          ...aggPipeline,
          { $skip: skip },
          { $limit: parseInt(limit) }
        ]),
        ExportJobModel.countDocuments(filter),
      ]);
      finalJobs = jobs;
      finalTotalCount = totalCount;
    }

    if (finalJobs.length > 0) {
      const parentIds = [...new Set(finalJobs.map(j => j.is_club_job_parent ? j.job_no : j.parent_club_job))].filter(Boolean);
      if (parentIds.length > 0) {
        const families = await ExportJobModel.find({
          $or: [{ job_no: { $in: parentIds } }, { parent_club_job: { $in: parentIds } }]
        }).select(selectProjection).lean();

        const groups = {};
        families.forEach(j => {
          const pid = j.is_club_job_parent ? j.job_no : j.parent_club_job;
          if (!groups[pid]) groups[pid] = { parent: null, children: [] };
          if (j.is_club_job_parent) groups[pid].parent = j;
          else groups[pid].children.push(j);
        });

        if (String(status || "").toLowerCase() === "club-jobs") {
          const finalParents = [];
          Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(pid => {
            if (groups[pid].parent) {
              const p = groups[pid].parent;
              const isCompleted = p.detailedStatus === "Billing Done" || 
                String(p.status || "").toLowerCase() === "completed" || 
                hasClubBillingDate(p) ||
                p.isJobCanceled === true || 
                String(p.status || "").toLowerCase() === "cancelled";
              if (!isCompleted) {
                groups[pid].parent.subRows = groups[pid].children
                  .filter((child) => !hasClubBillingDate(child))
                  .sort((a, b) => String(a.job_no || "").localeCompare(String(b.job_no || "")));
                finalParents.push(groups[pid].parent);
              }
            }
          });
          finalJobs = finalParents;
          finalTotalCount = finalParents.length;
        } else {
          const newJobs = [];
          const processedParents = new Set();
          const isPendingOrSentTab = ["pending", "sent for billing", "prepare for billing", "booking pending", "handover pending", "club-jobs"].includes(String(status || "").toLowerCase());
          finalJobs.forEach(job => {
            const pid = job.is_club_job_parent ? job.job_no : job.parent_club_job;
            if (pid) {
              if (!processedParents.has(pid)) {
                const parentGroup = groups[pid];
                if (parentGroup && parentGroup.parent) {
                  const parentJob = { ...parentGroup.parent };
                  const isParentBillingComplete = parentJob.detailedStatus === "Billing Done" ||
                    String(parentJob.status || "").toLowerCase() === "completed" ||
                    hasClubBillingDate(parentJob);

                  if (isPendingOrSentTab && isParentBillingComplete) {
                    return;
                  }

                  parentJob.subRows = parentGroup.children
                    .filter((child) => !isPendingOrSentTab || (!hasClubBillingDate(child) && child.detailedStatus !== "Billing Done" && String(child.status || "").toLowerCase() !== "completed"))
                    .sort((a, b) => String(a.job_no || "").localeCompare(String(b.job_no || "")));

                  if (isPendingOrSentTab && parentJob.subRows.length === 0 && isParentBillingComplete) {
                    return;
                  }

                  newJobs.push(parentJob);
                } else {
                  newJobs.push(job);
                }
                processedParents.add(pid);
              }
            } else {
              newJobs.push(job);
            }
          });
          finalJobs = newJobs;
        }
      }
    }

    res.json({
      success: true,
      data: {
        jobs: finalJobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(finalTotalCount / parseInt(limit)),
          totalCount: finalTotalCount,
          hasNextPage: page < Math.ceil(finalTotalCount / parseInt(limit)),
          hasPrevPage: page > 1,
        },
        pendingQueriesCount,
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
        let branchRestrictions = requester.selected_branches || [];
        const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
        branchRestrictions = branchRestrictions.map(b => BRANCH_MAP[b.toUpperCase()] || b);

        if (branchRestrictions.length > 0) {
          const branchRegexStr = branchRestrictions.map(r => String(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
          const fallbackRegex = `^(${branchRegexStr})(/|$)`;
          filter.$and.push({
            $or: [
              { branch_code: { $in: branchRestrictions } },
              {
                $and: [
                  { $or: [{ branch_code: "" }, { branch_code: null }, { branch_code: { $exists: false } }] },
                  { job_no: { $regex: fallbackRegex, $options: "i" } }
                ]
              }
            ]
          });
        } else {
          filter.$and.push({ branch_code: { $in: [] } });
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
      } else if (statusLower === "club-jobs") {
        filter.$and.push({
          $or: [
            { is_club_job_parent: true },
            { parent_club_job: { $exists: true, $ne: null, $ne: "" } }
          ]
        });
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
            { status: { $regex: "^(?!cancelled$).*", $options: "i" } },
            { status: { $not: { $regex: "^completed$", $options: "i" } } },
            { detailedStatus: { $ne: "Billing Done" } },
            { isJobCanceled: { $ne: true } },
          ],
        });
      } else {
        filter.$and.push({
          status: { $regex: `^${status}$`, $options: "i" },
        });
      }
    }

    // 3. Search filter
    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and.push({
        $or: [
          { job_no: { $regex: escapedSearch, $options: "i" } },
          { exporter: { $regex: escapedSearch, $options: "i" } },
          { "consignees.consignee_name": { $regex: escapedSearch, $options: "i" } },
          { sb_no: { $regex: escapedSearch, $options: "i" } },
          { "invoices.invoiceNumber": { $regex: escapedSearch, $options: "i" } },
          { "containers.containerNo": { $regex: escapedSearch, $options: "i" } },
          { port_of_discharge: { $regex: escapedSearch, $options: "i" } },
          { port_of_loading: { $regex: escapedSearch, $options: "i" } },
          { destination_port: { $regex: escapedSearch, $options: "i" } }
        ],
      });
    }

    // 4. Other fields
    if (consignmentType) filter.$and.push({ consignmentType: consignmentType });
    if (branch) filter.$and.push({ branch_code: { $regex: `^${branch}$`, $options: "i" } });
    if (year && year !== "all") filter.$and.push({ year: year });
    const statusArrayInput = parseDetailedStatusParam(req.query);
    if (statusArrayInput.length > 0) {
      let statusArray = [...statusArrayInput];
      if (statusArray.includes("Rail Out")) {
        statusArray = [...statusArray, "Road Out", "Road out", "road out", "RAIL OUT", "ROAD OUT"];
      }

      // Handle "Send for Billing" as a virtual status
      const hasSendForBilling = statusArray.includes("Send for Billing");
      const filteredStatusArray = statusArray.filter(s => s !== "Send for Billing");

      const orConditions = [];

      if (filteredStatusArray.length > 0) {
        if (filteredStatusArray.includes("Pending")) {
          orConditions.push(
            { detailedStatus: { $in: filteredStatusArray } },
            { detailedStatus: { $in: [null, "", "Pending"] } },
            { detailedStatus: { $exists: false } }
          );
        } else {
          orConditions.push({ detailedStatus: { $in: filteredStatusArray } });
        }
      }

      if (hasSendForBilling) {
        orConditions.push({
          send_for_billing: true,
          send_for_billing_date: { $exists: true, $nin: [null, ""] }
        });
      }

      if (orConditions.length > 0) {
        filter.$and.push({ $or: orConditions });
      }

      if (!hasSendForBilling && filteredStatusArray.length > 0 && !filteredStatusArray.includes("Pending")) {
        filter.$and.push({
          $or: [
            { send_for_billing: { $ne: true } },
            { send_for_billing_date: { $exists: false } },
            { send_for_billing_date: { $in: [null, ""] } }
          ]
        });
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
export default router;
