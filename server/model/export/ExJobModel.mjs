import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Sub-schemas for complex nested data
const areDetailsSchema = new Schema(
  {
    serialNumber: { type: Number },
    areNumber: { type: String, trim: true },
    areDate: { type: String, trim: true }, // Changed to String for dd-mm-yyyy
    commissionerate: { type: String, trim: true },
    division: { type: String, trim: true },
    range: { type: String, trim: true },
    remark: { type: String, trim: true },
  },
  { _id: true },
);
const deecSchema = new Schema(
  {
    isDeecItem: { type: Boolean, default: false },
    itemSnoPartE: { type: String, trim: true },
    exportQtyUnderLicence: { type: Number, default: 0 },

    // DEEC Items table
    deecItems: [
      {
        serialNumber: { type: Number },
        itemSnoPartC: { type: String, trim: true },
        description: { type: String, trim: true },
        quantity: { type: Number, default: 0 },
        unit: { type: String, trim: true },
        itemType: {
          type: String,
          enum: ["Indigenous", "Imported"],
          default: "Indigenous",
        },
      },
    ],

    // Reference information
    deec_reg_obj: [
      {
        licRefNo: { type: String, trim: true },
        regnNo: { type: String, trim: true },
        licDate: { type: String, trim: true },
      },
    ],
  },
  { _id: true },
);

// EPCG Schema
const epcgSchema = new Schema(
  {
    isEpcgItem: { type: Boolean, default: false },
    itemSnoPartE: { type: String, trim: true },
    exportQtyUnderLicence: { type: Number, default: 0 },

    // EPCG Items table
    epcgItems: [
      {
        serialNumber: { type: Number },
        itemSnoPartC: { type: String, trim: true },
        description: { type: String, trim: true },
        quantity: { type: Number, default: 0 },
        unit: { type: String, trim: true },
        itemType: {
          type: String,
          enum: ["Indigenous", "Imported"],
          default: "Indigenous",
        },
      },
    ],

    // Reference information
    epcg_reg_obj: [
      {
        licRefNo: { type: String, trim: true },
        regnNo: { type: String, trim: true },
        licDate: { type: String, trim: true },
      },
    ],
  },
  { _id: true },
);
const cessExpDutySchema = new Schema(
  {
    // master flag
    cessDutyApplicable: { type: Boolean, default: false },

    // each row has: code dropdown, rate value+unit, TV value+factor, qty, desc
    exportDutyCode: { type: String, trim: true },
    exportDuty: { type: Number, default: 0 }, // base amount if needed
    exportDutyRate: { type: Number, default: 0 },
    exportDutyRateUnit: { type: String, trim: true }, // "% or Rs"
    exportDutyTariffValue: { type: Number, default: 0 },
    exportDutyTariffFactor: { type: Number, default: 0 },
    exportDutyQty: { type: Number, default: 0 },
    exportDutyDesc: { type: String, trim: true },

    cessCode: { type: String, trim: true },
    cess: { type: Number, default: 0 },
    cessRate: { type: Number, default: 0 },
    cessRateUnit: { type: String, trim: true },
    cessTariffValue: { type: Number, default: 0 },
    cessTariffFactor: { type: Number, default: 0 },
    cessQty: { type: Number, default: 0 },
    cessDesc: { type: String, trim: true },

    otherDutyCessCode: { type: String, trim: true },
    otherDutyCess: { type: Number, default: 0 },
    otherDutyCessRate: { type: Number, default: 0 },
    otherDutyCessRateUnit: { type: String, trim: true },
    otherDutyCessTariffValue: { type: Number, default: 0 },
    otherDutyCessTariffFactor: { type: Number, default: 0 },
    otherDutyCessQty: { type: Number, default: 0 },
    otherDutyCessDesc: { type: String, trim: true },

    tariffValue_tv: { type: Number, default: 0 },
    tariffUnit_tv: { type: String, trim: true },

    thirdCessCode: { type: String, trim: true },
    thirdCess: { type: Number, default: 0 },
    thirdCessRate: { type: Number, default: 0 },
    thirdCessRateUnit: { type: String, trim: true },
    thirdCessTariffValue: { type: Number, default: 0 },
    thirdCessTariffFactor: { type: Number, default: 0 },
    thirdCessQty: { type: Number, default: 0 },
    thirdCessDesc: { type: String, trim: true },

    // common unit field at bottom right
    cessUnit: { type: String, trim: true },

    // nested CENVAT block from screenshot
    cenvat: {
      certificateNumber: { type: String, trim: true },
      date: { type: String, trim: true },
      validUpto: { type: String, trim: true },
      cexOfficeCode: { type: String, trim: true },
      assesseeCode: { type: String, trim: true },
    },
  },
  { _id: false },
);

