import express from "express";
import JobModel from "../../model/jobModel.mjs";
import mongoose from "mongoose";
import UserBranchModel from "../../model/userBranchModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

// Helper to parse dates
const parseDate = (d) => new Date(d);

const getBranchMatch = (branchId, category) => {
    let match = {};

    if (branchId && branchId.toString().toLowerCase() !== "all" && branchId !== "") {
        if (Array.isArray(branchId)) {
            match.branch_id = { $in: branchId.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
        } else if (mongoose.Types.ObjectId.isValid(branchId)) {
            match.branch_id = new mongoose.Types.ObjectId(branchId);
        } else {
            match.branch_id = branchId;
        }
    }

    if (category) {
        match.mode = category;
    }

    return match;
};

export const fetchAnalyticsData = async (module, startDate, endDate, importer, branchId, category) => {
    let start, end;

    if (!startDate || !endDate) {
        // Default to today if not provided
        const today = new Date();
        start = new Date(today.setHours(0, 0, 0, 0));
        end = new Date(today.setHours(23, 59, 59, 999));
    } else {
        start = new Date(startDate);
        end = new Date(endDate);
        // Ensure end date covers the full day
        end.setHours(23, 59, 59, 999);
    }

    let pipeline = [];

    switch (module) {
        case "overview":
            pipeline = getOverviewPipeline(start, end, importer, branchId, category);
            break;
        case "movement":
            pipeline = getMovementPipeline(start, end, importer, branchId, category);
            break;
        case "customs":
            pipeline = getCustomsPipeline(start, end, importer, branchId, category);
            break;
        case "documentation":
            pipeline = getDocumentationPipeline(start, end, importer, branchId, category);
            break;
        case "do-management":
            pipeline = getDoManagementPipeline(start, end, importer, branchId, category);
            break;
        case "esanchit":
            pipeline = getESanchitPipeline(start, end, importer, branchId, category);
            break;
        case "operations":
            pipeline = getOperationsPipeline(start, end, importer, branchId, category);
            break;
        case "submission":
            pipeline = getSubmissionPipeline(start, end, importer, branchId, category);
            break;
        case "billing":
            pipeline = getBillingPipeline(start, end, importer, branchId, category);
            break;
        case "exceptions":
            pipeline = getExceptionsPipeline(start, end, importer, branchId, category);
            break;
        case "pulse":
            pipeline = getPulsePipeline(start, end, importer, branchId, category);
            break;
        default:
            throw new Error("Invalid module");
    }

    const result = await JobModel.aggregate(pipeline);
    return result[0] || {};
};

router.get("/api/analytics/:module", authMiddleware, async (req, res) => {
    try {
        const { module } = req.params;
        const { startDate, endDate, importer, category } = req.query;
        let { branchId } = req.query;

        const userId = req.headers['user-id'] || req.user?.username || req.user?._id;
        const role = req.user?.role;

        // If 'all' is requested, filter by assignments
        if (!branchId || branchId.toString().toLowerCase() === "all" || branchId === "") {
            const assignments = await UserBranchModel.find({ user_id: userId });

            if (assignments.length > 0) {
                // Return array of assigned branch IDs
                branchId = assignments.map(a => a.branch_id.toString());
            } else if (role !== 'Admin') {
                // Non-admin with no assignments sees nothing
                return res.json({});
            }
            // else Admin with no assignments sees all (branchId remains 'all' / unspecified)
        }

        const data = await fetchAnalyticsData(module, startDate, endDate, importer, branchId, category);
        res.json(data);
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(error.message === "Invalid module" ? 400 : 500).json({ error: error.message });
    }
});

// 🔹 Overview Pipeline
const getOverviewPipeline = (start, end, importer, branchId, category) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};
    const branchMatch = getBranchMatch(branchId, category);
    const baseMatch = { ...importerMatch, ...branchMatch };

    return [
        {
            $facet: {
                jobs_created_today: [
                    {
                        $match: {
                            job_date: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...baseMatch
                        }
                    },
                    {
                        $project: {
                            job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1,
                            relevant_date: "$job_date"
                        }
                    }
                ],
                operations_completed: [
                    {
                        $match: {
                            completed_operation_date: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...baseMatch
                        }
                    },
                    {
                        $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$completed_operation_date" }
                    }
                ],
                examination_planning: [
                    { $match: { examination_planning_date: { $gte: toYMD(start), $lte: end.toISOString() }, ...baseMatch } },
                    { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$examination_planning_date" } }
                ],
                jobs_trend: [
                    { $match: { job_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$job_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                ops_trend: [
                    { $match: { completed_operation_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$completed_operation_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                exam_trend: [
                    { $match: { examination_planning_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$examination_planning_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                arrival_trend: [
                    { $match: { ...baseMatch } },
                    { $unwind: "$container_nos" },
                    { $match: { "container_nos.arrival_date": { $gte: sevenDaysAgoStr, $lte: todayStr } } },
                    { $group: { _id: { $substr: ["$container_nos.arrival_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                rail_out_trend: [
                    { $match: { ...baseMatch } },
                    { $unwind: "$container_nos" },
                    { $match: { "container_nos.container_rail_out_date": { $gte: sevenDaysAgoStr, $lte: todayStr } } },
                    { $group: { _id: { $substr: ["$container_nos.container_rail_out_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                be_trend: [
                    { $match: { be_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$be_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                ooc_trend: [
                    { $match: { out_of_charge: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$out_of_charge", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                do_trend: [
                    { $match: { do_completed: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$do_completed", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                billing_trend: [
                    { $match: { bill_document_sent_to_accounts: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$bill_document_sent_to_accounts", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                eta_trend: [
                    { $match: { vessel_berthing: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$vessel_berthing", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                gateway_igm_trend: [
                    { $match: { gateway_igm_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$gateway_igm_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                discharge_trend: [
                    { $match: { discharge_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$discharge_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                arrivals_today: [
                    { $match: { ...baseMatch } },
                    { $unwind: "$container_nos" },
                    {
                        $match: {
                            "container_nos.arrival_date": { $gte: toYMD(start), $lte: end.toISOString() }
                        }
                    },
                    {
                        $project: {
                            job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1,
                            relevant_date: "$container_nos.arrival_date",
                            container_number: "$container_nos.container_number"
                        }
                    }
                ],
                rail_out_today: [
                    { $match: { ...baseMatch } },
                    { $unwind: "$container_nos" },
                    {
                        $match: {
                            "container_nos.container_rail_out_date": { $gte: toYMD(start), $lte: end.toISOString() }
                        }
                    },
                    {
                        $project: {
                            job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1,
                            relevant_date: "$container_nos.container_rail_out_date",
                            container_number: "$container_nos.container_number"
                        }
                    }
                ],
                be_filed: [
                    {
                        $match: {
                            be_date: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...baseMatch
                        }
                    },
                    {
                        $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$be_date", processed_be_attachment: 1 }
                    }
                ],
                ooc: [
                    {
                        $match: {
                            out_of_charge: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...baseMatch
                        }
                    },
                    {
                        $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$out_of_charge", ooc_copies: 1 }
                    }
                ],
                do_completed: [
                    {
                        $match: {
                            do_completed: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...baseMatch
                        }
                    },
                    {
                        $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$do_completed" }
                    }
                ],
                billing_sent: [
                    {
                        $match: {
                            bill_document_sent_to_accounts: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...baseMatch
                        }
                    },
                    {
                        $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$bill_document_sent_to_accounts" }
                    }
                ],
                eta: [
                    {
                        $match: {
                            vessel_berthing: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...baseMatch
                        }
                    },
                    {
                        $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$vessel_berthing" }
                    }
                ],
                gateway_igm_date: [
                    { $match: { gateway_igm_date: { $gte: toYMD(start), $lte: end.toISOString() }, ...baseMatch } },
                    { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$gateway_igm_date" } }
                ],
                discharge_date: [
                    { $match: { discharge_date: { $gte: toYMD(start), $lte: end.toISOString() }, ...baseMatch } },
                    { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$discharge_date" } }
                ],
                empty_offload: [
                    { $match: { ...baseMatch } },
                    { $unwind: "$container_nos" },
                    { $match: { "container_nos.emptyContainerOffLoadDate": { $gte: toYMD(start), $lte: end.toISOString() } } },
                    {
                        $project: {
                            job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1,
                            relevant_date: "$container_nos.emptyContainerOffLoadDate",
                            container_number: "$container_nos.container_number"
                        }
                    }
                ]
            }
        },
        {
            $project: {
                summary: {
                    jobs_created_today: { $size: "$jobs_created_today" },
                    operations_completed: { $size: "$operations_completed" },
                    examination_planning: { $size: "$examination_planning" },
                    arrivals_today: { $size: "$arrivals_today" },
                    rail_out_today: { $size: "$rail_out_today" },
                    be_filed: { $size: "$be_filed" },
                    ooc: { $size: "$ooc" },
                    do_completed: { $size: "$do_completed" },
                    billing_sent: { $size: "$billing_sent" },
                    eta: { $size: "$eta" },
                    gateway_igm_date: { $size: "$gateway_igm_date" },
                    discharge_date: { $size: "$discharge_date" },
                    empty_offload: { $size: "$empty_offload" }
                },
                details: {
                    jobs_created_today: "$jobs_created_today",
                    jobs_trend: "$jobs_trend",
                    ops_trend: "$ops_trend",
                    exam_trend: "$exam_trend",
                    arrival_trend: "$arrival_trend",
                    rail_out_trend: "$rail_out_trend",
                    be_trend: "$be_trend",
                    ooc_trend: "$ooc_trend",
                    do_trend: "$do_trend",
                    billing_trend: "$billing_trend",
                    eta_trend: "$eta_trend",
                    gateway_igm_trend: "$gateway_igm_trend",
                    discharge_trend: "$discharge_trend",
                    operations_completed: "$operations_completed",
                    examination_planning: "$examination_planning",
                    arrivals_today: "$arrivals_today",
                    rail_out_today: "$rail_out_today",
                    be_filed: "$be_filed",
                    ooc: "$ooc",
                    do_completed: "$do_completed",
                    billing_sent: "$billing_sent",
                    eta: "$eta",
                    gateway_igm_date: "$gateway_igm_date",
                    discharge_date: "$discharge_date",
                    empty_offload: "$empty_offload"
                }
            }
        }
    ];
};

// 🚢 Movement Pipeline
const getMovementPipeline = (start, end, importer, branchId, category) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};
    const branchMatch = getBranchMatch(branchId, category);
    const baseMatch = { ...importerMatch, ...branchMatch };

    // All metrics count containers
    const makeContainerFacet = (field) => [
        { $match: { ...baseMatch } },
        { $unwind: "$container_nos" },
        { $match: { [`container_nos.${field}`]: { $gte: toYMD(start), $lte: end.toISOString() } } },
        {
            $project: {
                job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1,
                relevant_date: `$container_nos.${field}`,
                container_number: "$container_nos.container_number"
            }
        }
    ];

    return [
        {
            $facet: {
                arrived: makeContainerFacet("arrival_date"),
                rail_out: makeContainerFacet("container_rail_out_date"),
                delivered: makeContainerFacet("delivery_date"),
                empty_offload: makeContainerFacet("emptyContainerOffLoadDate"),
                by_road: makeContainerFacet("by_road_movement_date"),
                detention_start: [
                    { $match: { ...baseMatch } },
                    { $unwind: "$container_nos" },
                    {
                        $match: {
                            "container_nos.detention_from": { $gte: toYMD(start), $lte: end.toISOString() },
                            $or: [
                                { "container_nos.emptyContainerOffLoadDate": { $exists: false } },
                                { "container_nos.emptyContainerOffLoadDate": "" },
                                { "container_nos.emptyContainerOffLoadDate": null }
                            ]
                        }
                    },
                    {
                        $project: {
                            job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1,
                            relevant_date: `$container_nos.detention_from`,
                            container_number: "$container_nos.container_number"
                        }
                    }
                ],
                // Trends
                arrival_trend: [
                    { $match: { ...baseMatch } },
                    { $unwind: "$container_nos" },
                    { $match: { "container_nos.arrival_date": { $gte: sevenDaysAgoStr, $lte: todayStr } } },
                    { $group: { _id: { $substr: ["$container_nos.arrival_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    arrived: { $size: "$arrived" },
                    rail_out: { $size: "$rail_out" },
                    delivered: { $size: "$delivered" },
                    empty_offload: { $size: "$empty_offload" },
                    by_road: { $size: "$by_road" },
                    detention_start: { $size: "$detention_start" }
                },
                details: "$$ROOT"
            }
        }
    ];
};

// 🏛 Customs Pipeline
const getCustomsPipeline = (start, end, importer, branchId, category) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};
    const branchMatch = getBranchMatch(branchId, category);
    const baseMatch = { ...importerMatch, ...branchMatch };

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...baseMatch } },
        { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    return [
        {
            $facet: {
                igm: makeJobFacet("igm_date"),
                gateway_igm: makeJobFacet("gateway_igm_date"),
                be_filed: makeJobFacet("be_date"),
                assessment: makeJobFacet("assessment_date"),
                duty_paid: makeJobFacet("duty_paid_date"),
                pcv: makeJobFacet("pcv_date"),
                ooc: makeJobFacet("out_of_charge"),
                discharge: makeJobFacet("discharge_date"),
                // Add trend data for BE and OOC
                be_trend: [
                    { $match: { be_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: "$be_date", count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                ooc_trend: [
                    { $match: { out_of_charge: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$out_of_charge", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    igm: { $size: "$igm" },
                    gateway_igm: { $size: "$gateway_igm" },
                    be_filed: { $size: "$be_filed" },
                    assessment: { $size: "$assessment" },
                    duty_paid: { $size: "$duty_paid" },
                    pcv: { $size: "$pcv" },
                    ooc: { $size: "$ooc" },
                    discharge: { $size: "$discharge" }
                },
                details: {
                    igm: "$igm", gateway_igm: "$gateway_igm", be_filed: "$be_filed", assessment: "$assessment",
                    duty_paid: "$duty_paid", pcv: "$pcv", ooc: "$ooc", discharge: "$discharge",
                    be_trend: "$be_trend", ooc_trend: "$ooc_trend"
                }
            }
        }
    ];
};

// 📄 Documentation Pipeline
const getDocumentationPipeline = (start, end, importer, branchId, category) => {
    // Calculate 7 days ago for trend
    // Note: Documentation fields are ISO-like timestamps (YYYY-MM-DDTHH:mm), so we use ISO strings for range.
    // However, for trends grouping, we need to extract YYYY-MM-DD.

    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo); // YYYY-MM-DD
    // But since we match against timestamp fields, we might need full ISO for trend match?
    // Actually, simple string match works: "2025-12-13T..." >= "2025-12-13" (True).
    // And "2025-12-20T..." <= "2025-12-20" (False).
    // So for trend range (which covers last 7 days including today), we should use a broad range.
    // "2025-12-13" to "2025-12-21" (tomorrow)? Or today's end?

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const importerMatch = importer ? { importer: importer } : {};
    const branchMatch = getBranchMatch(branchId, category);
    const baseMatch = { ...importerMatch, ...branchMatch };

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...baseMatch } },
        { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // Pending Documentation Logic (Snapshot)
    const pendingDocsMatch = {
        $and: [
            baseMatch,
            { status: { $regex: /^pending$/i } },
            { be_no: { $in: [null, ""] } }, // Important: Pending until BE is filed
            { awb_bl_no: { $ne: null, $ne: "" } },
            { job_no: { $ne: null } },
            { out_of_charge: { $eq: "" } },
            {
                detailed_status: {
                    $in: ["Discharged", "Gateway IGM Filed", "Estimated Time of Arrival", "ETA Date Pending", "Arrived, BE Note Pending", "Rail Out"]
                },
            },
            {
                $or: [
                    { documentation_completed_date_time: { $exists: false } },
                    { documentation_completed_date_time: "" },
                    {
                        $and: [
                            { documentation_completed_date_time: { $exists: true, $ne: "" } },
                            { dsr_queries: { $elemMatch: { select_module: "Documentation", resolved: { $ne: true } } } }
                        ]
                    }
                ],
            },
            {
                $and: [
                    { "cth_documents.document_name": { $all: ["Packing List", "Commercial Invoice"] } },
                    { "cth_documents.document_name": { $in: ["Bill of Lading", "Air Way BL", "Air Waybill"] } },
                    { "cth_documents": { $elemMatch: { document_name: "Packing List", url: { $exists: true, $ne: null, $ne: [], $not: { $size: 0 } } } } },
                    { "cth_documents": { $elemMatch: { document_name: "Commercial Invoice", url: { $exists: true, $ne: null, $ne: [], $not: { $size: 0 } } } } },
                    { "cth_documents": { $elemMatch: { document_name: { $in: ["Bill of Lading", "Air Way BL", "Air Waybill"] }, url: { $exists: true, $ne: null, $ne: [], $not: { $size: 0 } } } } }
                ]
            }
        ]
    };

    return [
        {
            $facet: {
                documentation_pending: [
                    { $match: pendingDocsMatch },
                    { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$job_date" } }
                ],
                documentation_completed: makeJobFacet("documentation_completed_date_time"),
                // Trend
                docs_trend: [
                    { $match: { documentation_completed_date_time: { $gte: sevenDaysAgo.toISOString(), $lte: todayEnd.toISOString() }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$documentation_completed_date_time", 0, 10] }, count: { $sum: 1 } } }, // Extract YYYY-MM-DD
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    documentation_pending: { $size: "$documentation_pending" },
                    documentation_completed: { $size: "$documentation_completed" }
                },
                details: {
                    documentation_pending: "$documentation_pending",
                    documentation_completed: "$documentation_completed",
                    docs_trend: "$docs_trend"
                }
            }
        }
    ];
};

// 📦 DoManagement Pipeline
const getDoManagementPipeline = (start, end, importer, branchId, category) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};
    const branchMatch = getBranchMatch(branchId, category);
    const baseMatch = { ...importerMatch, ...branchMatch };

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...baseMatch } },
        { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // special handling for container do expiry
    const containerExpiryFacet = [
        { $match: { ...baseMatch } },
        { $unwind: "$container_nos" },
        { $match: { "container_nos.do_validity_upto_container_level": { $gte: toYMD(start), $lte: end.toISOString() } } },
        { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$container_nos.do_validity_upto_container_level", container_number: "$container_nos.container_number" } }
    ];

    // Invoice Criteria (Same as DO List)
    const invoiceCriteria = {
        $or: [
            { shipping_line_invoice_imgs: { $exists: true, $not: { $size: 0 } } },
            { icd_cfs_invoice_img: { $exists: true, $not: { $size: 0 } } },
            { concor_invoice_and_receipt_copy: { $exists: true, $not: { $size: 0 } } },
            { thar_invoices: { $exists: true, $not: { $size: 0 } } },
            { hasti_invoices: { $exists: true, $not: { $size: 0 } } },
            { other_invoices_img: { $exists: true, $not: { $size: 0 } } }
        ]
    };

    // "In List" logic (Pending DO Planning)
    // Matches logic in `doTeamListOfjobs.mjs` - NO DATE FILTER applied to these metrics
    const pendingDoMatch = {
        $and: [
            baseMatch,
            { job_no: { $ne: null } },
            { be_no: { $exists: true, $ne: "" } },
            { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
            {
                $or: [
                    { do_planning_date: { $exists: false } },
                    { do_planning_date: "" },
                    { do_planning_date: null }
                ]
            },
            // Logic to ensure it's strictly "in list" (not moved to next stages)
            { $or: [{ shipping_line_bond_completed_date: { $exists: false } }, { shipping_line_bond_completed_date: "" }] },
            { $or: [{ shipping_line_kyc_completed_date: { $exists: false } }, { shipping_line_kyc_completed_date: "" }] },
            { $or: [{ shipping_line_invoice_received_date: { $exists: false } }, { shipping_line_invoice_received_date: "" }] },
            { $or: [{ bill_date: { $exists: false } }, { bill_date: "" }] }
        ]
    };

    return [
        {
            $facet: {
                do_planned: makeJobFacet("do_planning_date"),
                do_received: makeJobFacet("do_doc_recieved_date"),
                do_completed: makeJobFacet("do_completed"),
                do_revalidated: makeJobFacet("do_revalidation_date"),
                do_expiring_job: [
                    {
                        $match: {
                            do_validity_upto_job_level: { $gte: toYMD(start), $lte: end.toISOString() },
                            ...baseMatch,
                            $or: [
                                { do_completed: { $exists: false } },
                                { do_completed: "" },
                                { do_completed: null }
                            ]
                        }
                    },
                    { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$do_validity_upto_job_level" } }
                ],
                // New Facets - using strict "In List" logic without date range
                jobs_with_invoices: [
                    { $match: { $and: [...pendingDoMatch.$and, invoiceCriteria] } },
                    { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$job_date" } }
                ],
                jobs_without_invoices: [
                    { $match: { $and: [...pendingDoMatch.$and, { $nor: invoiceCriteria.$or }] } },
                    { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$job_date" } }
                ],
                // Trend
                do_trend: [
                    { $match: { do_completed: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$do_completed", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ],
                // Jobs currently IN DO Planning (doPlanning=true, not completed) - NOT date-filtered
                in_do_planning: [
                    {
                        $match: {
                            ...baseMatch,
                            status: { $regex: /^pending$/i },
                            $or: [{ doPlanning: true }, { doPlanning: "true" }],
                            $and: [
                                {
                                    $or: [
                                        { do_completed: false },
                                        { do_completed: "No" },
                                        { do_completed: { $exists: false } },
                                        { do_completed: "" },
                                        { do_completed: null }
                                    ]
                                }
                            ]
                        }
                    },
                    { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$do_planning_date" } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    do_planned: { $size: "$do_planned" },
                    do_received: { $size: "$do_received" },
                    do_completed: { $size: "$do_completed" },
                    do_revalidated: { $size: "$do_revalidated" },
                    do_expiring_job: { $size: "$do_expiring_job" },
                    jobs_with_invoices: { $size: "$jobs_with_invoices" },
                    jobs_without_invoices: { $size: "$jobs_without_invoices" },
                    in_do_planning: { $size: "$in_do_planning" },
                },
                details: "$$ROOT"
            }
        }
    ];
};

// 💰 Billing Pipeline
const getBillingPipeline = (start, end, importer, branchId, category) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};
    const branchMatch = getBranchMatch(branchId, category);
    const baseMatch = { ...importerMatch, ...branchMatch };

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...baseMatch } },
        { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // Facet for nested invoice dates
    const makeInvoiceFacet = (field) => [
        { $match: { ...baseMatch } },
        { $unwind: "$do_shipping_line_invoice" },
        { $match: { [`do_shipping_line_invoice.${field}`]: { $gte: toYMD(start), $lte: end.toISOString() } } },
        { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$do_shipping_line_invoice.${field}` } }
    ];

    return [
        {
            $facet: {
                billing_sheet_sent: makeJobFacet("bill_document_sent_to_accounts"),
                payment_requested: makeInvoiceFacet("payment_request_date"),
                payment_made: makeInvoiceFacet("payment_made_date"),
                // Trend
                billing_trend: [
                    { $match: { bill_document_sent_to_accounts: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$bill_document_sent_to_accounts", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    billing_sheet_sent: { $size: "$billing_sheet_sent" },
                    payment_requested: { $size: "$payment_requested" },
                    payment_made: { $size: "$payment_made" }
                },
                details: "$$ROOT"
            }
        }
    ];
};

// 🚨 Exceptions Pipeline
const getExceptionsPipeline = (start, end, importer, branchId, category) => {
    // DO validity today/expired: do_validity_upto_job_level <= today (or selected range?)
    // "Show alerts using existing fields: DO validity today/expired"
    // I'll assume it matches the range (expired within this range).

    const today = new Date().toISOString().split('T')[0];

    const importerMatch = importer ? { importer: importer } : {};
    const branchMatch = getBranchMatch(branchId, category);
    const baseMatch = { ...importerMatch, ...branchMatch };

    return [
        {
            $facet: {
                do_validity_expired: [
                    {
                        $match: {
                            do_validity_upto_job_level: { $lte: today, $ne: null }, // Expired
                            ...baseMatch
                        }
                    },
                    { $project: { job_number: 1, job_no: 1, importer: 1, relevant_date: "$do_validity_upto_job_level" } }
                ],
                containers_in_detention: [
                    { $match: { ...baseMatch } },
                    { $unwind: "$container_nos" },
                    {
                        $match: {
                            "container_nos.detention_from": { $lte: today, $ne: null }
                        }
                    },
                    { $project: { job_number: 1, job_no: 1, container_number: "$container_nos.container_number", relevant_date: "$container_nos.detention_from" } }
                ],
                pending_billing: [
                    {
                        $match: {
                            bill_document_sent_to_accounts: { $exists: false },
                            detailed_status: "Completed", // "status = Completed"
                            ...baseMatch
                        }
                    },
                    { $project: { job_number: 1, job_no: 1, importer: 1 } }
                ],
                // Jobs with status != Completed beyond selected range?
                // The logic "Jobs with status != Completed beyond selected range" is tricky.
                // Maybe "Jobs created before start date but not completed"?
                incomplete_jobs: [
                    {
                        $match: {
                            detailed_status: { $ne: "Completed" },
                            job_date: { $lt: start.toISOString() },
                            ...baseMatch
                        }
                    },
                    { $project: { job_number: 1, job_no: 1, importer: 1, relevant_date: "$job_date" } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    do_validity_expired: { $size: "$do_validity_expired" },
                    containers_in_detention: { $size: "$containers_in_detention" },
                    pending_billing: { $size: "$pending_billing" },
                    incomplete_jobs: { $size: "$incomplete_jobs" }
                },
                details: "$$ROOT"
            }
        }
    ];
};

// ⚡ E-Sanchit Pipeline
const getESanchitPipeline = (start, end, importer, branchId, category) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    const todayStr = new Date().toISOString();

    // Week start = Monday of current week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = toYMD(weekStart);

    // Month start = 1st of current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = toYMD(monthStart);

    const importerMatch = importer ? { importer: importer } : {};
    const branchMatch = getBranchMatch(branchId, category);
    const baseMatch = { ...importerMatch, ...branchMatch };

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...baseMatch } },
        { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // Pending Logic: Matches getESanchitJobs.mjs "current pending" state
    const pendingEsanchitMatch = {
        $and: [
            baseMatch,
            { status: { $regex: /^pending$/i } },
            { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
            { job_no: { $ne: null } },
            { out_of_charge: { $eq: "" } },
            { cth_documents: { $elemMatch: { is_sent_to_esanchit: true } } },
            {
                $or: [
                    { esanchit_completed_date_time: { $exists: false } },
                    { esanchit_completed_date_time: "" },
                    { esanchit_completed_date_time: null },
                    {
                        $and: [
                            { esanchit_completed_date_time: { $exists: true, $ne: "" } },
                            { dsr_queries: { $elemMatch: { select_module: "e-Sanchit", resolved: { $ne: true } } } }
                        ]
                    }
                ]
            }
        ]
    };

    return [
        {
            $facet: {
                esanchit_pending: [
                    { $match: pendingEsanchitMatch },
                    { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$job_date" } }
                ],
                esanchit_completed: makeJobFacet("esanchit_completed_date_time"),
                // This Week (Monday to Today)
                esanchit_completed_this_week: [
                    { $match: { esanchit_completed_date_time: { $gte: weekStartStr, $lte: todayStr }, ...baseMatch } },
                    { $project: { job_number: 1, job_no: 1, importer: 1, relevant_date: "$esanchit_completed_date_time" } }
                ],
                // This Month (1st to Today)
                esanchit_completed_this_month: [
                    { $match: { esanchit_completed_date_time: { $gte: monthStartStr, $lte: todayStr }, ...baseMatch } },
                    { $project: { job_number: 1, job_no: 1, importer: 1, relevant_date: "$esanchit_completed_date_time" } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    esanchit_pending: { $size: "$esanchit_pending" },
                    esanchit_completed: { $size: "$esanchit_completed" },
                    esanchit_completed_this_week: { $size: "$esanchit_completed_this_week" },
                    esanchit_completed_this_month: { $size: "$esanchit_completed_this_month" }
                },
                details: {
                    esanchit_pending: "$esanchit_pending",
                    esanchit_completed: "$esanchit_completed",
                    esanchit_completed_this_week: "$esanchit_completed_this_week",
                    esanchit_completed_this_month: "$esanchit_completed_this_month"
                }
            }
        }
    ];
};

// ⚙️ Operations Pipeline
const getOperationsPipeline = (start, end, importer, branchId, category) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};
    const branchMatch = getBranchMatch(branchId, category);
    const baseMatch = { ...importerMatch, ...branchMatch };

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...baseMatch } },
        { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // Pending "Examination Planning" Logic
    // Based on getOperationPlanningJobs.mjs logic for "Pending" status + specific stage?
    // User said "all the jobs are in examination planning".
    // I will interpret this as: Jobs that are PENDING operations and match the "Ex. Planning" criteria?
    // Or simpler: Jobs where `examination_planning_date` is SET but `completed_operation_date` is NOT?
    // In getOperationPlanningJobs.mjs, "Ex. Planning" tab means: `examination_planning_date` exists, `pcv_date` empty, `OOC` empty.

    // Arrival condition logic from getOperationPlanningJobs.mjs is complex to replicate fully in aggregation if it involves array elemMatch.
    // Exact match logic from getOperationPlanningJobs.mjs baseConditions
    // This matches the "EXAMINATION PLANNING" tab which shows all pending operation jobs
    const arrivalCondition = {
        $or: [
            { type_of_b_e: { $regex: /^Ex-?Bond$/i } },
            {
                container_nos: {
                    $elemMatch: {
                        arrival_date: { $exists: true, $nin: [null, ""] }
                    }
                }
            }
        ]
    };

    const inExamPlanningMatch = {
        status: { $regex: /^Pending$/i },
        be_no: { $exists: true, $ne: null, $ne: "", $not: /cancelled/i },
        ...baseMatch,
        $and: [
            arrivalCondition,
            {
                $or: [
                    { completed_operation_date: { $exists: false } },
                    { completed_operation_date: "" },
                    {
                        $and: [
                            { completed_operation_date: { $exists: true, $ne: "" } },
                            { dsr_queries: { $elemMatch: { select_module: "Operations", resolved: { $ne: true } } } }
                        ]
                    }
                ]
            }
        ]
    };

    return [
        {
            $facet: {
                in_examination_planning: [
                    { $match: inExamPlanningMatch },
                    { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$examination_planning_date" } }
                ],
                operations_completed: makeJobFacet("completed_operation_date"),
                // Trend
                ops_trend: [
                    { $match: { completed_operation_date: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$completed_operation_date", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    in_examination_planning: { $size: "$in_examination_planning" },
                    operations_completed: { $size: "$operations_completed" }
                },
                details: {
                    in_examination_planning: "$in_examination_planning",
                    operations_completed: "$operations_completed",
                    ops_trend: "$ops_trend"
                }
            }
        }
    ];
};

// 📤 Submission Pipeline
const getSubmissionPipeline = (start, end, importer, branchId, category) => {
    // Helper to format Date to YYYY-MM-DD string safely
    const toYMD = (date) => date.toISOString().split('T')[0];

    // Calculate 7 days ago for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = toYMD(sevenDaysAgo);
    const todayStr = new Date().toISOString();

    const importerMatch = importer ? { importer: importer } : {};
    const branchMatch = getBranchMatch(branchId, category);
    const baseMatch = { ...importerMatch, ...branchMatch };

    const makeJobFacet = (field) => [
        { $match: { [field]: { $gte: toYMD(start), $lte: end.toISOString() }, ...baseMatch } },
        { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: `$${field}` } }
    ];

    // Pending Submission Logic (Snapshot)
    // Matches logic in getSubmissionJobs.mjs
    const pendingSubmissionMatch = {
        $and: [
            baseMatch,
            { status: { $regex: /^pending$/i } },
            { job_no: { $ne: null } },
            {
                $or: [
                    { submission_completed_date_time: { $exists: false } },
                    { submission_completed_date_time: "" },
                    { submission_completed_date_time: null }
                ]
            },
            {
                $or: [
                    // FCL Prerequisites
                    {
                        $and: [
                            { consignment_type: "FCL" },
                            { documentation_completed_date_time: { $exists: true, $ne: "" } },
                            { esanchit_completed_date_time: { $exists: true, $ne: "" } },
                            { discharge_date: { $exists: true, $ne: "" } },
                            { gateway_igm_date: { $exists: true, $ne: "" } },
                            { gateway_igm: { $exists: true, $ne: "" } },
                            { igm_no: { $exists: true, $ne: "" } },
                            { igm_date: { $exists: true, $ne: "" } },
                            { is_checklist_aprroved: { $exists: true, $ne: false } }
                        ]
                    },
                    // LCL Prerequisites
                    {
                        $and: [
                            { consignment_type: "LCL" },
                            { documentation_completed_date_time: { $exists: true, $ne: "" } },
                            { esanchit_completed_date_time: { $exists: true, $ne: "" } },
                            { is_checklist_aprroved: { $exists: true, $ne: false } }
                        ]
                    }
                ]
            }
        ]
    };

    return [
        {
            $facet: {
                submission_pending: [
                    { $match: pendingSubmissionMatch },
                    { $project: { job_number: 1, job_no: 1, importer: 1, shipping_line_airline: 1, relevant_date: "$job_date" } }
                ],
                submission_completed: makeJobFacet("submission_completed_date_time"),
                // Trend
                submission_trend: [
                    { $match: { submission_completed_date_time: { $gte: sevenDaysAgoStr, $lte: todayStr }, ...baseMatch } },
                    { $group: { _id: { $substr: ["$submission_completed_date_time", 0, 10] }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } }
                ]
            }
        },
        {
            $project: {
                summary: {
                    submission_pending: { $size: "$submission_pending" },
                    submission_completed: { $size: "$submission_completed" }
                },
                details: {
                    submission_pending: "$submission_pending",
                    submission_completed: "$submission_completed",
                    submission_trend: "$submission_trend"
                }
            }
        }
    ];
};

// 💓 Pulse Combined Pipeline
const getPulsePipeline = (start, end, importer, branchId, category) => {
    const importerMatch = importer ? { importer: importer } : {};
    const branchMatch = getBranchMatch(branchId, category);
    const baseMatch = { ...importerMatch, ...branchMatch };

    // E-Sanchit Pending
    const pendingEsanchitMatch = {
        $and: [
            baseMatch,
            { status: { $regex: /^pending$/i } },
            { be_no: { $not: { $regex: "^cancelled$", $options: "i" } } },
            { job_no: { $ne: null } },
            { out_of_charge: { $eq: "" } },
            { cth_documents: { $elemMatch: { is_sent_to_esanchit: true } } },
            {
                $or: [
                    { esanchit_completed_date_time: { $exists: false } },
                    { esanchit_completed_date_time: "" },
                    { esanchit_completed_date_time: null },
                    {
                        $and: [
                            { esanchit_completed_date_time: { $exists: true, $ne: "" } },
                            { dsr_queries: { $elemMatch: { select_module: "e-Sanchit", resolved: { $ne: true } } } }
                        ]
                    }
                ]
            }
        ]
    };

    // Documentation Pending
    const pendingDocsMatch = {
        $and: [
            baseMatch,
            { status: { $regex: /^pending$/i } },
            { be_no: { $in: [null, ""] } }, // Important: Pending until BE is filed
            { awb_bl_no: { $ne: null, $ne: "" } },
            { job_no: { $ne: null } },
            { out_of_charge: { $eq: "" } },
            {
                detailed_status: {
                    $in: ["Discharged", "Gateway IGM Filed", "Estimated Time of Arrival", "ETA Date Pending", "Arrived, BE Note Pending", "Rail Out"]
                },
            },
            {
                $or: [
                    { documentation_completed_date_time: { $exists: false } },
                    { documentation_completed_date_time: "" },
                    {
                        $and: [
                            { documentation_completed_date_time: { $exists: true, $ne: "" } },
                            { dsr_queries: { $elemMatch: { select_module: "Documentation", resolved: { $ne: true } } } }
                        ]
                    }
                ],
            },
            {
                $and: [
                    { "cth_documents.document_name": { $all: ["Packing List", "Commercial Invoice"] } },
                    { "cth_documents.document_name": { $in: ["Bill of Lading", "Air Way BL", "Air Waybill"] } },
                    { "cth_documents": { $elemMatch: { document_name: "Packing List", url: { $exists: true, $ne: null, $ne: [], $not: { $size: 0 } } } } },
                    { "cth_documents": { $elemMatch: { document_name: "Commercial Invoice", url: { $exists: true, $ne: null, $ne: [], $not: { $size: 0 } } } } },
                    { "cth_documents": { $elemMatch: { document_name: { $in: ["Bill of Lading", "Air Way BL", "Air Waybill"] }, url: { $exists: true, $ne: null, $ne: [], $not: { $size: 0 } } } } }
                ]
            }
        ]
    };

    // Submission Pending
    const pendingSubmissionMatch = {
        $and: [
            baseMatch,
            { status: { $regex: /^pending$/i } },
            { job_no: { $ne: null } },
            {
                $or: [
                    { be_no: { $exists: false } },
                    { be_no: "" },
                    { submission_completed_date_time: { $exists: false } },
                    { submission_completed_date_time: "" },
                    { submission_completed_date_time: null },
                    {
                        $and: [
                            { submission_completed_date_time: { $exists: true, $ne: "" } },
                            { dsr_queries: { $elemMatch: { select_module: "Submission", resolved: { $ne: true } } } }
                        ]
                    }
                ]
            },
            {
                $or: [
                    // FCL Prerequisites
                    {
                        $and: [
                            { consignment_type: "FCL" },
                            { documentation_completed_date_time: { $exists: true, $ne: "" } },
                            { esanchit_completed_date_time: { $exists: true, $ne: "" } },
                            { discharge_date: { $exists: true, $ne: "" } },
                            { gateway_igm_date: { $exists: true, $ne: "" } },
                            { gateway_igm: { $exists: true, $ne: "" } },
                            { igm_no: { $exists: true, $ne: "" } },
                            { igm_date: { $exists: true, $ne: "" } },
                            { is_checklist_aprroved: { $exists: true, $ne: false } }
                        ]
                    },
                    // LCL Prerequisites
                    {
                        $and: [
                            { consignment_type: "LCL" },
                            { documentation_completed_date_time: { $exists: true, $ne: "" } },
                            { esanchit_completed_date_time: { $exists: true, $ne: "" } },
                            { is_checklist_aprroved: { $exists: true, $ne: false } }
                        ]
                    }
                ]
            }
        ]
    };

    // Operations (Exam Planning)
    const arrivalCondition = {
        $or: [
            { type_of_b_e: { $regex: /^Ex-?Bond$/i } },
            {
                container_nos: {
                    $elemMatch: {
                        arrival_date: { $exists: true, $nin: [null, ""] }
                    }
                }
            }
        ]
    };
    const inExamPlanningMatch = {
        status: { $regex: /^Pending$/i },
        be_no: { $exists: true, $ne: null, $ne: "", $not: /cancelled/i },
        ...baseMatch,
        $and: [
            arrivalCondition,
            {
                $or: [
                    { completed_operation_date: { $exists: false } },
                    { completed_operation_date: "" },
                    {
                        $and: [
                            { completed_operation_date: { $exists: true, $ne: "" } },
                            { dsr_queries: { $elemMatch: { select_module: "Operations", resolved: { $ne: true } } } }
                        ]
                    }
                ]
            }
        ]
    };

    // DO (In DO Planning)
    const inDoPlanningMatch = {
        ...baseMatch,
        status: { $regex: /^pending$/i },
        $or: [{ doPlanning: true }, { doPlanning: "true" }],
        $and: [
            {
                $or: [
                    { do_completed: false },
                    { do_completed: "No" },
                    { do_completed: { $exists: false } },
                    { do_completed: "" },
                    { do_completed: null }
                ]
            }
        ]
    };

    return [
        {
            $facet: {
                esanchit: [{ $match: pendingEsanchitMatch }, { $count: "count" }],
                documentation: [{ $match: pendingDocsMatch }, { $count: "count" }],
                submission: [{ $match: pendingSubmissionMatch }, { $count: "count" }],
                operations: [{ $match: inExamPlanningMatch }, { $count: "count" }],
                do: [{ $match: inDoPlanningMatch }, { $count: "count" }]
            }
        },
        {
            $project: {
                summary: {
                    esanchit: { $ifNull: [{ $arrayElemAt: ["$esanchit.count", 0] }, 0] },
                    documentation: { $ifNull: [{ $arrayElemAt: ["$documentation.count", 0] }, 0] },
                    submission: { $ifNull: [{ $arrayElemAt: ["$submission.count", 0] }, 0] },
                    operations: { $ifNull: [{ $arrayElemAt: ["$operations.count", 0] }, 0] },
                    do: { $ifNull: [{ $arrayElemAt: ["$do.count", 0] }, 0] }
                }
            }
        }
    ];
};

export default router;
