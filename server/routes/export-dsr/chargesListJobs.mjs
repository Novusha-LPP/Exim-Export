import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

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

                // Always apply branch restriction for non-admins
                filter.$and.push({
                    branch_code: { $in: branchRestrictions }
                });

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
                 filter.$and.push({ _id: null });
            }
        } else {
             filter.$and.push({ _id: null });
        }

        // --- MANDATORY BASE CONDITION FOR CHARGES MODULE ---
        // Must have a handover date
        filter.$and.push({
            "operations.statusDetails.handoverForwardingNoteDate": { $exists: true, $nin: [null, ""] }
        });

        // Exclude Cancelled by default unless specifically asked
        if (normalizedStatus !== "cancelled") {
            filter.$and.push({
                status: { $regex: "^(?!cancelled$).*", $options: "i" },
                isJobCanceled: { $ne: true }
            });
        } else {
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
                $or: [
                    { "operations.statusDetails.billingDocsSentDt": { $in: [null, ""] } },
                    { "operations.statusDetails": { $size: 0 } }
                ]
            });
        } else if (normalizedStatus === "completed") {
             filter.$and.push({
                $or: [
                    { status: { $regex: "^completed$", $options: "i" } },
                    { detailedStatus: "Billing Done" },
                    { "operations.statusDetails.billingDocsSentDt": { $exists: true, $nin: [null, ""] } }
                ]
            });
        }

        // --- SEARCH AND OTHER FILTERS ---
        if (search) {
            filter.$and.push({
                $or: [
                    { job_no: { $regex: search, $options: "i" } },
                    { exporter: { $regex: search, $options: "i" } },
                    { ieCode: { $regex: search, $options: "i" } },
                    { sb_no: { $regex: search, $options: "i" } },
                    { custom_house: { $regex: search, $options: "i" } },
                ]
            });
        }

        if (pendingQueries === "true" || pendingQueries === true) {
            const QueryModel = (await import("../../model/export/QueryModel.mjs")).default;
            const openQueries = await QueryModel.find({ status: "open" }).select("job_no").lean();
            const openJobNos = [...new Set(openQueries.map(q => q.job_no))];
            filter.$and.push({ job_no: { $in: openJobNos } });
        }

        if (year && year !== "all") filter.$and.push({ year });
        if (exporter) filter.$and.push({ exporter: { $regex: exporter, $options: "i" } });
        if (country) filter.$and.push({ destination_country: { $regex: country, $options: "i" } });
        if (consignmentType) filter.$and.push({ consignmentType });
        if (branch) filter.$and.push({ branch_code: branch });
        if (customHouse) filter.$and.push({ custom_house: { $regex: customHouse, $options: "i" } });
        if (jobOwner) filter.$and.push({ job_owner: jobOwner });
        if (detailedStatus) {
            const statusArray = Array.isArray(detailedStatus) ? detailedStatus : [detailedStatus];
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

        const skip = (page - 1) * limit;

        const selectProjection = {
            job_no: 1, custom_house: 1, job_date: 1, consignmentType: 1, job_owner: 1,
            exporter: 1, exporter_ref_no: 1, exporter_branch_name: 1,
            "consignees.consignee_name": 1, "buyerThirdPartyInfo.buyer.name": 1,
            ieCode: 1, panNo: 1, exporter_gstin: 1, adCode: 1,
            "invoices.invoiceNumber": 1, "invoices.invoiceDate": 1, "invoices.termsOfInvoice": 1,
            "invoices.currency": 1, "invoices.invoiceValue": 1,
            sb_no: 1, sb_date: 1, destination_port: 1, destination_country: 1,
            port_of_discharge: 1, discharge_country: 1, port_of_loading: 1,
            detailedStatus: 1, status: 1, booking_no: 1,
            total_no_of_pkgs: 1, package_unit: 1, gross_weight_kg: 1, net_weight_kg: 1,
            "operations.statusDetails.handoverForwardingNoteDate": 1,
            "operations.statusDetails.billingDocsSentDt": 1,
            "operations.statusDetails.billingDocsSentUpload": 1,
            containers: 1,
            isLocked: 1, lockedBy: 1, lockedAt: 1,
            operational_lock: 1
        };

        const [jobs, totalCount] = await Promise.all([
            ExportJobModel.find(filter)
                .select(selectProjection)
                .sort({ job_date: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            ExportJobModel.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            data: {
                jobs,
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit)
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