const freightInsuranceChargesSchema = new Schema(
  {
    freight: {
      currency: { type: String, ref: "Currency" },
      exchangeRate: { type: Number },
      rate: { type: Number },
      baseValue: { type: Number },
      amount: { type: Number },
    },
    insurance: {
      currency: { type: String, ref: "Currency" },
      exchangeRate: { type: Number },
      rate: { type: Number },
      baseValue: { type: Number },
      amount: { type: Number },
    },
    discount: {
      currency: { type: String, ref: "Currency" },
      exchangeRate: { type: Number },
      rate: { type: Number },
      amount: { type: Number },
    },
    otherDeduction: {
      currency: { type: String, ref: "Currency" },
      exchangeRate: { type: Number },
      rate: { type: Number },
      amount: { type: Number },
    },
    commission: {
      currency: { type: String, ref: "Currency" },
      exchangeRate: { type: Number },
      rate: { type: Number },
      amount: { type: Number },
    },
    fobValue: {
      currency: { type: String, ref: "Currency" },
      fobValueUSD: { type: Number },
      amount: { type: Number },
    },
  },
  { _id: false },
);

// Drawback Details Schema
const drawbackDetailsSchema = new Schema(
  {
    dbkitem: { type: Boolean, default: false },
    dbkSrNo: { type: String },
    fobValue: { type: String, min: 0 },
    quantity: { type: Number, min: 0 },
    unit: { type: String, trim: true },
    dbkUnder: {
      type: String,
      enum: ["Actual", "Provisional"],
      default: "Actual",
    },
    dbkDescription: { type: String, maxlength: 500 },
    dbkRate: { type: Number, default: 0, min: 0 },
    dbkCap: { type: Number, default: 0, min: 0 },
    dbkCapunit: { type: String, trim: true },
    dbkAmount: { type: Number, default: 0, min: 0 },
    percentageOfFobValue: { type: String },
    // ROSCTL fields
    slRate: { type: Number, default: 0 },
    slCap: { type: Number, default: 0 },
    ctlRate: { type: Number, default: 0 },
    ctlCap: { type: Number, default: 0 },
    rosctlAmount: { type: Number, default: 0 },
    rosctlCategory: { type: String, trim: true }, // "B" or "D"
    showRosctl: { type: Boolean, default: false },
    drawback_scroll_date: { type: String, trim: true },
    drawback_scroll_no: { type: String, trim: true },
    rosctl_scroll_no: { type: String, trim: true },
    rosctl_scroll_date: { type: String, trim: true },

  },
  { _id: true },
);
// Product/Item Details Schema (for multiple products per invoice)
const productDetailsSchema = new Schema(
  {
    serialNumber: { type: String },
    description: { type: String, maxlength: 500 },
    ritc: { type: String, ref: "TariffHead" },
    quantity: { type: String },
    qtyUnit: { type: String },
    socQuantity: { type: String, default: "0" },
    socunit: { type: String },
    unitPrice: { type: String },
    priceUnit: { type: String },
    per: { type: String },
    perUnit: { type: String },
    amount: { type: String },
    amountUnit: { type: String },

    // --- General / Origin Details ---

    eximCode: { type: String, trim: true },
    nfeiCategory: { type: String, trim: true },
    rewardItem: { type: Boolean, default: false }, // Changed to Boolean
    strCode: { type: String, trim: true },
    endUse: { type: String, trim: true },
    originDistrict: { type: String, trim: true },
    originState: { type: String, trim: true },
    ptaFtaInfo: { type: String, trim: true },
    alternateQty: { type: String, default: "0" },
    materialCode: { type: String, trim: true },
    medicinalPlant: { type: String, trim: true },
    formulation: { type: String, trim: true },
    surfaceMaterialInContact: { type: String, trim: true },
    labGrownDiamond: { type: String, trim: true },

    // --- PMV Info (Grouped) ---
    pmvInfo: {
      currency: { type: String },
      calculationMethod: { type: String, trim: true }, // 'percentage' or 'value'
      percentage: { type: String, default: "110" },
      pmvPerUnit: { type: String, default: "0" },
      totalPMV: { type: String, default: "0" },
    },

    // --- IGST & Compensation Cess Info (Grouped) ---
    igstCompensationCess: {
      igstPaymentStatus: { type: String, trim: true, default: "LUT" },
      taxableValueINR: { type: String, default: "0" },
      igstRate: { type: String, default: "0" },
      igstAmountINR: { type: String, default: "0" },
      compensationCessRate: { type: String, default: "0" },
      compensationCessAmountINR: { type: String, default: "0" },
    },

    // --- RODTEP Info (Grouped) ---
    rodtepInfo: {
      claim: { type: String, trim: true, default: "Yes" },
      quantity: { type: String, default: "0" },
      ratePercent: { type: String, default: "0" },
      capValue: { type: String, default: "0" },
      capValuePerUnits: { type: String, default: "0" },
      amountINR: { type: String, default: "0" },
      unit: { type: String, trim: true }, // Added unit if needed
      capUnit: { type: String, trim: true }, // Added capUnit if needed
    },

    // --- ROSCTL Info (Grouped) ---
    rosctlInfo: {
      claim: { type: String, trim: true, default: "No" },
      quantity: { type: String, default: "0" },
      slRate: { type: String, default: "0" },
      slCap: { type: String, default: "0" },
      ctlRate: { type: String, default: "0" },
      ctlCap: { type: String, default: "0" },
      amountINR: { type: String, default: "0" },
      category: { type: String, trim: true }, // "B" or "D"
    },

    cessExpDuty: { type: cessExpDutySchema },

    // --- Re-Export Details ---
    reExport: {
      isReExport: { type: Boolean, default: false },

      // Import / B/E Side
      beNumber: { type: String, trim: true },
      beDate: { type: String, trim: true }, // Date picker
      invoiceSerialNo: { type: String, trim: true },
      itemSerialNo: { type: String, trim: true },
      importPortCode: { type: String, trim: true },
      manualBE: { type: Boolean, default: false },
      beItemDescription: { type: String, trim: true },

      quantityImported: { type: Number, default: 0 },
      qtyImportedUnit: { type: String, trim: true }, // Added (Missing in original)

      assessableValue: { type: Number, default: 0 },
      totalDutyPaid: { type: Number, default: 0 },
      dutyPaidDate: { type: String, trim: true },

      // Export Side
      quantityExported: { type: Number, default: 0 },
      qtyExportedUnit: { type: String, trim: true }, // Added (Missing in original)

      technicalDetails: { type: String, trim: true },

      inputCreditAvailed: { type: Boolean, default: false },
      personalUseItem: { type: Boolean, default: false },

      otherIdentifyingParameters: { type: String, trim: true },

      againstExportObligation: { type: Boolean, default: false }, // Changed to Boolean to match checkbox
      obligationNo: { type: String, trim: true },

      drawbackAmtClaimed: { type: Number, default: 0 },

      itemUnUsed: { type: Boolean, default: false },
      commissionerPermission: { type: Boolean, default: false }, // Changed to Boolean to match checkbox

      boardNumber: { type: String, trim: true },
      boardDate: { type: String, trim: true }, // Added (Missing in original)

      modvatAvailed: { type: Boolean, default: false },
      modvatReversed: { type: Boolean, default: false },

      // Legacy fields just in case
      commPermissionDate: { type: String, trim: true },
    },

    // --- Other Details ---
    otherDetails: {
      accessories: { type: String, trim: true, default: "" },
      accessoriesRemarks: { type: String, trim: true, default: "" },
      isThirdPartyExport: { type: Boolean, default: false },
      thirdParty: {
        name: { type: String, trim: true },
        ieCode: { type: String, trim: true },
        branchSrNo: { type: String, trim: true },
        regnNo: { type: String, trim: true },
        address: { type: String, trim: true },
      },
      manufacturer: {
        name: { type: String, trim: true },
        code: { type: String, trim: true },
        address: { type: String, trim: true },
        country: { type: String, trim: true },
        stateProvince: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        sourceState: { type: String, trim: true },
        transitCountry: { type: String, trim: true },
      },
    },

    areDetails: [areDetailsSchema],
    deecDetails: deecSchema,
    epcgDetails: epcgSchema,
    drawbackDetails: [drawbackDetailsSchema],

    // --- Legacy / Flat fields (kept for SB Type logic compatibility) ---
    sbTypeDetails: { type: String, trim: true },
    dbkType: { type: String, trim: true },
    cessExciseDuty: { type: String, default: "0" },
    compensationCess: { type: String, default: "0" },
  },
  { _id: true },
);

