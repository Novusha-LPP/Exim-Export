import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Sub-schemas for complex nested data
const areDetailsSchema = new Schema(
  {
    serialNumber: { type: Number },
    areNumber: { type: String, trim: true },
    areDate: { type: String, trim: true }, // Changed to String for DD-MM-YYYY
    commissionerate: { type: String, trim: true },
    division: { type: String, trim: true },
    range: { type: String, trim: true },
    remark: { type: String, trim: true },
  },
  { _id: true }
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
  { _id: true }
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
  { _id: true }
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
  { _id: false }
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

    // --- Legacy / Flat fields (kept for SB Type logic compatibility) ---
    sbTypeDetails: { type: String, trim: true },
    dbkType: { type: String, trim: true },
    cessExciseDuty: { type: String, default: "0" },
    compensationCess: { type: String, default: "0" },
  },
  { _id: true }
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
  },
  { _id: true }
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
    packing_fob: { type: Number, default: 0 },
  },
  { _id: true }
);
// Payment Request Schema

// Container Details Schema
const containerDetailsSchema = new Schema(
  {
    serialNumber: { type: Number },
    containerNo: { type: String },
    sealNo: String,
    sealDate: { type: String, trim: true },
    type: {
      type: String,
    },
    pkgsStuffed: { type: Number, default: 0 }, // 'Pkgs Stuffed'
    grossWeight: { type: Number, default: 0 },
    sealType: {
      type: String,
    },
    grWtPlusTrWt: { type: Number, default: 0 },
    sealDeviceId: String,
    rfid: String, // If needed for RFID field
  },
  { _id: true }
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
  { _id: false }
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
  { _id: true }
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
  { _id: true }
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

  dateTimeOfUpload: { type: Date, default: Date.now },
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
    chargeHead: { type: String, trim: true },
    category: { type: String, trim: true, default: "Margin" },
    costCenter: { type: String, trim: true, default: "CCL EXP" },
    remark: { type: String, trim: true },

    // Revenue Section
    revenue: {
      basis: { type: String, trim: true, default: "Per S/B" },
      qtyUnit: { type: Number, default: 0 },
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      amountINR: { type: Number, default: 0 },
      curr: { type: String, trim: true, default: "INR" },
      ovrd: { type: Boolean, default: false },
      paid: { type: Boolean, default: false },
    },

    // Cost Section
    cost: {
      basis: { type: String, trim: true, default: "Per S/B" },
      qtyUnit: { type: Number, default: 0 },
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      amountINR: { type: Number, default: 0 },
      curr: { type: String, trim: true, default: "INR" },
      ovrd: { type: Boolean, default: false },
      paid: { type: Boolean, default: false },
    },

    // Additional fields from form
    chargeDescription: { type: String, trim: true },
    overrideAutoRate: { type: Boolean, default: false },
    receivableType: { type: String, trim: true, default: "Customer" },
    receivableFrom: { type: String, trim: true },
    receivableFromBranchCode: { type: String, trim: true },
    copyToCost: { type: Boolean, default: false },

    quotationNo: { type: String, trim: true },
  },
  { _id: true }
);

// Milestone Tracking Schema
const milestoneSchema = new Schema(
  {
    milestoneName: { type: String, trim: true },
    planDate: { type: String, trim: true }, // Format: dd-MMM-yyyy HH:mm
    actualDate: { type: String, trim: true }, // Format: dd-MMM-yyyy HH:mm
    isCompleted: { type: Boolean, default: false },
    isMandatory: { type: Boolean, default: false },
    completedBy: { type: String, trim: true },
    remarks: { type: String, trim: true },
  },
  { _id: true }
);

