import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// GET /api/operation-jobs - List operation module jobs
router.get("/api/operation-jobs/:status?", async (req, res) => {
    try {
        const {
            status,
            page = 1,
            limit = 10,
            search = "",
            exporter = "",
            ieCode = "",
            country = "",
            consignmentType = "",
            branch = "",
            year = "",
            customHouse = "",
            jobOwner = "",
            detailedStatus = "",
            month = "",
            pendingQueries = false,
            goods_stuffed_at = "",
        } = { ...req.params, ...req.query };

        const ClientQueryModel = (await import("../../model/export/ClientQueryModel.mjs")).default;
        const openClientQueryJobs = await ClientQueryModel.find({ status: "open" }).distinct("job_no");

        // Normalize status to lowercase, fallback to "pending"
        const normalizedStatus = (status || "pending").toLowerCase();

        const filter = {};
        if (!filter.$and) filter.$and = [];

        // 1. Fetch user restrictions
        const requesterUsername = req.headers["username"] || req.headers["x-username"];
        if (requesterUsername) {
            const requester = await UserModel.findOne({ username: requesterUsername });
            if (requester && requester.role !== "Admin") {
                let branchRestrictions = requester.selected_branches || [];
                
                // Resilience: Map full branch names to codes if necessary
                const BRANCH_MAP = { "AHMEDABAD": "AMD", "BARODA": "BRD", "GANDHIDHAM": "GIM", "COCHIN": "COK", "HAZIRA": "HAZ" };
                branchRestrictions = branchRestrictions.map(b => BRANCH_MAP[b.toUpperCase()] || b);

                // Always apply branch restriction for non-admins
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
            } else if (!requester && requesterUsername !== "Admin") {
                 // If a username is provided but user doesn't exist, and it's not a generic Admin check, restrict everything
                 filter.$and.push({ _id: null });
            }
        } else {
             // If no requester username is provided, restrict everything for safety
             // (Assuming all dashboard requests must be authenticated)
             filter.$and.push({ _id: null });
        }

        // --- MANDATORY BASE CONDITIONS FOR OPERATION MODULE ---
        // 1. Exclude General Jobs from Operation Module
        filter.$and.push({ isGeneralJob: { $ne: true } });

        // EXCLUDE Freight Forwarding Jobs (FF) from Operation Module
        filter.$and.push({ job_no: { $not: /^FF/i } });



        // 2. Handle main document status
        if (normalizedStatus === "cancelled") {
            filter.$and.push({
                $or: [
                    { status: { $regex: "^cancelled$", $options: "i" } },
                    { isJobCanceled: true }
                ]
            });
        } else if (normalizedStatus === "completed") {
            filter.$and.push({
                $and: [
                    // Exclude Cancelled
                    { status: { $regex: "^(?!cancelled$).*", $options: "i" } },
                    { isJobCanceled: { $ne: true } },
                    // Require actual completion
                    {
                        $or: [
                            { status: { $regex: "^completed$", $options: "i" } },
                            { detailedStatus: "Billing Done" }
                        ]
                    }
                ]
            });
        } else if (normalizedStatus === "all") {
            // Exclude cancelled jobs
            filter.$and.push({
                status: { $regex: "^(?!cancelled$).*", $options: "i" },
                isJobCanceled: { $ne: true }
            });
        } else {
            // Default to pending for 'pending' and 'billing ready'
            filter.$and.push({
                $or: [
                    { status: { $regex: "^pending$", $options: "i" } },
                    { status: { $exists: false } },
                    { status: null },
                    { status: "" }
                ]
            });
        }

        // 2. sb_no must exist
        filter.$and.push({
            sb_no: { $exists: true, $nin: [null, ""] }
        });



        // 3. Status-specific additional Conditions
        if (normalizedStatus === "billing ready") {
            // For "Billing Ready", the job must be pending, BUT it must have BOTH
            // handoverForwardingNoteDate AND handoverImageUpload present.
            // Also, it should NOT have billingDocsSentDt.
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
        } else if (normalizedStatus === "pending") {
            const selfPendingCondition = {
                $or: [
                    // For FCL: Pending if any of the 4 milestones is missing
                    {
                        $and: [
                            { consignmentType: { $ne: "LCL" } },
                            { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                            {
                                $or: [
                                    { "operations.statusDetails.leoDate": { $in: [null, ""] } },
                                    { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
                                    { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $in: [null, ""] } },
                                    { "operations.statusDetails.railOutReachedDate": { $in: [null, ""] } },
                                    { "operations.statusDetails": { $size: 0 } }
                                ]
                            }
                        ]
                    },
                    // For Air/LCL: Pending if LEO or Handover date is missing
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
                                    { "operations.statusDetails.leoDate": { $in: [null, ""] } },
                                    { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
                                    { "operations.statusDetails": { $size: 0 } }
                                ]
                            }
                        ]
                    }
                ]
            };
            filter.$and.push(selfPendingCondition);
            filter.$and.push({
                $or: [
                    { "operations.statusDetails.billingDocsSentDt": { $in: [null, ""] } },
                    { "operations.statusDetails.billing_details.agency_bill_date": { $in: [null, ""] } },
                    { "operations.statusDetails.billing_details.agency_bill_no": { $in: [null, ""] } },
                    { "operations.statusDetails.billing_details.reimbursement_bill_date": { $in: [null, ""] } },
                    { "operations.statusDetails.billing_details.reimbursement_bill_no": { $in: [null, ""] } },
                    { "operations.statusDetails": { $size: 0 } }
                ]
            });
        } else if (normalizedStatus === "booking pending") {
            filter.$and.push({
                goods_stuffed_at: "DOCK",
                consignmentType: "FCL",
                $or: [
                    { "operations.statusDetails.leoDate": { $exists: false } },
                    { "operations.statusDetails.leoDate": null },
                    { "operations.statusDetails.leoDate": "" },
                    { "operations.statusDetails": { $size: 0 } }
                ]
            });
        } else if (normalizedStatus === "handover pending") {
            filter.$and.push({
                "operations.statusDetails.leoDate": { $type: "string", $ne: "" },
                $or: [
                    { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
                    { "operations.statusDetails": { $size: 0 } }
                ]
            });
        } else if (normalizedStatus === "billing pending" || normalizedStatus === "op completed") {

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
        } else if (normalizedStatus === "club-jobs") {
             filter.$and.push({
                 $or: [
                     { is_club_job_parent: true },
                     { parent_club_job: { $exists: true, $ne: null, $ne: "" } }
                 ]
             });
        } else if (normalizedStatus === "cancelled") {
            // Cancelled jobs shouldn't filter out anything specific by default, 
            // but we might want to exclude billed ones if desired. Usually cancelled just means status = cancelled.
        }
        // --------------------------------------------------------

        if (jobOwner) filter.$and.push({ job_owner: { $regex: jobOwner, $options: "i" } });

        if (detailedStatus) {
            const statusArray = Array.isArray(detailedStatus) ? detailedStatus : [detailedStatus];

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

        }

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
                    { awb_bl_no: { $regex: escapedSearch, $options: "i" } },
                    { custom_house: { $regex: escapedSearch, $options: "i" } },
                    { booking_no: { $regex: escapedSearch, $options: "i" } },
                    { "invoices.invoiceNumber": { $regex: escapedSearch, $options: "i" } },
                    { "invoices.invoiceNo": { $regex: escapedSearch, $options: "i" } },
                    { "containers.containerNo": { $regex: escapedSearch, $options: "i" } },
                    { port_of_discharge: { $regex: escapedSearch, $options: "i" } },
                    { port_of_loading: { $regex: escapedSearch, $options: "i" } },
                    { destination_port: { $regex: escapedSearch, $options: "i" } }
                ],
            });
        }



        if (ieCode) {
            const ieCodeArray = ieCode.split(",").map(c => c.trim()).filter(Boolean);
            if (ieCodeArray.length > 0) {
                filter.$and.push({ ieCode: { $in: ieCodeArray } });
            }
        }
        if (exporter) filter.$and.push({ exporter: { $regex: exporter, $options: "i" } });
        if (country) filter.$and.push({ destination_country: { $regex: country, $options: "i" } });
        if (consignmentType) filter.$and.push({ consignmentType: consignmentType });
        if (branch) {
            const branchArray = branch.split(",").map(b => b.trim().toUpperCase()).filter(Boolean);
            if (branchArray.length > 0) {
                filter.$and.push({ branch_code: { $in: branchArray } });
            }
        }
        if (year && year !== "all") filter.$and.push({ year: year });
        if (customHouse) filter.$and.push({ custom_house: { $regex: customHouse, $options: "i" } });
        if (goods_stuffed_at) filter.$and.push({ goods_stuffed_at: goods_stuffed_at });

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

        // Find all job numbers matching the current tab and filters (excluding pendingQueries filter)
        const matchingJobsForCount = await ExportJobModel.find(filter).select("job_no").lean();
        const jobNos = matchingJobsForCount.map(j => j.job_no).filter(Boolean);

        const QueryModel = (await import("../../model/export/QueryModel.mjs")).default;
        const jobsWithOpenQueries = await QueryModel.find({
            job_no: { $in: jobNos },
            status: "open",
            targetModule: "export-operation"
        }).distinct("job_no");

        const pendingQueriesCount = jobsWithOpenQueries.length;

        // Apply pendingQueries filter if active
        if (pendingQueries === "true" || pendingQueries === true) {
            if (!filter.$and) filter.$and = [];
            filter.$and.push({ job_no: { $in: jobsWithOpenQueries } });
        }

        // Ensure array is removed if empty
        if (filter.$and && filter.$and.length === 0) {
            delete filter.$and;
        }

        const skip = (page - 1) * limit;

        const { sortKey, sortOrder } = req.query;
        const sort = {};
        if (sortKey && sortKey !== "null" && sortKey !== "undefined" && sortKey !== "") {
            sort[sortKey] = sortOrder === "asc" ? 1 : -1;
        } else {
            sort.createdAt = -1;
        }


        const selectProjection = {
            job_no: 1, docClicks: 1, custom_house: 1, job_date: 1, consignmentType: 1, job_owner: 1,
            exporter: 1, exporter_ref_no: 1, exporter_branch_name: 1, "consignees.consignee_name": 1, "buyerThirdPartyInfo.buyer.name": 1,
            ieCode: 1, panNo: 1, gstin: 1, adCode: 1,
            egm_no: 1, egm_date: 1,
            "invoices.invoiceNumber": 1, "invoices.invoiceDate": 1, "invoices.termsOfInvoice": 1,
            "invoices.currency": 1, "invoices.invoiceValue": 1, "invoices.consigneeName": 1,
            "invoices.invoice_no": 1, "invoices.invoice_date": 1, "invoices.invValue": 1,
            "invoices.products.drawbackDetails": 1,
            sb_no: 1, sb_date: 1, destination_port: 1, destination_country: 1, port_of_discharge: 1,
            discharge_country: 1, total_no_of_pkgs: 1,
            package_unit: 1, gross_weight_kg: 1, net_weight_kg: 1, shipping_line_airline: 1,
            detailedStatus: 1, status: 1, statusDetails: 1,
            sb_or_seal_changed_notif: 1, sb_or_seal_changed_details: 1,
            "eSanchitDocuments.fileUrl": 1, "eSanchitDocuments.documentType": 1, "eSanchitDocuments.icegateFilename": 1,
            isLocked: 1, operational_lock: 1, branch_code: 1, transportMode: 1, movement_type: 1, port_of_loading: 1,
            "operations.statusDetails.containerPlacementDate": 1, "operations.statusDetails.handoverForwardingNoteDate": 1,
            "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": 1,
            "operations.statusDetails.railOutReachedDate": 1, "operations.statusDetails.leoDate": 1,
            "operations.statusDetails.railRoad": 1,
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
            "operations.statusDetails.handoverImageUpload": 1,
            "operations.statusDetails.billingDocsSentUpload": 1,
            "operations.statusDetails.billingDocsSentDt": 1,
            "operations.statusDetails.billing_details": 1,
            "operations.statusDetails.status": 1,
            "operations.statusDetails.clpUpload": 1,
            "operations.statusDetails.completionCopyUpload": 1,
            "operations.statusDetails.movementCopyUpload": 1,
            "operations.statusDetails.shippingInstructionsUpload": 1,
            "operations.statusDetails.form13CopyUpload": 1,
            "operations.statusDetails.assessmentCopy": 1,
            "eSanchitDocuments.icegateFileName": 1,
            "containers.containerNo": 1, "containers.seal_no": 1, "containers.containerType": 1,
            booking_copy: 1,
            otherInfo: 1, annexC1Details: 1,
            total_ar_amount: 1, outstanding_balance: 1, cha: 1,
            lockedBy: 1, lockedAt: 1,
            isGeneralJob: 1,
            is_club_job_parent: 1,
            parent_club_job: 1,
            clubbed_jobs: 1,
            tally_club_ref_no: 1,
            vgm_done: 1,
            vgm_date: 1,
            form13_done: 1,
            form13_date: 1,
            shipping_bill_done: 1,
            shipping_bill_done_date: 1,
            freight_done: 1,
            freight_enquiry_id: 1,
            booking_no: 1,
            esanchit_completed_date_time: 1
        };

        let finalJobs = [];
        let finalTotalCount = 0;

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const aggPipeline = [
                { $match: filter },
                {
                    $addFields: {
                        hasOpenClientQuery: { $in: ["$job_no", openClientQueryJobs] },
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
                { $sort: { hasOpenClientQuery: -1, _searchPriority: 1, ...sort } },
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
                        hasOpenClientQuery: { $in: ["$job_no", openClientQueryJobs] }
                    }
                },
                { $sort: { hasOpenClientQuery: -1, ...sort } },
                { $project: selectProjection }
            ];
            const [jobsResult, countResult] = await Promise.all([
                ExportJobModel.aggregate([
                    ...aggPipeline,
                    { $skip: skip },
                    { $limit: parseInt(limit) }
                ]),
                ExportJobModel.countDocuments(filter),
            ]);
            finalJobs = jobsResult;
            finalTotalCount = countResult;
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

                if (normalizedStatus === "club-jobs") {
                    const finalParents = [];
                    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(pid => {
                        if (groups[pid].parent) {
                            groups[pid].parent.subRows = groups[pid].children.sort((a, b) => String(a.job_no || "").localeCompare(String(b.job_no || "")));
                            finalParents.push(groups[pid].parent);
                        }
                    });
                    finalJobs = finalParents;
                    finalTotalCount = finalParents.length;
                } else {
                    const newJobs = [];
                    const processedParents = new Set();
                    finalJobs.forEach(job => {
                        const pid = job.is_club_job_parent ? job.job_no : job.parent_club_job;
                        if (pid) {
                            if (!processedParents.has(pid)) {
                                const parentGroup = groups[pid];
                                if (parentGroup && parentGroup.parent) {
                                    const parentJob = { ...parentGroup.parent };
                                    parentJob.subRows = parentGroup.children.sort((a, b) => String(a.job_no || "").localeCompare(String(b.job_no || "")));
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
        console.error("Error fetching operation jobs:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching operation jobs",
            error: error.message,
        });
    }
});

// GET /api/operation-jobs-filters - Get dynamic filter values based on assigned exporters
router.get("/api/operation-jobs-filters", async (req, res) => {
    try {
        const { ieCode = "" } = req.query;

        const filter = {};
        if (!filter.$and) filter.$and = [];

        filter.$and.push({ isGeneralJob: { $ne: true } });
        filter.$and.push({ job_no: { $not: /^FF/i } });

        if (ieCode) {
            const ieCodeArray = ieCode.split(",").map(c => c.trim()).filter(Boolean);
            if (ieCodeArray.length > 0) {
                filter.$and.push({ ieCode: { $in: ieCodeArray } });
            }
        }

        // Run aggregation to get distinct values
        const result = await ExportJobModel.aggregate([
            { $match: filter },
            {
                $facet: {
                    branches: [
                        { $match: { branch_code: { $ne: null, $ne: "" } } },
                        { $group: { _id: "$branch_code" } }
                    ],
                    customHouses: [
                        { $match: { custom_house: { $ne: null, $ne: "" } } },
                        { $group: { _id: "$custom_house" } }
                    ],
                    consignmentTypes: [
                        { $match: { consignmentType: { $ne: null, $ne: "" } } },
                        { $group: { _id: "$consignmentType" } }
                    ],
                    goodsStuffedAt: [
                        { $match: { goods_stuffed_at: { $ne: null, $ne: "" } } },
                        { $group: { _id: "$goods_stuffed_at" } }
                    ],
                    years: [
                        { $match: { year: { $ne: null, $ne: "" } } },
                        { $group: { _id: "$year" } }
                    ],
                    exporters: [
                        { $match: { ieCode: { $ne: null, $ne: "" } } },
                        { $group: { _id: "$ieCode", name: { $first: "$exporter" } } }
                    ],
                    detailedStatuses: [
                        { $unwind: { path: "$detailedStatus", preserveNullAndEmptyArrays: true } },
                        { $match: { detailedStatus: { $ne: null, $ne: "" } } },
                        { $group: { _id: "$detailedStatus" } }
                    ],
                    months: [
                        {
                            $project: {
                                monthVal: {
                                    $cond: {
                                        if: {
                                            $and: [
                                                { $ne: ["$job_date", null] },
                                                { $ne: ["$job_date", ""] },
                                                { $regexMatch: { input: { $ifNull: ["$job_date", ""] }, regex: "^\\d{2}-\\d{2}-\\d{4}$" } }
                                            ]
                                        },
                                        then: {
                                            $month: {
                                                $dateFromString: {
                                                    dateString: "$job_date",
                                                    format: "%d-%m-%Y"
                                                }
                                            }
                                        },
                                        else: { $month: "$createdAt" }
                                    }
                                }
                            }
                        },
                        { $match: { monthVal: { $ne: null } } },
                        { $group: { _id: "$monthVal" } }
                    ]
                }
            }
        ]);

        const facets = result[0] || {};
        res.json({
            success: true,
            data: {
                branches: (facets.branches || []).map(b => b._id).filter(Boolean),
                customHouses: (facets.customHouses || []).map(ch => ch._id).filter(Boolean),
                consignmentTypes: (facets.consignmentTypes || []).map(ct => ct._id).filter(Boolean),
                goodsStuffedAt: (facets.goodsStuffedAt || []).map(gs => gs._id).filter(Boolean),
                years: (facets.years || []).map(y => y._id).filter(Boolean),
                exporters: (facets.exporters || []).map(exp => ({ ieCode: exp._id, name: exp.name })).filter(e => e.ieCode),
                detailedStatuses: (facets.detailedStatuses || []).map(ds => ds._id).filter(Boolean),
                months: (facets.months || []).map(m => m._id).filter(Boolean)
            }
        });
    } catch (error) {
        console.error("Error fetching operation jobs filter options:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching filter options",
            error: error.message
        });
    }
});

export default router;
