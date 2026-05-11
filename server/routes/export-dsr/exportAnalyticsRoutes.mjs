import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.get("/api/export-analytics/overview", async (req, res) => {
    try {
        const { exporter, startDate, endDate } = req.query;
        const filter = {};
        if (!filter.$and) filter.$and = [];

        // Fetch user restrictions
        const requesterUsername = req.headers["username"] || req.headers["x-username"];
        if (requesterUsername) {
            const requester = await UserModel.findOne({ username: requesterUsername });
            if (requester && requester.role !== "Admin") {
                const branchRestrictions = requester.selected_branches || [];
                if (branchRestrictions.length > 0) {
                    filter.$and.push({ branch_code: { $in: branchRestrictions } });
                }
                // ... same port/icd restrictions as pulse ...
                const portRestrictions = requester.selected_ports || [];
                const icdRestrictions = requester.selected_icd_codes || [];
                const combinedRestrictions = [...new Set([...portRestrictions, ...icdRestrictions])];
                if (combinedRestrictions.length > 0) {
                    const finalRestrictions = [];
                    combinedRestrictions.forEach(res => {
                        finalRestrictions.push(res);
                        if (res.includes(" - ")) finalRestrictions.push(res.split(" - ")[0].trim());
                    });
                    const combinedRegexStr = finalRestrictions.map(r => `^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`).join('|');
                    filter.$and.push({
                        $or: [
                            { custom_house: { $regex: combinedRegexStr, $options: "i" } },
                            { port_of_loading: { $regex: combinedRegexStr, $options: "i" } }
                        ]
                    });
                }
            }
        }

        if (exporter) {
            filter.$and.push({ exporter: { $regex: exporter, $options: "i" } });
        }

        const baseFilter = { ...filter, isGeneralJob: { $ne: true } };
        if (baseFilter.$and && baseFilter.$and.length === 0) delete baseFilter.$and;

        // Date range for Flow metrics
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : new Date();
        if (end) end.setHours(23, 59, 59, 999);

        // Trend calculation (Last 7 days)
        const trendStart = new Date();
        trendStart.setDate(trendStart.getDate() - 7);
        trendStart.setHours(0, 0, 0, 0);

        const [
            totalPendingJobs,
            opsPendingJobs,
            completedJobs,
            billingPendingJobs,
            leoPendingJobs,
            ffPendingJobs,
            // Trends
            jobsTrend,
            completedTrend
        ] = await Promise.all([
            // 1. Total Pending
            ExJobModel.find({
                ...baseFilter,
                job_no: { $not: /^FF\//i },
                $and: [
                    { $or: [{ status: { $regex: "^pending$", $options: "i" } }, { status: { $exists: false } }, { status: null }, { status: "" }] },
                    { detailedStatus: { $ne: "Billing Done" } },
                    { isJobCanceled: { $ne: true } },
                ],
            }).select("job_no exporter createdAt").lean(),

            // 2. Pending Operations
            ExJobModel.find({
                ...baseFilter,
                job_no: { $not: /^FF\//i },
                sb_no: { $exists: true, $nin: [null, ""] },
                $and: [
                    { $or: [{ status: { $regex: "^pending$", $options: "i" } }, { status: { $exists: false } }, { status: null }, { status: "" }] },
                    { detailedStatus: { $ne: "Billing Done" } }
                ],
                $or: [
                    // For FCL: Pending if Rail/Road reach date is missing
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
                    // For Air/LCL: Pending if Handover date is missing
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
            }).select("job_no exporter createdAt").lean(),

            // 3. Completed Jobs (In selected range)
            ExJobModel.find({
                ...baseFilter,
                ...(start && end ? { updatedAt: { $gte: start, $lte: end } } : {}),
                $or: [
                    { status: { $regex: "^completed$", $options: "i" } },
                    { detailedStatus: "Billing Done" }
                ]
            }).select("job_no exporter updatedAt").lean(),

            // 4. Billing Pending (Backlog)
            ExJobModel.find({
                ...filter,
                send_for_billing: true,
                $or: [
                    { "operations.statusDetails.billingDocsSentDt": { $exists: false } },
                    { "operations.statusDetails.billingDocsSentDt": null },
                    { "operations.statusDetails.billingDocsSentDt": "" },
                    { "operations.statusDetails": { $size: 0 } }
                ]
            }).select("job_no exporter createdAt").lean(),

            // 5. LEO Pending (Backlog)
            ExJobModel.find({
                ...baseFilter,
                job_no: { $not: /^FF\//i },
                $and: [
                    { $or: [{ status: { $regex: "^pending$", $options: "i" } }, { status: { $exists: false } }, { status: null }, { status: "" }] },
                    { detailedStatus: { $ne: "Billing Done" } },
                ],
                "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
                $or: [
                    { "operations.statusDetails.handoverForwardingNoteDate": { $exists: false } },
                    { "operations.statusDetails.handoverForwardingNoteDate": null },
                    { "operations.statusDetails.handoverForwardingNoteDate": "" },
                    { "operations.statusDetails": { $size: 0 } }
                ]
            }).select("job_no exporter createdAt").lean(),

            // 6. FF Jobs (Pending)
            ExJobModel.find({
                ...filter,
                job_no: /^FF\//i,
                isJobCanceled: { $ne: true },
                detailedStatus: { $ne: "Billing Done" }
            }).select("job_no exporter createdAt").lean(),

            // 7. Creation Trend
            ExJobModel.aggregate([
                { $match: { ...baseFilter, createdAt: { $gte: trendStart } } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),

            // 8. Completion Trend
            ExJobModel.aggregate([
                { 
                    $match: { 
                        ...baseFilter, 
                        updatedAt: { $gte: trendStart },
                        $or: [{ status: "Completed" }, { detailedStatus: "Billing Done" }]
                    } 
                },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ])
        ]);

        const data = {
            summary: {
                totalJobs: totalPendingJobs.length,
                pendingOperations: opsPendingJobs.length,
                completedJobs: completedJobs.length,
                billingPending: billingPendingJobs.length,
                leoPending: leoPendingJobs.length,
                ffJobs: ffPendingJobs.length
            },
            details: {
                totalJobs: totalPendingJobs.map(j => ({ job_no: j.job_no, exporter: j.exporter, relevant_date: j.createdAt })),
                pendingOperations: opsPendingJobs.map(j => ({ job_no: j.job_no, exporter: j.exporter, relevant_date: j.createdAt })),
                completedJobs: completedJobs.map(j => ({ job_no: j.job_no, exporter: j.exporter, relevant_date: j.updatedAt })),
                billingPending: billingPendingJobs.map(j => ({ job_no: j.job_no, exporter: j.exporter, relevant_date: j.createdAt })),
                leoPending: leoPendingJobs.map(j => ({ job_no: j.job_no, exporter: j.exporter, relevant_date: j.createdAt })),
                ffJobs: ffPendingJobs.map(j => ({ job_no: j.job_no, exporter: j.exporter, relevant_date: j.createdAt })),
            },
            trends: {
                jobs_trend: jobsTrend,
                completed_trend: completedTrend
            }
        };

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Export Analytics Overview Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.get("/api/export-analytics/pulse", async (req, res) => {
    try {
        const { exporter } = req.query;
        const filter = {};
        if (!filter.$and) filter.$and = [];

        // Fetch user restrictions
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

        if (exporter) {
            filter.$and.push({ exporter: { $regex: exporter, $options: "i" } });
        }

        const baseFilter = { ...filter, isGeneralJob: { $ne: true } };
        if (baseFilter.$and && baseFilter.$and.length === 0) delete baseFilter.$and;

        // 1. Total Pending Jobs (Matches 'Pending' tab in Jobs module)
        const totalPendingJobs = await ExJobModel.countDocuments({
            ...baseFilter,
            job_no: { $not: /^FF\//i },
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

        // 2. Handover Pending (Matches 'Handover Pending' tab in Jobs)
        const handoverPendingCount = await ExJobModel.countDocuments({
            ...baseFilter,
            job_no: { $not: /^FF\//i },
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

        // 3. Billing Pending (Matches 'Billing Pending' tab in Billing Module)
        const billingPendingCount = await ExJobModel.countDocuments({
            ...filter, // Use filter instead of baseFilter to include General Jobs
            send_for_billing: true,
            $or: [
                { "operations.statusDetails.billingDocsSentDt": { $exists: false } },
                { "operations.statusDetails.billingDocsSentDt": null },
                { "operations.statusDetails.billingDocsSentDt": "" },
                { "operations.statusDetails": { $size: 0 } }
            ]
        });

        // 4. Ops Pending (Matches 'Pending' tab in Ops module)
        const opsPendingCount = await ExJobModel.countDocuments({
            ...baseFilter,
            job_no: { $not: /^FF\//i },
            sb_no: { $exists: true, $nin: [null, ""] },
            $and: [
                {
                    $or: [
                        { status: { $regex: "^pending$", $options: "i" } },
                        { status: { $exists: false } },
                        { status: null },
                        { status: "" },
                    ]
                },
                { detailedStatus: { $ne: "Billing Done" } }
            ],
            $or: [
                // For FCL: Pending if Rail/Road reach date is missing
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
                // For Air/LCL: Pending if Handover date is missing
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

        // 5. Jobs Created Today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const createdTodayCount = await ExJobModel.countDocuments({
            ...baseFilter,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        const summary = {
            totalPending: totalPendingJobs,
            handover: handoverPendingCount,
            billing: billingPendingCount,
            ops: opsPendingCount,
            createdToday: createdTodayCount
        };

        res.status(200).json({ success: true, summary });
    } catch (error) {
        console.error("Export Pulse Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

export default router;