const statusDetailsSchema = new Schema(
  {
    rms: { type: String, trim: true },
    goodsRegistrationDate: { type: String, trim: true },
    leoDate: { type: String, trim: true },
    leoUpload: [String],
    stuffingDate: { type: String, trim: true },
    stuffingSheetUpload: [String],
    stuffingPhotoUpload: [String],
    eGatePassCopyDate: { type: String, trim: true },
    eGatePassUpload: [String],
    handoverForwardingNoteDate: { type: String, trim: true },
    handoverImageUpload: [String],
    handoverConcorTharSanganaRailRoadDate: { type: String, trim: true },
    billingDocsSentDt: { type: String, trim: true },
    billingDocsSentUpload: [String],
    billingDocsStatus: { type: String, trim: true },
    railRoad: { type: String, trim: true },
    concorPrivate: { type: String, trim: true },
    privateTransporterName: { type: String, trim: true },
    hoToConsoleDate: { type: String, trim: true },
    hoToConsoleDate2: { type: String, trim: true },
    hoToConsoleName: { type: String, trim: true },
    containerPlacementDate: { type: String, trim: true },
    railOutReachedDate: { type: String, trim: true },
  },
  { _id: true }
);

// Container/Package Schema for Export - FIXED as proper Mongoose Schema
const exportOperationSchema = new Schema(
  {
    transporterDetails: [
      {
        transporterName: { type: String },
        vehicleNo: { type: String },
        containerNo: { type: String },
        driverName: { type: String },
        contactNo: { type: String },
        noOfPackages: { type: Number },
        netWeightKgs: { type: Number },
        grossWeightKgs: { type: Number },
        images: [String],
        cartingDate: { type: String, trim: true },
        gateInDate: { type: String, trim: true },
      },
    ],

    containerDetails: [
      {
        containerNo: { type: String },
        containerSize: { type: String },
        containerType: { type: String },
        cargoType: { type: String },
        maxGrossWeightKgs: { type: Number },
        tareWeightKgs: { type: Number },
        maxPayloadKgs: { type: Number },
        images: [String],
      },
    ],

    bookingDetails: [
      {
        shippingLineName: { type: String },
        forwarderName: { type: String },
        bookingNo: { type: String },
        bookingDate: { type: String, trim: true },
        vesselName: { type: String },
        voyageNo: { type: String },
        portOfLoading: { type: String },
        handoverLocation: { type: String },
        validity: { type: String },
        images: [String],
      },
    ],

    weighmentDetails: [
      {
        weighBridgeName: { type: String },
        regNo: { type: String },
        dateTime: { type: String, trim: true },
        vehicleNo: { type: String },
        containerNo: { type: String },
        size: { type: String },
        grossWeight: { type: Number },
        tareWeight: { type: Number },
        netWeight: { type: Number },
        address: { type: String },
      },
    ],

    statusDetails: [statusDetailsSchema],
  },
  { _id: true }
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
    // job_no: { type: String, trim: true },
    custom_house: { type: String, trim: true },
    job_date: { type: String, trim: true },
    exporter: { type: String, trim: true },
    description: { type: String, trim: true },
    sb_no: { type: String, trim: true },
    consignmentType: {
      type: String,
      enum: ["FCL", "LCL", "AIR", "Break Bulk"],
    },
    shipping_line_airline: { type: String, trim: true },
    branchSrNo: { type: String, trim: true },
    adCode: { type: String, trim: true },
    bank_name: { type: String, trim: true },
    ieCode: { type: String, trim: true },
    branch_index: { type: String, trim: true },
    exporter_ref_no: { type: String, trim: true },
    shipper: { type: String, trim: true },
    sb_type: { type: String, trim: true },
    transportMode: { type: String, trim: true },
    exporter_type: { type: String, trim: true },

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
    charges: { type: Array, default: [] },
    documents: { type: Object, default: {} },

    status: { type: String, trim: true },

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

    // Freight, Insurance & Other Charges
    freightInsuranceCharges: {
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
    isJobCanceled: { type: Boolean, default: false },
    milestones: [milestoneSchema],
    customerremark: { type: String, trim: true },
    workflowlocation: { type: String, trim: true },
    shipmenttype: { type: String, trim: true },
    milestoneremarks: { type: String, trim: true },
    milestoneviewuploaddocuments: { type: String, trim: true },
    milestonehandledby: { type: String, trim: true },

    // System Fields
    createdBy: { type: String },
    updatedBy: String,
    products: [productDetailsSchema],
    drawbackDetails: [drawbackDetailsSchema],
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
      trim: true,
    },
    masterblno: { type: String, trim: true }, // Master BL Number
    houseblno: { type: String, trim: true }, // House BL Number
    lockedBy: { type: String, trim: true, default: null }, // User who currently has the job open
    lockedAt: { type: Date, default: null }, // Timestamp when the job was locked
  },

  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

