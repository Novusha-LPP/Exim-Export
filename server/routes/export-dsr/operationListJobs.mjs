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
            country = "",
            consignmentType = "",
            branch = "",
            year = "",
            customHouse = "",
            jobOwner = "",
            detailedStatus = "",
        } = { ...req.params, ...req.query };

        // Normalize status to lowercase, fallback to "pending"
        const normalizedStatus = (status || "pending").toLowerCase();

        const filter = {};
        if (!filter.$and) filter.$and = [];

        // 1. Fetch user restrictions
        const requesterUsername = req.headers["username"] || req.headers["x-username"];
        if (requesterUsername) {
            const requester = await UserModel.findOne({ username: requesterUsername });
            if (requester && requester.role !== "Admin") {
                if (requester.selected_branches && requester.selected_branches.length > 0) {
                    filter.$and.push({
                        branch_code: { $in: requester.selected_branches }
                    });
                }
                if (requester.selected_ports && requester.selected_ports.length > 0) {
                    filter.$and.push({
                        $or: [
                            { custom_house: { $in: requester.selected_ports } },
                            { port_of_loading: { $in: requester.selected_ports } }
                        ]
                    });
                }
            }
        }

        // --- MANDATORY BASE CONDITIONS FOR OPERATION MODULE ---
        // 1. Handle main document status
        if (normalizedStatus === "cancelled") {
            filter.$and.push({
                status: { $regex: "^cancelled$", $options: "i" }
            });
        } else {
            // Default to pending for 'pending' and 'billing ready'
            filter.$and.push({
                status: { $regex: "^pending$", $options: "i" }
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
                    { "operations.statusDetails.billingDocsSentDt": { $in: [null, ""] } }
                ]
            });
        } else if (normalizedStatus === "pending") {
            // For standard "Pending", exclude rows that have billingDocsSentDt.
            // We'll exclude them from standard pending if they have both handover details
            filter.$and.push({
                $and: [
                    { "operations.statusDetails.billingDocsSentDt": { $in: [null, ""] } },
                    {
                        $or: [
                            { "operations.statusDetails.handoverForwardingNoteDate": { $in: [null, ""] } },
                            { "operations.statusDetails.handoverImageUpload": { $exists: false } },
                            { "operations.statusDetails.handoverImageUpload": { $size: 0 } },
                        ]
                    }
                ]
            });
        } else if (normalizedStatus === "cancelled") {
            // Cancelled jobs shouldn't filter out anything specific by default, 
            // but we might want to exclude billed ones if desired. Usually cancelled just means status = cancelled.
        }
        // --------------------------------------------------------

        if (jobOwner) filter.$and.push({ job_owner: { $regex: jobOwner, $options: "i" } });
        if (detailedStatus) filter.$and.push({ detailedStatus: detailedStatus });

        if (search) {
            filter.$and.push({
                $or: [
                    { job_no: { $regex: search, $options: "i" } },
                    { exporter: { $regex: search, $options: "i" } },
                    { ieCode: { $regex: search, $options: "i" } },
                    { "consignees.consignee_name": { $regex: search, $options: "i" } },
                    { sb_no: { $regex: search, $options: "i" } },
                    { "invoices.invoiceNumber": { $regex: search, $options: "i" } },
                    { "containers.containerNo": { $regex: search, $options: "i" } },
                    { "containers.containerNo": { $regex: search, $options: "i" } }
                ],
            });
        }

        if (exporter) filter.$and.push({ exporter: { $regex: exporter, $options: "i" } });
        if (country) filter.$and.push({ destination_country: { $regex: country, $options: "i" } });
        if (consignmentType) filter.$and.push({ consignmentType: consignmentType });
        if (branch) filter.$and.push({ branch_code: { $regex: `^${branch}$`, $options: "i" } });
        if (year) filter.$and.push({ job_no: { $regex: `/${year}$`, $options: "i" } });
        if (customHouse) filter.$and.push({ custom_house: { $regex: customHouse, $options: "i" } });

        // Ensure array is removed if empty
        if (filter.$and && filter.$and.length === 0) {
            delete filter.$and;
        }

        const skip = (page - 1) * limit;

        const { sortKey, sortOrder } = req.query;
        const sort = {};
        if (sortKey) sort[sortKey] = sortOrder === "asc" ? 1 : -1;
        else sort.createdAt = -1;

        const selectProjection = {
            job_no: 1, custom_house: 1, job_date: 1, consignmentType: 1, job_owner: 1,
            exporter: 1, "consignees.consignee_name": 1, "buyerThirdPartyInfo.buyer.name": 1,
            ieCode: 1, panNo: 1, exporter_gstin: 1, adCode: 1,
            "invoices.invoiceNumber": 1, "invoices.invoiceDate": 1, "invoices.termsOfInvoice": 1,
            "invoices.currency": 1, "invoices.invoiceValue": 1, "invoices.consigneeName": 1,
            "invoices.invoice_no": 1, "invoices.invoice_date": 1, "invoices.invValue": 1,
            sb_no: 1, sb_date: 1, destination_port: 1, destination_country: 1, port_of_discharge: 1,
            discharge_country: 1, "containers.containerNo": 1, "containers.size": 1, total_no_of_pkgs: 1,
            package_unit: 1, gross_weight_kg: 1, net_weight_kg: 1, shipping_line_airline: 1,
            detailedStatus: 1, status: 1, statusDetails: 1,
            "eSanchitDocuments.fileUrl": 1, "eSanchitDocuments.documentType": 1, "eSanchitDocuments.icegateFilename": 1,
            isLocked: 1, branch_code: 1, transportMode: 1, movement_type: 1, port_of_loading: 1,
            "operations.bookingDetails.bookingNo": 1, "operations.bookingDetails.shippingLineName": 1,
            "operations.statusDetails.containerPlacementDate": 1, "operations.statusDetails.handoverForwardingNoteDate": 1,
            "operations.statusDetails.railOutReachedDate": 1, "operations.statusDetails.leoDate": 1,
            "operations.statusDetails.leoUpload": 1, "operations.statusDetails.stuffingSheetUpload": 1,
            "operations.statusDetails.stuffingPhotoUpload": 1, "operations.statusDetails.eGatePassUpload": 1,
            "operations.statusDetails.handoverImageUpload": 1, "operations.statusDetails.billingDocsSentUpload": 1,
            "operations.statusDetails.billingDocsSentDt": 1, "operations.statusDetails.status": 1,
            "operations.transporterDetails.images": 1, "operations.bookingDetails.images": 1,
            "containers.images": 1, "containers.weighmentImages": 1,
            "containers.containerNo": 1, lockedBy: 1, lockedAt: 1
        };

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
        console.error("Error fetching operation jobs:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching operation jobs",
            error: error.message,
        });
    }
});

export default router;