// Invoice Schema (multiple invoices per job)
const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String },
    invoiceDate: { type: String, trim: true },
    termsOfInvoice: {
      type: String,
      default: "FOB",
    },
    toiPlace: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      ref: "Currency",
    },
    invoiceValue: { type: Number, min: 0 },
    productValue: { type: Number, min: 0 },
    priceIncludes: {
      type: String,
      enum: ["Both", "Freight", "Insurance", "None"],
      default: "Both",
    },
    packing_charges: { type: Number, default: 0 },
    products: [productDetailsSchema],
    freightInsuranceCharges: { type: freightInsuranceChargesSchema },
  },
  { _id: true },
);
// Payment Request Schema

// Container Details Schema
const containerDetailsSchema = new Schema(
  {
    serialNumber: { type: Number },
    containerNo: { type: String },
    sealNo: String,
    shippingLineSealNo: String,
    sealDate: { type: String, trim: true },
    type: {
      type: String,
    },
    pkgsStuffed: { type: Number, default: 0 },
    grossWeight: { type: Number, default: 0 },
    maxGrossWeightKgs: { type: Number, default: 0 },
    vgmWtInvoice: { type: Number, default: 0 },
    maxPayloadKgs: { type: Number, default: 0 },
    sealType: {
      type: String,
    },
    grWtPlusTrWt: { type: Number, default: 0 },
    tareWeightKgs: { type: Number, default: 0 },
    sealDeviceId: String,
    rfid: String,
    images: [String],
    // Weighment Details
    weighBridgeName: { type: String, trim: true },
    weighmentRegNo: { type: String, trim: true },
    weighmentDateTime: { type: String, trim: true },
    weighmentVehicleNo: { type: String, trim: true },
    weighmentTareWeight: { type: Number, default: 0 },
    weighmentAddress: { type: String, trim: true },
    weighmentImages: [String],
  },
  { _id: true },
);
// Buyer/Third Party Information Schema
const buyerThirdPartySchema = new Schema(
  {
    // Buyer Information
    buyer: {
      name: { type: String },
      addressLine1: String,
      city: String,
      pin: String,
      country: { type: String, ref: "Country" },
      state: String,
    },

    // Third Party Information (if applicable)
    thirdParty: {
      isThirdPartyExport: { type: Boolean, default: false },
      name: String,
      city: String,
      pin: String,
      country: { type: String, ref: "Country" },
      state: String,
      address: String,
    },

    // Manufacturer/Producer/Grower Details
    manufacturer: {
      name: String,
      ieCode: String,
      branchSerialNo: String,
      registrationNo: String,
      address: String,
      country: { type: String, ref: "Country", default: "IN" },
      stateProvince: String,
      postalCode: String,
      sourceState: { type: String, ref: "State" },
      transitCountry: { type: String, ref: "Country" },
    },
  },
  { _id: false },
);
// AP Invoice Schema (Financial - Accounts Payable)
const apInvoiceSchema = new Schema(
  {
    date: { type: String, trim: true },
    bill_no: { type: String, trim: true },
    type: { type: String, trim: true, default: "INV" },
    organization: { type: String, trim: true },
    currency: { type: String, trim: true },
    amount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    vendor_bill_no: { type: String, trim: true },
  },
  { _id: true },
);

