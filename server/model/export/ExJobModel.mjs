import mongoose from "mongoose";
import {
    CUSTOM_HOUSE_CODE_MAP,
    COUNTRY_CODE_MAP,
    PORT_CODE_MAP,
    STATE_CODE_MAP,
    MONTH_CODE_MAP,
} from "./constants/geoCodes.mjs";
import {
    buildImpexCubeExportPayload,
    buildExportJobFromImpexCubePayload,
    isImpexCubeExportPayload,
    buildImpexCubeExportGetDetailsPayload,
} from "./mappers/impexcubeExportMapper.mjs";
import {
    areDetailsSchema,
    deecSchema,
    epcgSchema,
    cessExpDutySchema,
    freightInsuranceChargesSchema,
    drawbackDetailsSchema,
    productDetailsSchema,
} from "./schemas/productSchemas.mjs";
import {
    invoiceSchema,
    buyerThirdPartySchema,
    apInvoiceSchema,
    arInvoiceSchema,
} from "./schemas/invoiceSchemas.mjs";
import {
    containerDetailsSchema,
    packingListSchema,
    stuffingDetailsSchema,
} from "./schemas/containerSchemas.mjs";
import {
    eSanchitDocumentSchema,
    chargeSchema,
    milestoneSchema,
    statusDetailsSchema,
    exportOperationSchema,
} from "./schemas/operationSchemas.mjs";

const { Schema, model } = mongoose;

