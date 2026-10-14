import mongoose from "mongoose";

const { Schema } = mongoose;

export const eSanchitDocumentSchema = new Schema({
    documentLevel: { type: String, enum: ["Invoice", "Item", "Job"] },
    scope: {
        type: String,
    },
    invSerialNo: String,
    itemSerialNo: String,
    irn: String,
    documentType: String,
    documentReferenceNo: String,
    documentCode: String,
    documentName: String,
    documentFilePath: String,
    documentFileFormat: String,
    otherIcegateId: String,
    icegateFilename: String,
    dateOfIssue: { type: String, trim: true },
    placeOfIssue: String,
    expiryDate: { type: String, trim: true },
    fileUrl: String,

    dateTimeOfUpload: { type: String, trim: true },
    issuingParty: {
        name: String,
        code: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        pinCode: String,
    },
    beneficiaryParty: {
        name: String,
        code: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        pinCode: String,
    },
});

export const chargeSchema = new Schema(
    {
        chargeHead: { type: String },
        category: { type: String },
        chargeType: { type: String, enum: ['Margin', 'Reimbursement'], default: 'Margin' },
        hsnCode: { type: String, trim: true },
        tdsCategory: { type: String, trim: true },
        isPbMandatory: { type: Boolean, default: false },

        // Top-level fields
        invoice_number: { type: String, trim: true },
        invoice_date: { type: String, trim: true },
        remark: { type: String, trim: true },
        purchase_book_no: { type: String, trim: true },
        purchase_book_status: { type: String, trim: true },
        purchase_book_is_approved: { type: Boolean, default: false },
        payment_request_no: { type: String, trim: true },
        payment_request_status: { type: String, trim: true },
        payment_request_is_approved: { type: Boolean, default: false },
        payment_request_receipt_url: { type: String, trim: true },
        purchase_book_receipt_url: { type: String, trim: true },
        payment_request_transaction_type: { type: String, trim: true },

        revenue: {
            particulars: { type: String },
            url: { type: [String], default: [] },
            amount: { type: Number, default: 0 },
            amountINR: { type: Number, default: 0 },
            currency: { type: String, default: 'INR' },
            exRate: { type: Number, default: 1 },
            exchangeRate: { type: Number, default: 1 }, // alias for exRate sometimes used in UI
            gst: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            invoiceNo: { type: String },
            invoiceDate: { type: String },
            status: { type: String },
            isSynced: { type: Boolean, default: false },

            // Added fields for GST/TDS persistence
            isGst: { type: Boolean, default: false },
            gstRate: { type: Number, default: 18 },
            basicAmount: { type: Number, default: 0 },
            gstAmount: { type: Number, default: 0 },
            cgst: { type: Number, default: 0 },
            sgst: { type: Number, default: 0 },
            igst: { type: Number, default: 0 },
            isTds: { type: Boolean, default: false },
            tdsPercent: { type: Number, default: 0 },
            tdsAmount: { type: Number, default: 0 },
            netPayable: { type: Number, default: 0 },
            chargeDescription: { type: String, trim: true },
            partyName: { type: String, trim: true },
            partyType: { type: String, trim: true },
            branchIndex: { type: Number, default: 0 },
            basis: { type: String, trim: true },
            qty: { type: Number, default: 1 },
            rate: { type: Number, default: 0 },
        },
        cost: {
            particulars: { type: String },
            url: { type: [String], default: [] },
            amount: { type: Number, default: 0 },
            amountINR: { type: Number, default: 0 },
            currency: { type: String, default: 'INR' },
            exRate: { type: Number, default: 1 },
            exchangeRate: { type: Number, default: 1 },
            gst: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            vendorName: { type: String }, // maintained for legacy
            invoiceNo: { type: String },
            invoiceDate: { type: String },
            status: { type: String },
            isSynced: { type: Boolean, default: false },

            // Added fields for GST/TDS persistence
            isGst: { type: Boolean, default: false },
            gstRate: { type: Number, default: 18 },
            basicAmount: { type: Number, default: 0 },
            gstAmount: { type: Number, default: 0 },
            cgst: { type: Number, default: 0 },
            sgst: { type: Number, default: 0 },
            igst: { type: Number, default: 0 },
            isTds: { type: Boolean, default: false },
            tdsPercent: { type: Number, default: 0 },
            tdsAmount: { type: Number, default: 0 },
            netPayable: { type: Number, default: 0 },
            chargeDescription: { type: String, trim: true },
            partyName: { type: String, trim: true },
            partyType: { type: String, trim: true },
            branchIndex: { type: Number, default: 0 },
            basis: { type: String, trim: true },
            qty: { type: Number, default: 1 },
            rate: { type: Number, default: 0 },
            virtualBalanceTerminal: { type: String, trim: true, default: '' },
            virtualBalanceType: { type: String, enum: ['TERMINAL', 'CFS', ''], default: '' },
            expenseMadeBy: { type: String, trim: true, default: '' },
        },
        copyToCost: { type: Boolean, default: true },
        parentId: { type: Schema.Types.ObjectId },
        parentModule: { type: String },
    },
    { _id: true, timestamps: true },
);