const arInvoiceSchema = new Schema(
  {
    date: { type: String, trim: true },
    bill_no: { type: String, trim: true },
    type: { type: String, trim: true, default: "INV" },
    organization: { type: String, trim: true },
    currency: { type: String, trim: true },
    amount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  { _id: true },
);

// eSanchit Document Schema
const eSanchitDocumentSchema = new Schema({
  documentLevel: { type: String, enum: ["Invoice", "Item", "Job"] },
  scope: {
    type: String,
  },
  invSerialNo: String,
  itemSerialNo: String,
  irn: String,
  documentType: String,
  documentReferenceNo: String,
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

// Charge Schema
const chargeSchema = new Schema(
  {
    chargeHead: { type: String },
    category: { type: String },

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
    },
    copyToCost: { type: Boolean, default: true },
    parentId: { type: Schema.Types.ObjectId },
    parentModule: { type: String },
  },
  { _id: true, timestamps: true },
);

// Milestone Tracking Schema
const milestoneSchema = new Schema(
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

const statusDetailsSchema = new Schema(
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
    forwarderName: { type: String, trim: true },
    handoverConcorTharSanganaRailRoadDate: { type: String, trim: true },
    billingDocsSentDt: { type: String, trim: true },
    billingDocsSentUpload: [String],
    otherDocUpload: [String],
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

// Container/Package Schema for Export - FIXED as proper Mongoose Schema
const exportOperationSchema = new Schema(
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

    ////////////////////////////////////////////////// Excel sheet
    year: { type: String, trim: true },
    jobNumber: { type: String, trim: true, unique: true },
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
    exporter_branch_name: { type: String, trim: true },

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
    mbl_date: { type: String, trim: true },
    hbl_date: { type: String, trim: true },
    hbl_no: { type: String, trim: true },
    mbl_no: { type: String, trim: true },
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
    sample_accompanied: { type: Boolean, default: false },
    factory_address: { type: String, trim: true },
    warehouse_code: { type: String, trim: true },
    stuffing_seal_type: { type: String, trim: true },
    stuffing_seal_no: { type: String, trim: true },
    stuffing_agency_name: { type: String, trim: true },

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

    // Boolean Control Fields (Missing)
    buyer_other_than_consignee: { type: Boolean, default: false },

    // products: { type: Array, default: [] },
    charges: [chargeSchema],
    documents: { type: Object, default: {} },

    status: { type: String, trim: true },
    detailedStatus: { type: String, default: "" },
    vgm_done: { type: Boolean, default: false },
    vgm_date: { type: String, trim: true },
    form13_done: { type: Boolean, default: false },
    form13_date: { type: String, trim: true },
    shipping_bill_done: { type: Boolean, default: false },
    shipping_bill_done_date: { type: String, trim: true },

    ////////////////////////////////////////////////// Exporter Information
    exporter_address: { type: String, trim: true },
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
    exporter_gstin: { type: String, trim: true },
    exporter_tan: { type: String, trim: true },
    ad_code: { type: String, trim: true }, // Authorized Dealer Code

    // Banking Information - Removed duplicate bank_name
    bank_account_number: { type: String, trim: true },
    bank_ifsc_code: { type: String, trim: true },
    bank_swift_code: { type: String, trim: true },

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

    // Removed duplicate container_count
    stuffing_date: { type: String, trim: true },
    stuffing_supervisor: { type: String, trim: true },
    stuffing_remarks: { type: String, trim: true },
    cfs: { type: String, trim: true },

    ////////////////////////////////////////////////// Charges and Financial
    remarks: { type: String, trim: true },

    // Job Assignment
    job_owner: { type: String, trim: true },

    job_no: {
      type: String,
      unique: true,
      uppercase: true,
    },

    // Multiple Invoices
    invoices: [invoiceSchema],

    // Container Details
    containers: [containerDetailsSchema],

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

      // This will reference the main stuffing_seal_no
      sealNumber: {
        type: String,
        ref: "stuffing_seal_no", // Indicates this references another field
      },

      // Documents for Annex C1
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

      // Additional C1 fields
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

    // Payment Requests
    // AR/AP Invoices
    arInvoices: [
      {
        date: Date,
        billNo: String,
        type: String,
        organization: { type: String, ref: "Directory" },
        currency: { type: String, ref: "Currency" },
        amount: Number,
        balance: Number,
        vendorBillNo: String,
      },
    ],

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
    send_for_billing_date: { type: Date },
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
    ar_invoices: [arInvoiceSchema],
    total_ar_amount: { type: Number, default: 0 },
    outstanding_balance: { type: Number, default: 0 },
    ar_default_currency: { type: String, trim: true },
    ar_payment_terms_days: { type: Number, default: 30 },
    ar_last_updated: { type: Date },
    ar_notes: { type: String, trim: true },

    // Add these fields to your main exportJobSchema:
    ap_invoices: [apInvoiceSchema],
    total_ap_amount: { type: Number, default: 0 },
    ap_outstanding_balance: { type: Number, default: 0 },
    ap_default_currency: { type: String, trim: true },
    ap_payment_terms_days: { type: Number, default: 30 },
    ap_notes: { type: String, trim: true },
    // Add to main exportJobSchema:
    charges: [chargeSchema],
    // Export Checklist Additional Fields - Missing Fields Added
    cha: {
      type: String,
      default: "SURAJ FORWARDERS & SHIPPING AGENCIES",
      trim: true,
    },
    masterblno: { type: String, trim: true }, // Master BL Number
    houseblno: { type: String, trim: true }, // House BL Number
    icegateId: { type: String, trim: true, default: "RAJANSFPL" },
    isLocked: { type: Boolean, default: false },
    lockedBy: { type: String, trim: true, default: null }, // User who currently has the job open
    lockedAt: { type: Date, default: null }, // Timestamp when the job was locked
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

  // Sync stuffing_seal_no with annexC1Details
  if (this.stuffing_seal_no) {
    this.annexC1Details = this.annexC1Details || {};
    this.annexC1Details.sealNumber = this.stuffing_seal_no;
  }

  next();
});

// Remove redundant indexes and add compound indexes
exportJobSchema.index({ jobNumber: 1 }, { unique: true });
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

// Static methods
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

// Virtual population for sealNumber
exportJobSchema.virtual("annexC1Details.virtualSealNumber").get(function () {
  return this.stuffing_seal_no;
});

exportJobSchema.virtual("annexC1Details.virtualSealType").get(function () {
  return this.stuffing_seal_type;
});

// Pre-save to keep them in sync
exportJobSchema.pre("save", function (next) {
  // Always sync the seal number from main to annex C1
  if (this.stuffing_seal_no) {
    this.annexC1Details.sealNumber = this.stuffing_seal_no;
  }

  // 0. Sync dates from operations to milestones to ensure automated status updates
  // Priorities: Date fields are now EXCEPTIONAL and are the absolute source of truth
  const op0Status = (this.operations && this.operations[0] && this.operations[0].statusDetails && this.operations[0].statusDetails[0]);
  const isAirJob = (this.job_no && String(this.job_no).toUpperCase().includes('/AIR/'));

  const syncMap = [
    { date: this.sb_date, name: "SB Filed" },
    { date: op0Status ? op0Status.leoDate : null, name: "L.E.O" },
    { date: op0Status ? op0Status.handoverForwardingNoteDate : null, name: isAirJob ? "File Handover to IATA" : "Container HO" },
    { date: op0Status ? op0Status.handoverForwardingNoteDate : null, name: "Billing Pending" },
    { date: op0Status ? op0Status.railOutReachedDate : null, name: isAirJob ? "Departure" : "Rail Out" },
    { date: op0Status ? op0Status.billingDocsSentDt : null, name: "Billing Done" },
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

  // 4. Sync leo_date with operations[0].statusDetails[0].leoDate
  const op0 = this.operations && this.operations[0];
  const stat0 = op0 && op0.statusDetails && op0.statusDetails[0];
  if (stat0 && stat0.leoDate) {
    this.leo_date = stat0.leoDate;
  } else if (this.leo_date && stat0) {
    stat0.leoDate = this.leo_date;
  }

  next();
});

// Static method to find by seal number
exportJobSchema.statics.findBySealNumber = function (sealNo) {
  return this.findOne({
    $or: [
      { stuffing_seal_no: sealNo },
      { "annexC1Details.sealNumber": sealNo },
    ],
  });
};
// Create and export the model
const ExJobModel = mongoose.model("ExportJob", exportJobSchema);
export default ExJobModel;