// Main Export Job Schema
const exportJobSchema = new mongoose.Schema(
    {
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
        isBuyer: { type: Boolean },
        isGeneralJob: { type: Boolean, default: false },

        ////////////////////////////////////////////////// Excel sheet
        year: { type: String, trim: true },
        financial_year: { type: String, trim: true },
        jobNumber: { type: String, trim: true }, // unique index handled below with isGeneralJob
        job_sequence_no: { type: String, trim: true },
        custom_house: { type: String, trim: true },
        job_date: { type: String, trim: true },
        exporter: { type: String, trim: true },
        description: { type: String, trim: true },
        sb_no: { type: String, trim: true },
        consignmentType: {
            type: String, trim: true
        },
        shipping_line_airline: { type: String, trim: true },
        branchSrNo: { type: String, trim: true },
        adCode: { type: String, trim: true },
        bank_name: { type: String, trim: true },
        ieCode: { type: String, trim: true },
        branch_index: { type: String, trim: true },
        bank_index: { type: String, trim: true },
        exporter_ref_no: { type: String, trim: true },
        shipper: { type: String, trim: true },
        sb_type: { type: String, trim: true },
        transportMode: { type: String, trim: true },
        exporter_type: { type: String, trim: true },
        exporter_class: { type: String, trim: true },
        exporter_branch_name: { type: String, trim: true },
        cha_code: { type: String, trim: true },
        cha_branch_code: { type: String, trim: true },
        cha_license_number: { type: String, trim: true },
        senderId: { type: String, trim: true },
        gstn_type: { type: String, trim: true },
        epz_code: { type: String, trim: true },
        category_of_nfei_sb: { type: String, trim: true },

        // Exporter Additional Fields (Missing)
        branch_sno: { type: String, trim: true },
        regn_no: { type: String, trim: true },
        gstin: { type: String, trim: true },
        state: { type: String, trim: true },

        // Reference & Regulatory Fields (Missing)
        sb_date: { type: String, trim: true },
        rbi_app_no: { type: String, trim: true },
        gr_waived: { type: Boolean, default: false },
        gr_no: { type: String, trim: true },
        rbi_waiver_no: { type: String, trim: true },
        rbi_waiver_date: { type: String, trim: true },
        notify: { type: String, trim: true },

        // Commercial Fields (Missing)
        currency: { type: String, trim: true },

        // Enhanced Shipping Fields (Missing)
        discharge_port: { type: String, trim: true },
        discharge_country: { type: String, trim: true },
        destination_port: { type: String, trim: true },
        destination_country: { type: String, trim: true },
        egm_no: { type: String, trim: true },
        egm_date: { type: String, trim: true },
        sb_track_last_polled: { type: Date, default: null }, // Tracks last automatic SB Track API poll
        mbl_date: { type: String, trim: true },
        hbl_date: { type: String, trim: true },
        hbl_no: { type: String, trim: true },
        mbl_no: { type: String, trim: true },
        hawb_no: { type: String, trim: true },
        mawb_no: { type: String, trim: true },
        transhipper_code: { type: String, trim: true },
        pre_carriage_by: { type: String, trim: true },
        gateway_port: { type: String, trim: true },
        state_of_origin: { type: String, trim: true },

        sailing_date: { type: String, trim: true },
        voyage_no: { type: String, trim: true },
        vessel_name: { type: String, trim: true },
        flight_no: { type: String, trim: true },
        flight_date: { type: String, trim: true },
        nature_of_cargo: { type: String, trim: true },
        booking_no: { type: String, trim: true },
        booking_date: { type: String, trim: true },
        forwarder: { type: String, trim: true },
        pickup_loc: { type: String, trim: true },
        drop_loc: { type: String, trim: true },
        cut_off_date: { type: String, trim: true },
        booking_copy: [String],
        leo_date: { type: String, trim: true },
        gate_in: { type: String, trim: true },
        loose_pkgs: { type: String, trim: true },
        no_of_containers: { type: String, trim: true },
        marks_nos: { type: String, trim: true },
        goods_stuffed_at: { type: String, trim: true },
        stuffing_seal_type: { type: String, trim: true },
        sample_accompanied: { type: Boolean, default: false },
        hand_carry: { type: String, trim: true },
        factory_address: { type: String, trim: true },
        warehouse_code: { type: String, trim: true },

        total_no_of_pkgs: { type: String, trim: true },
        package_unit: { type: String, trim: true },
        gross_weight_kg: { type: String, trim: true },
        gross_weight_unit: { type: String, trim: true },
        net_weight_kg: { type: String, trim: true },
        net_weight_unit: { type: String, trim: true },
        volume_cbm: { type: String, trim: true },
        volume_unit: { type: String, trim: true },
        chargeable_weight: { type: String, trim: true },
        chargeable_weight_unit: { type: String, trim: true },

        consol_no: { type: String, trim: true },
        consol_date: { type: String, trim: true },
        eta_date: { type: String, trim: true },
        arrival_date: { type: String, trim: true },
        final_delivery_date: { type: String, trim: true },
        shipped_on_board_date: { type: String, trim: true },
        delay_reason: { type: String, trim: true },
        booking_thru: { type: String, trim: true },
        sales_person: { type: String, trim: true },
        freight_type: { type: String, trim: true },
        cargo_type: { type: String, trim: true },
        movement_type: { type: String, trim: true },
        volume_weight: { type: String, trim: true },
        shipment_terms: { type: String, trim: true },
        container_qty_type: { type: String, trim: true },

        // Boolean Control Fields (Missing)
        buyer_other_than_consignee: { type: Boolean, default: false },

        // products: { type: Array, default: [] },
        charges: [chargeSchema],
        documents: { type: Object, default: {} },

        status: { type: String, trim: true },
        // --- DSC Signing Status ---
        signingStatus: {
            type: String,
            enum: ["Pending", "ReadyToSign", "Signed", "Failed"],
            default: "Pending",
        },
        signedFilePath: { type: String, trim: true }, // Path to .sb file or .sig file in S3/Local
        signedDate: { type: Date },
        detailedStatus: { type: String, default: "" },
        sb_or_seal_changed_notif: { type: Boolean, default: false },
        sb_or_seal_changed_details: { type: mongoose.Schema.Types.Mixed, default: {} },
        vgm_done: { type: Boolean, default: false },
        vgm_date: { type: String, trim: true },
        form13_done: { type: Boolean, default: false },
        form13_date: { type: String, trim: true },
        shipping_bill_done: { type: Boolean, default: false },
        shipping_bill_done_date: { type: String, trim: true },
        freight_done: { type: Boolean, default: false },
        freight_enquiry_id: { type: String, trim: true },

        ////////////////////////////////////////////////// Exporter Information
        exporter_address: { type: String, trim: true },
        exporter_city: { type: String, trim: true },
        exporter_state: { type: String, trim: true },
        exporter_country: { type: String, trim: true, default: "India" },
        exporter_pincode: { type: String, trim: true },
        exporter_phone: { type: String, trim: true },
        exporter_email: { type: String, trim: true },
        exporter_fax: { type: String, trim: true },
        exporter_website: { type: String, trim: true },
        branch_code: { type: String, trim: true },

        // Regulatory Information
        ieCode: { type: String, trim: true }, // Import Export Code
        exporter_pan: { type: String, trim: true },
        exporter_tan: { type: String, trim: true },
        ad_code: { type: String, trim: true }, // Authorized Dealer Code

        // Banking Information - Removed duplicate bank_name
        bank_account_number: { type: String, trim: true },
        bank_ifsc_code: { type: String, trim: true },

        ////////////////////////////////////////////////// Consignee/Importer Information
        consignees: [
            {
                consignee_name: { type: String, trim: true },
                consignee_address: { type: String, trim: true },
                consignee_country: { type: String, trim: true },
            },
        ],

        ////////////////////////////////////////////////// Shipment Details
        port_of_loading: { type: String, trim: true },
        port_of_discharge: { type: String, trim: true },
        final_destination: { type: String, trim: true },
        place_of_receipt: { type: String, trim: true },
        place_of_delivery: { type: String, trim: true },

        // Invoice Details
        exchange_rate: { type: String, trim: true },

        ////////////////////////////////////////////////// Containers Information
        operations: [exportOperationSchema], // ✅ CORRECT - works directly

        ////////////////////////////////////////////////// Charges and Financial
        remarks: { type: String, trim: true },

        // Job Assignment
        job_owner: { type: String, trim: true },

        job_no: {
            type: String,
            uppercase: true,
        },

        // Multiple Invoices
        invoices: [invoiceSchema],

        // Container Details
        containers: [containerDetailsSchema],
        packingList: [packingListSchema],
        stuffingDetails: [stuffingDetailsSchema],

        // Buyer and Third Party Information
        buyerThirdPartyInfo: buyerThirdPartySchema,

        // ARE Details

        // Other Information
        otherInfo: {
            exportContractNo: String,
            exportContractDate: String,
            natureOfPayment: {
                type: String,
                enum: [
                    "Not Applicable",
                    "Letter Of Credit",
                    "Delivery against Acceptance",
                    "Direct Payment",
                    "Advance Payment",
                ],
                default: "Letter Of Credit",
            },
            paymentPeriod: { type: Number, default: 0 }, // in days
            // AEO Details (use from directory if available)
            aeoCode: String,
            aeoCountry: { type: String, ref: "Country", default: "IN" },
            aeoRole: String,
        },
        docClicks: {
            checklist: {
                clickedBy: { type: String, trim: true },
                clickedAt: { type: Date }
            },
            file_cover: {
                clickedBy: { type: String, trim: true },
                clickedAt: { type: Date }
            },
            esanchit: {
                clickedBy: { type: String, trim: true },
                clickedAt: { type: Date }
            }
        },
        // Missing Global Fields from UI
        bank_dealer: { type: String, trim: true },
        ac_number: { type: String, trim: true },
        adCode: { type: String, trim: true },
        panNo: { type: String, trim: true },
        pan_no: { type: String, trim: true },
        annexure_c_details: { type: Boolean, default: false },
        annex_additional_notes: { type: String, trim: true },
        annex_c1_documents: { type: Array, default: [] },
        ie_code_of_eou: { type: String, trim: true },
        branch_sr_no: { type: Number, default: 0 },
        examination_date: { type: String, trim: true },
        examining_officer: { type: String, trim: true },
        supervising_officer: { type: String, trim: true },
        commissionerate: { type: String, trim: true },
        verified_by_examining_officer: { type: Boolean, default: false },
        annex_seal_number: { type: String, trim: true },
        annex_designation: { type: String, trim: true },
        annex_division: { type: String, trim: true },
        annex_range: { type: String, trim: true },
        sample_forwarded: { type: Boolean, default: false },
        buyer_name: { type: String, trim: true },
        buyer_address: { type: String, trim: true },
        buyer_gstin: { type: String, trim: true },
        buyer_state: { type: String, trim: true },

        annexC1Details: {
            ieCodeOfEOU: {
                type: String,
                trim: true,
            },
            branchSerialNo: {
                type: Number,
                default: 0,
            },
            examinationDate: { type: String, trim: true },
            examiningOfficer: {
                type: String,
                trim: true,
            },
            supervisingOfficer: {
                type: String,
                trim: true,
            },
            commissionerate: {
                type: String,
                trim: true,
            },
            verifiedByExaminingOfficer: {
                type: Boolean,
                default: false,
            },
            sealNumber: {
                type: String,
                trim: true,
            },
            documents: [
                {
                    serialNo: {
                        type: Number,
                    },
                    documentName: {
                        type: String,
                        trim: true,
                    },
                },
            ],
            designation: {
                type: String,
                trim: true,
            },
            division: {
                type: String,
                trim: true,
            },
            range: {
                type: String,
                trim: true,
            },
            sampleForwarded: {
                type: Boolean,
                default: false,
            },
        },

        // Charges and Billing
        charges: [chargeSchema],

        // eSanchit Documents
        eSanchitDocuments: [eSanchitDocumentSchema],

        // Milestone Tracking
        isJobtrackingEnabled: { type: Boolean, default: false },
        jobtrackingCompletedDate: { type: String, trim: true },
        operational_lock: { type: Boolean, default: false },
        financial_lock: { type: Boolean, default: false },
        isJobCanceled: { type: Boolean, default: false },
        jobCanceledDate: { type: String, trim: true },
        cancellationReason: { type: String, trim: true },
        send_for_billing: { type: Boolean, default: false },
        send_for_billing_date: { type: String, trim: true },
        milestones: [milestoneSchema],
        customerremark: { type: String, trim: true },
        shipmenttype: { type: String, trim: true },
        milestoneremarks: { type: String, trim: true },
        milestoneviewuploaddocuments: { type: String, trim: true },
        milestonehandledby: { type: String, trim: true },

        // Fine Report Fields
        fine_amount: { type: Number, default: 0 },
        fine_accountability: { type: String, trim: true }, // "By Us" or "By Exporter"
        fine_remarks: { type: String, trim: true },
        fines: [
            {
                fineType: { type: String, trim: true }, // "Challan", "Fine by Officer", "Notesheet Amount", "Misc"
                accountability: { type: String, trim: true },
                amount: { type: Number, default: 0 },
                remarks: { type: String, trim: true },
            },
        ],

        // System Fields
        createdBy: { type: String },
        updatedBy: String,

        // Export Checklist Additional Fields - Missing Fields Added
        cha: {
            type: String,
            default: "SURAJ FORWARDERS & SHIPPING AGENCIES",
            trim: true,
        },
        icegateId: { type: String, trim: true, default: "RAJANSFPL" },
        isLocked: { type: Boolean, default: false },
        isGeneralJob: { type: Boolean, default: false },
        lockedBy: { type: String, trim: true, default: null }, // User who currently has the job open
        lockedAt: { type: Date, default: null }, // Timestamp when the job was locked
        imexcube_uploaded: { type: Boolean, default: false },
        imexcube_uploaded_at: { type: Date },
        imexcube_response: { type: Schema.Types.Mixed },
        imexcube_last_action: { type: String, trim: true },
        imexcube_last_status_code: { type: Number },
        imexcube_last_message: { type: String, trim: true },
        is_club_job_parent: { type: Boolean, default: false },
        clubbed_jobs: [{ type: String }],
        parent_club_job: { type: String, trim: true },
        tally_club_ref_no: { type: String, trim: true },
        is_client_job: { type: Boolean, default: false },
        created_by_client: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

exportJobSchema.pre("save", function (next) {
    // Enforce ONLY ONE operation
    if (this.operations && this.operations.length > 1) {
        this.operations = [this.operations[0]];
    }

    // Ensure at least one operation exists
    if (!this.operations || this.operations.length === 0) {
        this.operations = [{
            transporterDetails: [],
            statusDetails: [{}]
        }];
    } else if (this.operations[0]) {
        // Ensure the first operation has at least one statusDetails entry
        if (!this.operations[0].statusDetails || this.operations[0].statusDetails.length === 0) {
            this.operations[0].statusDetails = [{}];
        }
    }

    next();
});

// Remove redundant indexes and add compound indexes
exportJobSchema.index({ jobNumber: 1, isGeneralJob: 1 }, { unique: true });
exportJobSchema.index({ job_no: 1, isGeneralJob: 1 }, { unique: true });
exportJobSchema.index({ filingMode: 1, status: 1 }); // Compound index
exportJobSchema.index({ jobDate: -1, customHouse: 1 }); // Common query pattern
exportJobSchema.index({ createdAt: -1 }); // For recent jobs
exportJobSchema.index({ "invoices.invoiceNumber": 1 }, { sparse: true });

exportJobSchema.virtual("totalCharges").get(function () {
    return (this.charges || []).reduce(
        (total, charge) => total + (charge.selling || 0),
        0,
    );
});

exportJobSchema.virtual("isCompleted").get(function () {
    return this.status === "Completed";
});

// Methods
exportJobSchema.methods.addMilestone = function (
    milestoneName,
    actualDate = null,
) {
    this.milestones.push({
        milestoneName,
        actualDate,
        status: actualDate ? "Completed" : "Pending",
    });
    return this.save();
};

exportJobSchema.methods.updateMilestone = function (milestoneName, actualDate) {
    const milestone = this.milestones.find(
        (m) => m.milestoneName === milestoneName,
    );
    if (milestone) {
        milestone.actualDate = actualDate;
        milestone.status = "Completed";
    }
    return this.save();
};

exportJobSchema.methods.addCharge = function (chargeDetails) {
    this.charges.push(chargeDetails);
    return this.save();
};

exportJobSchema.methods.toImpexCubeExportPayload = function (options = {}) {
    return buildImpexCubeExportPayload(this, options);
};

exportJobSchema.methods.toImpexCubeExportGetDetailsPayload = function () {
    return buildImpexCubeExportGetDetailsPayload(this);
};

// Static methods
exportJobSchema.statics.isImpexCubeExportPayload = isImpexCubeExportPayload;

exportJobSchema.statics.fromImpexCubeExportPayload = function (payload) {
    return buildExportJobFromImpexCubePayload(payload);
};

exportJobSchema.statics.buildImpexCubeExportPayload = function (job, options = {}) {
    return buildImpexCubeExportPayload(job, options);
};

exportJobSchema.statics.buildImpexCubeExportGetDetailsPayload = function (jobOrJobNo) {
    return buildImpexCubeExportGetDetailsPayload(jobOrJobNo);
};

exportJobSchema.statics.findByJobNumber = function (jobNumber) {
    return this.findOne({ jobNumber: jobNumber.toUpperCase() });
};

exportJobSchema.statics.findByDateRange = function (startDate, endDate) {
    return this.find({
        jobDate: {
            $gte: startDate,
            $lte: endDate,
        },
    });
};

exportJobSchema.statics.findByStatus = function (status) {
    return this.find({ status: status });
};

exportJobSchema.pre("save", async function (next) {
    // 0. Sync dates from operations to milestones to ensure automated status updates
    // Priorities: Date fields are now EXCEPTIONAL and are the absolute source of truth
    const op0Status = (this.operations && this.operations[0] && this.operations[0].statusDetails && this.operations[0].statusDetails[0]);
    const isAirJob = (this.job_no && String(this.job_no).toUpperCase().includes('/AIR/'));

    const isFCL = this.consignmentType === "FCL";
    const handoverDate = op0Status ? op0Status.handoverForwardingNoteDate : null;
    const railOutDate = op0Status ? op0Status.railOutReachedDate : null;

    const isFFJob = Boolean(this.isFreightForwarding) ||
        String(this.job_no || "").toUpperCase().startsWith("FF") ||
        String(this.job_no || "").toUpperCase().includes("FF-") ||
        String(this.job_no || "").toUpperCase().includes("/FF/");

    const hasCompleteAgencyBill = Boolean(op0Status?.billing_details?.agency_bill_date && op0Status?.billing_details?.agency_bill_no);
    const hasCompleteReimbursementBill = Boolean(op0Status?.billing_details?.reimbursement_bill_date && op0Status?.billing_details?.reimbursement_bill_no);

    const billingDateVal = isFFJob
        ? (hasCompleteAgencyBill ? op0Status.billing_details.agency_bill_date : null)
        : (hasCompleteAgencyBill && hasCompleteReimbursementBill
            ? (op0Status.billing_details.agency_bill_date || op0Status.billing_details.reimbursement_bill_date)
            : null);

    const syncMap = [
        { date: this.sb_date, name: "SB Filed" },
        { date: op0Status ? op0Status.leoDate : null, name: "L.E.O" },
        { date: handoverDate, name: isAirJob ? "File Handover to IATA" : "Container HO" },
        {
            date: (isAirJob || !isFCL) ? handoverDate : (handoverDate && railOutDate ? handoverDate : null),
            name: "Billing Pending"
        },
        { date: railOutDate, name: isAirJob ? "Departure" : "Rail Out" },
        { date: billingDateVal, name: "Billing Done" },
    ];

    (this.milestones || []).forEach((m) => {
        const match = syncMap.find((s) => s.name === m.milestoneName);
        if (match) {
            if (match.date) {
                m.isCompleted = true;
                m.actualDate = match.date;
            } else {
                // PRIORITIZE DATE: If date field is empty, the milestone MUST be incomplete
                m.isCompleted = false;
                m.actualDate = "";
            }
        }
    });

    // 1. Bi-directional sync between detailedStatus and milestones
    // Prevent string casting bug by handling detailedStatus as a single string item
    const currentStatusItems = [];
    if (typeof this.detailedStatus === "string" && this.detailedStatus.trim() !== "") {
        currentStatusItems.push(this.detailedStatus);
    } else if (Array.isArray(this.detailedStatus)) {
        // Legacy support if somehow array
        currentStatusItems.push(...this.detailedStatus);
    }

    const detailedSet = new Set(currentStatusItems);

    // Normalize "Road Out" to "Rail Out" to ensure consistency
    if (detailedSet.has("Road Out")) {
        detailedSet.delete("Road Out");
        detailedSet.add("Rail Out");
    } else if (detailedSet.has("Road out")) {
        detailedSet.delete("Road out");
        detailedSet.add("Rail Out");
    }

    // A. Update detailedSet based on Milestones (handling unchecks)
    (this.milestones || []).forEach((m) => {
        if (m.milestoneName) {
            if (m.isCompleted) {
                detailedSet.add(m.milestoneName);
            } else {
                detailedSet.delete(m.milestoneName);
            }
        }
    });

    // B. Update Milestones based on detailedSet (handling unchecks)
    let latestCompletedMilestone = "";

    // Define priority order to find the "highest" milestone regardless of array position
    const isAir = isAirJob;
    const milestonePriority = [
        "SB Filed",
        "L.E.O",
        isAir ? "File Handover to IATA" : "Container HO",
        isAir ? "Departure" : "Rail Out",
        "Road Out", // Treat Road Out as equivalent status
        "Billing Pending",
        "Billing Done"
    ];

    if (this.milestones && this.milestones.length > 0) {
        this.milestones.forEach((m) => {
            if (detailedSet.has(m.milestoneName)) {
                if (!m.isCompleted) {
                    m.isCompleted = true;
                }

                // Determine if this milestone is "higher" than the current latest
                const currentPriority = milestonePriority.indexOf(m.milestoneName);
                const latestPriority = milestonePriority.indexOf(latestCompletedMilestone);

                if (currentPriority >= latestPriority) {
                    latestCompletedMilestone = m.milestoneName;
                }

                // Auto-fill date if missing - BUT ONLY if it's NOT a milestone driven by a specific date field
                const isDateDriven = syncMap.some(s => s.name === m.milestoneName);
                if (!isDateDriven && (!m.actualDate || m.actualDate.startsWith("dd-"))) {
                    const d = new Date();
                    const day = String(d.getDate()).padStart(2, "0");
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const year = d.getFullYear();
                    m.actualDate = `${day}-${month}-${year}`;
                }
            } else {
                // If not in detailedStatus, it must not be completed
                if (m.isCompleted) {
                    m.isCompleted = false;
                }
                // Clear date if not completed or reset to empty
                if (
                    !m.isCompleted ||
                    (m.actualDate && m.actualDate.startsWith("dd-"))
                ) {
                    m.actualDate = "";
                }
            }
        });

        // Make sure detailedStatus is a primitive String and properly reflects the latest tracked tracking progression point.
        // Normalized check: If the latest milestone is "Road Out", we treat it as "Rail Out" for the primary detailedStatus label.
        if (latestCompletedMilestone === "Road Out" || latestCompletedMilestone === "Road out") {
            latestCompletedMilestone = "Rail Out";
        }

        if (latestCompletedMilestone) {
            this.detailedStatus = latestCompletedMilestone;
        } else {
            // If no milestones are checked but they typed something custom
            let customSt = Array.from(detailedSet).pop() || "";
            if (customSt === "Road Out" || customSt === "Road out") customSt = "Rail Out";
            this.detailedStatus = customSt;
        }
    } else {
        // If there are no milestones array to reference, simply store the topmost status
        this.detailedStatus = Array.from(detailedSet).pop() || "";
    }

    // 2. Business Logic: Status transitions
    if (this.detailedStatus.includes("Billing Done")) {
        this.status = "Completed";
    } else if (this.status === "Completed" && !this.isJobCanceled) {
        // Revert to Pending if Billing Done is removed and it was previously Completed
        this.status = "Pending";
    }

    // Auto-sync jobNumber with job_no for indexing and consistency
    if (this.isModified("job_no")) {
        this.jobNumber = this.job_no;
    }

    // 3. Auto-populate completion dates for VGM, Form 13, and shipping bill
    const getTodayStr = () => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();
        return `${day}-${month}-${year}`;
    };

    if (this.isModified("vgm_done") || this.isModified("form13_done") || this.isModified("shipping_bill_done")) {
        if (this.vgm_done && !this.vgm_date) this.vgm_date = getTodayStr();
        else if (!this.vgm_done) this.vgm_date = "";

        if (this.form13_done && !this.form13_date) this.form13_date = getTodayStr();
        else if (!this.form13_done) this.form13_date = "";

        if (this.shipping_bill_done && !this.shipping_bill_done_date) this.shipping_bill_done_date = getTodayStr();
        else if (!this.shipping_bill_done) this.shipping_bill_done_date = "";
    }

    // 4. Sync leo_date and booking_copy with operations[0].statusDetails[0]
    const op0 = this.operations && this.operations[0];
    const stat0 = op0 && op0.statusDetails && op0.statusDetails[0];
    if (stat0 && !this._isClubSync) {
        // Sync LEO Date - prioritize the one that was actually modified in the request
        if (this.isModified("operations.0.statusDetails.0.leoDate")) {
            this.leo_date = stat0.leoDate || "";
        } else if (this.isModified("leo_date")) {
            stat0.leoDate = this.leo_date || "";
        }

        // Sync Booking Copy - prioritize the one that was actually modified in the request
        if (this.isModified("operations.0.statusDetails.0.booking_copy")) {
            this.booking_copy = stat0.booking_copy || [];
        } else if (this.isModified("booking_copy")) {
            stat0.booking_copy = this.booking_copy || [];
        }
    }

    next();
});

// Static method to find by seal number
exportJobSchema.statics.findBySealNumber = function (sealNo) {
    return this.findOne({ "annexC1Details.sealNumber": sealNo });
};

// Add compound indexes suggested by Performance Advisor
exportJobSchema.index({
    branch_code: 1,
    port_of_loading: 1,
    status: 1,
    year: 1,
    job_no: 1,
    detailedStatus: 1,
    isGeneralJob: 1,
    isJobCanceled: 1
});
exportJobSchema.index({ job_no: 1, port_of_loading: 1, year: 1, branch_code: 1 });
exportJobSchema.index({ job_no: 1, is_club_job_parent: 1 });
exportJobSchema.index({ status: 1, is_client_job: -1 });

// Create and export the model
const ExJobModel = mongoose.model("ExportJob", exportJobSchema);

export {
    CUSTOM_HOUSE_CODE_MAP,
    COUNTRY_CODE_MAP,
    PORT_CODE_MAP,
    STATE_CODE_MAP,
    MONTH_CODE_MAP,
    buildImpexCubeExportPayload,
    buildExportJobFromImpexCubePayload,
    isImpexCubeExportPayload,
    buildImpexCubeExportGetDetailsPayload,
    areDetailsSchema,
    deecSchema,
    epcgSchema,
    cessExpDutySchema,
    freightInsuranceChargesSchema,
    drawbackDetailsSchema,
    productDetailsSchema,
    invoiceSchema,
    buyerThirdPartySchema,
    apInvoiceSchema,
    arInvoiceSchema,
    containerDetailsSchema,
    packingListSchema,
    stuffingDetailsSchema,
    eSanchitDocumentSchema,
    chargeSchema,
    milestoneSchema,
    statusDetailsSchema,
    exportOperationSchema,
    exportJobSchema,
};

export default ExJobModel;