export const milestoneSchema = new Schema(
    {
        milestoneName: { type: String, trim: true },

        actualDate: { type: String, trim: true }, // Format: dd-MMM-yyyy HH:mm
        isCompleted: { type: Boolean, default: false },
        isMandatory: { type: Boolean, default: false },
        completedBy: { type: String, trim: true },
        remarks: { type: String, trim: true },
    },
    { _id: true },
);

export const statusDetailsSchema = new Schema(
    {
        rms: { type: String, trim: true },
        goodsRegistrationDate: { type: String, trim: true },
        goodsReportDate: { type: String, trim: true },
        leoDate: { type: String, trim: true },
        leoUpload: [String],
        booking_copy: [String], // Added for status-level storage
        stuffingDate: { type: String, trim: true },
        stuffingSheetUpload: [String],
        stuffingPhotoUpload: [String],
        eGatePassCopyDate: { type: String, trim: true },
        eGatePassUpload: [String],
        icdPort: { type: String, trim: true },
        handoverForwardingNoteDate: { type: String, trim: true },
        forwardingNoteUpload: [String],
        handoverImageUpload: [String],
        manualVgmUpload: [String],
        odexVgmUpload: [String],
        odexEsbUpload: [String],
        odexForm13Upload: [String],
        cmaForwardingNoteUpload: [String],
        containerDoorPhotoUpload: [String],
        cartingPhotoUpload: [String],
        weighmentSlipUpload: [String],
        clpUpload: [String],
        completionCopyUpload: [String],
        movementCopyUpload: [String],
        shippingInstructionsUpload: [String],
        form13CopyUpload: [String],
        assessmentCopy: [String],
        forwarderName: { type: String, trim: true },
        handoverConcorTharSanganaRailRoadDate: { type: String, trim: true },
        billingDocsSentDt: { type: String, trim: true },
        billingDocsSentUpload: [String],
        billing_details: {
            agency_bill_date: { type: String, trim: true },
            agency_bill_no: { type: String, trim: true },
            reimbursement_bill_date: { type: String, trim: true },
            reimbursement_bill_no: { type: String, trim: true },
        },
        otherDocUpload: [String],
        otherDocsCustom: [
            {
                name: { type: String, trim: true },
                url: { type: String, trim: true },
                uploadedAt: { type: Date, default: Date.now }
            }
        ],
        forwardingNoteDocUpload: [String],
        billingDocsStatus: { type: String, trim: true },
        railRoad: { type: String, trim: true },
        concorPrivate: { type: String, trim: true },
        privateTransporterName: { type: String, trim: true },
        hoToConsoleDate: { type: String, trim: true },
        hoToConsoleDate2: { type: String, trim: true },
        hoToConsoleName: { type: String, trim: true },
        containerPlacementDate: { type: String, trim: true },
        gateInDate: { type: String, trim: true },
        railOutReachedDate: { type: String, trim: true },
    },
    { _id: true },
);

export const exportOperationSchema = new Schema(
    {
        transporterDetails: [
            {
                transporterName: { type: String, trim: true },
                vehicleNo: { type: String, trim: true },
                noOfPackages: { type: Number, trim: true },
                grossWeightKgs: { type: Number, trim: true },
                images: [String],
                cartingDate: { type: String, trim: true },
            },
        ],

        statusDetails: [statusDetailsSchema],
    },
    { _id: true },
);