exportJobSchema.pre("save", function (next) {
  console.log(
    "🔧 Pre-save: containers:",
    this.containers?.length || 0,
    "operations:",
    this.operations?.length || 0
  );

  // ========================================
  // COLLECT ALL UNIQUE CONTAINER NUMBERS FROM BOTH SOURCES
  // ========================================

  // From containers array
  const containerNosFromContainers = new Set(
    (this.containers || []).map((c) => c.containerNo).filter(Boolean)
  );

  // From operations - CHECK ALL ARRAYS (transporterDetails, containerDetails, weighmentDetails)
  const containerNosFromOperations = new Set();
  (this.operations || []).forEach((op) => {
    // Get from transporterDetails array
    (op.transporterDetails || []).forEach((td) => {
      if (td.containerNo) containerNosFromOperations.add(td.containerNo);
    });
    // Get from containerDetails array
    (op.containerDetails || []).forEach((cd) => {
      if (cd.containerNo) containerNosFromOperations.add(cd.containerNo);
    });
    // Get from weighmentDetails array
    (op.weighmentDetails || []).forEach((wd) => {
      if (wd.containerNo) containerNosFromOperations.add(wd.containerNo);
    });
  });

  // Merge all unique container numbers
  const allContainerNos = new Set([
    ...containerNosFromContainers,
    ...containerNosFromOperations,
  ]);
  console.log(
    `🔍 Found ${allContainerNos.size} unique containers:`,
    Array.from(allContainerNos)
  );

  // ========================================
  // STEP 1: SYNC CONTAINERS ARRAY
  // ========================================
  const existingContainers = this.containers || [];
  const existingContainerMap = new Map(
    existingContainers.map((c) => [c.containerNo, c])
  );

  // Create missing containers from operations
  const syncedContainers = [];
  let serialNum = 1;

  allContainerNos.forEach((containerNo) => {
    if (existingContainerMap.has(containerNo)) {
      // Keep existing container
      const existing = existingContainerMap.get(containerNo);
      existing.serialNumber = serialNum++;
      syncedContainers.push(existing);
      console.log(`✅ Keeping existing container: ${containerNo}`);
    } else {
      // Create new container from operation data
      const opData = this.getOperationDataForContainer(containerNo);
      const newContainer = {
        serialNumber: serialNum++,
        containerNo: containerNo,
        type: opData.containerSize || "",
        pkgsStuffed: opData.noOfPackages || 0,
        grossWeight: opData.grossWeight || 0,
        sealNo: "",
        sealDate: "",
        sealType: "",
        grWtPlusTrWt: 0,
        sealDeviceId: "",
        rfid: "",
      };
      syncedContainers.push(newContainer);
      console.log(`🆕 Created new container: ${containerNo}`);
    }
  });

  this.containers = syncedContainers;
  console.log(`✅ Containers synced: ${this.containers.length} total`);

  // ========================================
  // STEP 2: SYNC OPERATIONS ARRAY
  // ========================================

  // If no operations exist, create one operation with all containers
  if (!this.operations || this.operations.length === 0) {
    console.log(
      `🆕 Creating new operation with ${allContainerNos.size} containers`
    );

    const transporterDetails = [];
    const containerDetails = [];
    const weighmentDetails = [];

    allContainerNos.forEach((containerNo) => {
      const container = syncedContainers.find(
        (c) => c.containerNo === containerNo
      );

      transporterDetails.push({
        containerNo,
        transporterName: "",
        vehicleNo: "",
        driverName: "",
        contactNo: "",
        noOfPackages: 0,
        netWeightKgs: 0,
        grossWeightKgs: container?.grossWeight || 0,
        images: [],
      });

      containerDetails.push({
        containerNo,
        containerSize: container?.type || "",
        containerType: "",
        cargoType: "Gen",
        maxGrossWeightKgs: 0,
        tareWeightKgs: 2250,
        maxPayloadKgs: 28230,
        images: [],
      });

      weighmentDetails.push({
        containerNo,
        weighBridgeName: "",
        regNo: "",
        dateTime: new Date(),
        vehicleNo: "",
        size: container?.type || "",
        grossWeight: container?.grossWeight || 0,
        tareWeight: 0,
        netWeight: 0,
        address: "",
      });

      // We also need to add cartingDate and gateInDate if we're creating new transporters here
      transporterDetails[transporterDetails.length - 1].cartingDate = null;
      transporterDetails[transporterDetails.length - 1].gateInDate = null;
    });

    this.operations = [
      {
        transporterDetails,
        containerDetails,
        weighmentDetails,
        bookingDetails: [
          {
            shippingLineName: "",
            bookingNo: "",
            bookingDate: null,
            vesselName: "",
            voyageNo: "",
            portOfLoading: "",
            handoverLocation: "",
            validity: "",
            images: [],
          },
        ],
        statusDetails: [
          {
            rms: "",
            goodsRegistrationDate: null,
            leoDate: null,
            leoUpload: [],
            stuffingDate: null,
            stuffingSheetUpload: [],
            stuffingPhotoUpload: [],
            eGatePassCopyDate: null,
            eGatePassUpload: [],
            handoverForwardingNoteDate: null,
            handoverImageUpload: [],
            handoverConcorTharSanganaRailRoadDate: null,
            billingDocsSentDt: null,
            billingDocsSentUpload: [],
            billingDocsStatus: "",
            railRoad: "",
            concorPrivate: "",
            privateTransporterName: "",
            hoToConsoleDate: null,
            hoToConsoleDate2: null,
            hoToConsoleName: "",
            containerPlacementDate: null,
          },
        ],
      },
    ];
  } else {
    // Update existing operation(s)
    this.operations.forEach((operation) => {
      // Get existing container numbers in this operation
      const existingOpContainerNos = new Set();
      (operation.transporterDetails || []).forEach((td) => {
        if (td.containerNo) existingOpContainerNos.add(td.containerNo);
      });

      // Find new containers to add
      const newContainerNos = Array.from(allContainerNos).filter(
        (cn) => !existingOpContainerNos.has(cn)
      );

      // Add missing containers to operation
      newContainerNos.forEach((containerNo) => {
        const container = syncedContainers.find(
          (c) => c.containerNo === containerNo
        );
        console.log(`🆕 Adding ${containerNo} to operation`);

        // Add to transporterDetails
        operation.transporterDetails = operation.transporterDetails || [];
        operation.transporterDetails.push({
          containerNo,
          transporterName: "",
          vehicleNo: "",
          driverName: "",
          contactNo: "",
          noOfPackages: 0,
          netWeightKgs: 0,
          grossWeightKgs: container?.grossWeight || 0,
          images: [],
          cartingDate: null,
          gateInDate: null,
        });

        // Add to containerDetails
        operation.containerDetails = operation.containerDetails || [];
        operation.containerDetails.push({
          containerNo,
          containerSize: container?.type || "",
          containerType: "",
          cargoType: "Gen",
          maxGrossWeightKgs: 0,
          tareWeightKgs: 0,
          maxPayloadKgs: 0,
          images: [],
        });

        // Add to weighmentDetails
        operation.weighmentDetails = operation.weighmentDetails || [];
        operation.weighmentDetails.push({
          containerNo,
          weighBridgeName: "",
          regNo: "",
          dateTime: new Date(),
          vehicleNo: "",
          size: container?.type || "",
          grossWeight: container?.grossWeight || 0,
          tareWeight: 0,
          netWeight: 0,
          address: "",
        });
      });

      // ❌ REMOVED PRUNING LOGIC TO PREVENT DATA LOSS
      // We only ADD missing containers, we NEVER remove existing rows here
      // This prevents data loss if a container is renamed or briefly missing from the sync set
      /*
      operation.transporterDetails = (
        operation.transporterDetails || []
      ).filter((td) => allContainerNos.has(td.containerNo));
      operation.containerDetails = (operation.containerDetails || []).filter(
        (cd) => allContainerNos.has(cd.containerNo)
      );
      operation.weighmentDetails = (operation.weighmentDetails || []).filter(
        (wd) => allContainerNos.has(wd.containerNo)
      );
      */
    });
  }

  console.log(
    `✅ Operations synced: ${this.operations.length} operation(s) with ${allContainerNos.size} containers each`
  );

  // ========================================
  // STEP 3: SEAL SYNC
  // ========================================
  if (this.stuffing_seal_no) {
    this.annexC1Details = this.annexC1Details || {};
    this.annexC1Details.sealNumber = this.stuffing_seal_no;
  }

  console.log(
    `✅ Sync complete: ${this.containers.length} containers ↔ ${allContainerNos.size} unique containers in operations`
  );
  next();
});

