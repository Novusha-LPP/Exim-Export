import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/charges-jobs - List charges module jobs (only those with handover date)
router.get("/api/charges-jobs/:status?", async (req, res) => {
    try {
        const {
            status,
            page = 1,
            limit = 10,
            search = "",
            exporter = "",
            country = "",
            consignmentType = "",
            branch = "",
            year = "",
            customHouse = "",
            jobOwner = "",
            detailedStatus = "",
            month = "",
            pendingQueries = false,
        } = { ...req.params, ...req.query };

        const ClientQueryModel = (await import("../../model/export/ClientQueryModel.mjs")).default;
        const openClientQueryJobs = await ClientQueryModel.find({ status: "open" }).distinct("job_no");

        const normalizedStatus = (status || "all").toLowerCase();

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

                const portRestrictions = requester.selected_ports || [];
                const icdRestrictions = requester.selected_icd_codes || [];
                const combinedRestrictions = [...new Set([...portRestrictions, ...icdRestrictions])];

                let combinedRegexStr = "";
                if (combinedRestrictions.length > 0) {
                    const finalRestrictions = [];
                    combinedRestrictions.forEach(res => {
                        finalRestrictions.push(res);
                        if (res.includes(" - ")) {
                            finalRestrictions.push(res.split(" - ")[0].trim());
                        }
                    });

                    combinedRegexStr = finalRestrictions.map(r =>
                        `^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
                    ).join('|');
                }

                if (branchRestrictions.length > 0 || combinedRegexStr) {
                    const restrictions = [];
                    if (branchRestrictions.length > 0) {
                        const branchRegexStr = branchRestrictions.map(r => String(r).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                        const fallbackRegex = `^(${branchRegexStr})(/|$)`;
                        restrictions.push({
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
                    }
                    if (combinedRegexStr) {
                        restrictions.push({
                            $or: [
                                { custom_house: { $regex: combinedRegexStr, $options: "i" } },
                                { port_of_loading: { $regex: combinedRegexStr, $options: "i" } }
                            ]
                        });
                    }

                    // Bypass restrictions for FF and GEN jobs
                    filter.$and.push({
                        $or: [
                            { job_no: { $regex: "^(FF|GEN)", $options: "i" } },
                            { $and: restrictions }
                        ]
                    });
                }
            } else if (!requester && requesterUsername !== "Admin") {
                 filter.$and.push({ _id: null });
            }
        } else {
             filter.$and.push({ _id: null });
        }

        // --- MANDATORY BASE CONDITION FOR CHARGES MODULE ---
        // Must have completed operational milestones based on job type, UNLESS it's a general job OR a parent club job
        filter.$and.push({
            $or: [
                { isGeneralJob: true },
                { is_club_job_parent: true },
                {
                    $or: [
                        // For Air/LCL jobs: require Handover Date and LEO Date
                        {
                            $and: [
                                {
                                    $or: [
                                        { consignmentType: "LCL" },
                                        { job_no: { $regex: "/AIR/", $options: "i" } }
                                    ]
                                },
                                { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } },
                                { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } }
                            ]
                        },
                        // For FCL jobs: require all 4 milestones (Handover, LEO, Rail Out, Rail Reached)
                        {
                            $and: [
                                { consignmentType: { $ne: "LCL" } },
                                { job_no: { $not: { $regex: "/AIR/", $options: "i" } } },
                                { "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] } },
                                { "operations.statusDetails.leoDate": { $exists: true, $nin: [null, ""] } },
                                { "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": { $exists: true, $nin: [null, ""] } },
                                { "operations.statusDetails.railOutReachedDate": { $exists: true, $nin: [null, ""] } }
                            ]
                        }
                    ]
                }
            ]
        });

        // Globally exclude child club jobs from all tabs unless a search query is active
        if (!search) {
            filter.$and.push({
                $or: [
                    { parent_club_job: { $exists: false } },
                    { parent_club_job: null },
                    { parent_club_job: "" }
                ]
            });
        }

        // Apply Tab specific status filtering if not "all"
        if (normalizedStatus === "general-jobs" || normalizedStatus === "general jobs") {
            filter.$and.push({ isGeneralJob: true });
            filter.$and.push({ job_no: { $regex: "^GEN/", $options: "i" } });
        } else if (normalizedStatus === "freight-forwarding" || normalizedStatus === "freight forwarding") {
            filter.$and.push({ job_no: { $regex: "^FF", $options: "i" } });
        } else if (normalizedStatus !== "all") {
            // Pending/Completed Tabs: Exclude both GEN and FF jobs
            filter.$and.push({ job_no: { $regex: "^(?!GEN|FF).*", $options: "i" } });
            filter.$and.push({ isGeneralJob: { $ne: true } });
        }

        // Exclude Cancelled by default unless specifically asked
        if (normalizedStatus !== "cancelled") {
            filter.$and.push({
                status: { $regex: "^(?!cancelled$).*", $options: "i" },
                isJobCanceled: { $ne: true }
            });
        } else if (normalizedStatus === "cancelled") {
             filter.$and.push({
                $or: [
                    { status: { $regex: "^cancelled$", $options: "i" } },
                    { isJobCanceled: true }
                ]
            });
        }

        // Apply Tab specific status filtering if not "all"
        if (normalizedStatus === "pending") {
             filter.$and.push({
                status: { $regex: "^pending$", $options: "i" },
                send_for_billing: { $ne: true },
                $and: [
                    {
                        $or: [
                            { "operations.statusDetails.billingDocsSentDt": { $in: [null, ""] } },
                            { "operations.statusDetails": { $size: 0 } }
                        ]
                    },
                    {
                        $or: [
                            { "operations.statusDetails.billing_details.agency_bill_date": { $in: [null, ""] } },
                            { "operations.statusDetails.billing_details.agency_bill_no": { $in: [null, ""] } },
                            { "operations.statusDetails": { $size: 0 } }
                        ]
                    },
                    {
                        $or: [
                            { "operations.statusDetails.billing_details.reimbursement_bill_date": { $in: [null, ""] } },
                            { "operations.statusDetails.billing_details.reimbursement_bill_no": { $in: [null, ""] } },
                            { "operations.statusDetails": { $size: 0 } }
                        ]
                    }
                ]
            });
        } else if (normalizedStatus === "completed") {
             filter.$and.push({
                $or: [
                    { status: { $regex: "^completed$", $options: "i" } },
                    { detailedStatus: "Billing Done" },
                    { "operations.statusDetails.billingDocsSentDt": { $exists: true, $nin: [null, ""] } },
                    {
                        $and: [
                            { "operations.statusDetails.billing_details.agency_bill_date": { $exists: true, $nin: [null, ""] } },
                            { "operations.statusDetails.billing_details.agency_bill_no": { $exists: true, $nin: [null, ""] } }
                        ]
                    },
                    {
                        $and: [
                            { "operations.statusDetails.billing_details.reimbursement_bill_date": { $exists: true, $nin: [null, ""] } },
                            { "operations.statusDetails.billing_details.reimbursement_bill_no": { $exists: true, $nin: [null, ""] } }
                        ]
                    }
                ]
            });
        }

        // --- SEARCH AND OTHER FILTERS ---
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
                ]
            });
        }



        if (year && year !== "all") filter.$and.push({ year });
        if (exporter) filter.$and.push({ exporter: { $regex: escapeRegex(exporter), $options: "i" } });
        if (country) filter.$and.push({ destination_country: { $regex: escapeRegex(country), $options: "i" } });
        if (consignmentType) filter.$and.push({ consignmentType });
        if (branch) filter.$and.push({ branch_code: branch });
        if (customHouse) filter.$and.push({ custom_house: { $regex: escapeRegex(customHouse), $options: "i" } });
        if (jobOwner) filter.$and.push({ job_owner: jobOwner });
        const rawDetailedStatus = req.query.detailedStatus || req.query["detailedStatus[]"];
        if (rawDetailedStatus) {
            let statusArray = Array.isArray(rawDetailedStatus) ? rawDetailedStatus : [rawDetailedStatus];
            if (typeof rawDetailedStatus === "string" && rawDetailedStatus.includes(",")) {
                statusArray = rawDetailedStatus.split(",");
            }
            statusArray = statusArray.map(s => String(s).trim()).filter(Boolean);
            if (statusArray.length > 0) {
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
        }
        
        if (month) {
            const [yearStr, monthStr] = month.split("-");
            const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
            const endDate = new Date(parseInt(yearStr), parseInt(monthStr), 0);
            filter.$and.push({
                $or: [
                    { sb_date: { $gte: startDate, $lte: endDate } },
                    { job_date: { $gte: startDate, $lte: endDate } }
                ]
            });
        }

        // Ensure array is removed if empty
        if (filter.$and && filter.$and.length === 0) {
            delete filter.$and;
        }

        // Find all job numbers matching the current tab and filters (excluding pendingQueries filter)
        const matchingJobsForCount = await ExportJobModel.find(filter).select("job_no").lean();
        const allJobNos = matchingJobsForCount.map(j => j.job_no).filter(Boolean);

        const QueryModel = (await import("../../model/export/QueryModel.mjs")).default;
        const jobsWithOpenQueries = await QueryModel.find({
            job_no: { $in: allJobNos },
            status: "open",
            targetModule: "export-charges"
        }).distinct("job_no");

        const pendingQueriesCount = jobsWithOpenQueries.length;

        // Apply pendingQueries filter if active
        if (pendingQueries === "true" || pendingQueries === true) {
            if (!filter.$and) filter.$and = [];
            filter.$and.push({ job_no: { $in: jobsWithOpenQueries } });
        }

        // Re-ensure array is removed if empty after modification
        if (filter.$and && filter.$and.length === 0) {
            delete filter.$and;
        }

        const skip = (page - 1) * limit;

        const selectProjection = {
            job_no: 1, docClicks: 1, custom_house: 1, job_date: 1, consignmentType: 1, job_owner: 1,
            send_for_billing: 1, send_for_billing_date: 1,
            exporter: 1, exporter_ref_no: 1, exporter_branch_name: 1,
            "consignees.consignee_name": 1, buyerThirdPartyInfo: 1, forwarder: 1,
            drawback_scroll_no: 1, drawback_scroll_date: 1, rosctl_scroll_no: 1, rosctl_scroll_date: 1,
            ieCode: 1, panNo: 1, gstin: 1, adCode: 1,
            egm_no: 1, egm_date: 1,
            "invoices.invoiceNumber": 1, "invoices.invoiceDate": 1, "invoices.termsOfInvoice": 1,
            "invoices.currency": 1, "invoices.invoiceValue": 1, "invoices.products.drawbackDetails": 1,
            sb_no: 1, sb_date: 1, destination_port: 1, destination_country: 1,
            port_of_discharge: 1, discharge_country: 1, port_of_loading: 1,
            detailedStatus: 1, status: 1, booking_no: 1,
            sb_or_seal_changed_notif: 1, sb_or_seal_changed_details: 1,
            total_no_of_pkgs: 1, package_unit: 1, gross_weight_kg: 1, net_weight_kg: 1,
            "operations.statusDetails.handoverForwardingNoteDate": 1,
            "operations.statusDetails.handoverConcorTharSanganaRailRoadDate": 1,
            "operations.statusDetails.railOutReachedDate": 1,
            "operations.statusDetails.leoDate": 1,
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
            "eSanchitDocuments.fileUrl": 1, "eSanchitDocuments.documentType": 1, "eSanchitDocuments.icegateFilename": 1, "eSanchitDocuments.icegateFileName": 1,
            "operations.transporterDetails": 1,
            booking_copy: 1,
            containers: 1,
            isLocked: 1, lockedBy: 1, lockedAt: 1,
            operational_lock: 1,
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
            freight_enquiry_id: 1
        };

        const { sortKey, sortOrder } = req.query;
        const sort = {};
        if (sortKey && sortKey !== "null" && sortKey !== "undefined" && sortKey !== "") {
            sort[sortKey] = sortOrder === "asc" ? 1 : -1;
        } else {
            sort.createdAt = -1;
        }

        const aggPipeline = [
            { $match: filter },
            { $sort: { ...sort } },
            { $project: selectProjection }
        ];

        let [jobs, totalCount] = await Promise.all([
            ExportJobModel.aggregate([
                ...aggPipeline,
                { $skip: skip },
                { $limit: parseInt(limit) }
            ]),
            ExportJobModel.countDocuments(filter)
        ]);

        if (jobs.length > 0) {
            const parentIds = [...new Set(jobs.map(j => j.is_club_job_parent ? j.job_no : j.parent_club_job))].filter(Boolean);
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

                const newJobs = [];
                const processedParents = new Set();
                jobs.forEach(job => {
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
                jobs = newJobs;
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                jobs,
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                pendingQueriesCount
            }
        });

    } catch (error) {
        console.error("Error in charges-jobs API:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

export default router;