// Helper method to extract operation data for a container
exportJobSchema.methods.getOperationDataForContainer = function (containerNo) {
  let result = { containerSize: "", grossWeight: 0, noOfPackages: 0 };

  (this.operations || []).forEach((op) => {
    const cd = (op.containerDetails || []).find(
      (c) => c.containerNo === containerNo
    );
    if (cd) {
      result.containerSize = cd.containerSize || result.containerSize;
    }

    const wd = (op.weighmentDetails || []).find(
      (w) => w.containerNo === containerNo
    );
    if (wd) {
      result.grossWeight = wd.grossWeight || result.grossWeight;
    }

    const td = (op.transporterDetails || []).find(
      (t) => t.containerNo === containerNo
    );
    if (td) {
      result.noOfPackages = td.noOfPackages || result.noOfPackages;
      result.grossWeight = td.grossWeightKgs || result.grossWeight;
    }
  });

  return result;
};

// Remove redundant indexes and add compound indexes
exportJobSchema.index({ jobNumber: 1 }, { unique: true });
exportJobSchema.index({ filingMode: 1, status: 1 }); // Compound index
exportJobSchema.index({ jobDate: -1, customHouse: 1 }); // Common query pattern
exportJobSchema.index({ createdAt: -1 }); // For recent jobs
exportJobSchema.index({ "invoices.invoiceNumber": 1 }, { sparse: true });

exportJobSchema.virtual("totalCharges").get(function () {
  return this.charges.reduce(
    (total, charge) => total + charge.revenue.amount,
    0
  );
});

exportJobSchema.virtual("isCompleted").get(function () {
  return this.status === "Completed";
});

// Methods
exportJobSchema.methods.addMilestone = function (
  milestoneName,
  planDate,
  actualDate = null
) {
  this.milestones.push({
    milestoneName,
    planDate,
    actualDate,
    status: actualDate ? "Completed" : "Pending",
  });
  return this.save();
};

exportJobSchema.methods.updateMilestone = function (milestoneName, actualDate) {
  const milestone = this.milestones.find(
    (m) => m.milestoneName === milestoneName
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
