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
    pkgsStuffed: { type: Number, default: 0 }, // 'Pkgs Stuffed'
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
    rfid: String, // If needed for RFID field
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
// Charge Schema
const chargeSchema = new Schema(
  {
    isEnabled: { type: Boolean, default: false },
    particulars: { type: String, trim: true },
    buying: { type: Number, default: 0 },
    selling: { type: Number, default: 0 },
    remarks: { type: String, trim: true },
  },
  { _id: true },
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
    stuffingDate: { type: String, trim: true },
    stuffingSheetUpload: [String],
    stuffingPhotoUpload: [String],
    eGatePassCopyDate: { type: String, trim: true },
    eGatePassUpload: [String],
    icdPort: { type: String, trim: true },
    handoverForwardingNoteDate: { type: String, trim: true },
    handoverImageUpload: [String],
    forwarderName: { type: String, trim: true },
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
        transporterName: { type: String },
        vehicleNo: { type: String },
        noOfPackages: { type: Number },
        grossWeightKgs: { type: Number },
        images: [String],
        cartingDate: { type: String, trim: true },
      },
    ],

    containerDetails: [
      {
        containerNo: { type: String },
        shippingLineSealNo: { type: String },
        containerSize: { type: String },
        containerType: { type: String },
        cargoType: { type: String, default: "GEN" },
        portOfLoading: { type: String },
        customSealNo: { type: String },
        grossWeight: { type: Number },
        maxGrossWeightKgs: { type: Number },
        vgmWtInvoice: { type: Number },
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
        emptyPickUpLoc: { type: String },
        emptyDropLoc: { type: String },
        images: [String],
      },
    ],

    weighmentDetails: [
      {
        weighBridgeName: { type: String },
        regNo: { type: String },
        dateTime: { type: String, trim: true },
        vehicleNo: { type: String },
        tareWeight: { type: Number },
        address: { type: String },
        images: [String],
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
    detailedStatus: { type: [String], default: [] },

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
    isJobCanceled: { type: Boolean, default: false },
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


  // CLEANUP: If Dock (FCL or LCL), remove containerNo from all Transporter (Carting) Details
  // This ensures that Carting Details are treated as independent "Gate In" entries for loose goods,
  // not tied 1:1 to the output containers.
  const isDock =
    this.goods_stuffed_at?.toUpperCase() === "DOCK" ||
    this.goods_stuffed_at?.toUpperCase() === "DOCKS";

  if (isDock) {
    (this.operations || []).forEach((op) => {
      (op.transporterDetails || []).forEach((td) => {
        if (td.containerNo) {

          td.containerNo = "";
        }
      });
    });
  }

  // ========================================
  // COLLECT ALL UNIQUE CONTAINER NUMBERS FROM BOTH SOURCES
  // ========================================

  // From containers array
  const containerNosFromContainers = new Set(
    (this.containers || [])
      .map((c) => c.containerNo)
      .filter((c) => c && typeof c === "string" && c.trim().length > 0)
      .map((c) => c.trim().toUpperCase()),
  );

  // From operations - CHECK ALL ARRAYS (transporterDetails, containerDetails, weighmentDetails)
  const containerNosFromOperations = new Set();
  (this.operations || []).forEach((op) => {
    // Get from transporterDetails array
    (op.transporterDetails || []).forEach((td) => {
      if (td.containerNo && td.containerNo.trim().length > 0)
        containerNosFromOperations.add(td.containerNo.trim().toUpperCase());
    });
    // Get from containerDetails array
    (op.containerDetails || []).forEach((cd) => {
      if (cd.containerNo && cd.containerNo.trim().length > 0)
        containerNosFromOperations.add(cd.containerNo.trim().toUpperCase());
    });
    // Get from weighmentDetails array
    (op.weighmentDetails || []).forEach((wd) => {
      if (wd.containerNo && wd.containerNo.trim().length > 0)
        containerNosFromOperations.add(wd.containerNo.trim().toUpperCase());
    });
  });

  // Merge all unique container numbers
  const allContainerNos = new Set([
    ...containerNosFromContainers,
    ...containerNosFromOperations,
  ]);


  // ========================================
  // STEP 1: SYNC CONTAINERS ARRAY
  // ========================================
  const existingContainers = this.containers || [];
  const existingContainerMap = new Map(
    existingContainers.map((c) => [c.containerNo, c]),
  );

  // Create missing containers from operations
  const syncedContainers = [];
  let serialNum = 1;

  allContainerNos.forEach((containerNo) => {
    const opData = this.getOperationDataForContainer(containerNo);

    if (existingContainerMap.has(containerNo)) {
      // Update existing container with operation data
      const existing = existingContainerMap.get(containerNo);
      existing.serialNumber = serialNum++;
      existing.type = opData.containerSize || existing.type || "";
      existing.pkgsStuffed = opData.noOfPackages || existing.pkgsStuffed || 0;
      existing.grossWeight = opData.grossWeight || existing.grossWeight || 0;
      existing.sealNo = opData.customSealNo || existing.sealNo || "";
      existing.shippingLineSealNo = opData.shippingLineSealNo || existing.shippingLineSealNo || "";
      existing.tareWeightKgs = opData.tareWeightKgs || existing.tareWeightKgs || 0;
      existing.vgmWtInvoice = opData.vgmWtInvoice || existing.vgmWtInvoice || 0;
      existing.maxGrossWeightKgs = opData.maxGrossWeightKgs || existing.maxGrossWeightKgs || 0;
      existing.maxPayloadKgs = opData.maxPayloadKgs || existing.maxPayloadKgs || 0;

      syncedContainers.push(existing);
    } else {
      // Create new container from operation data
      const newContainer = {
        serialNumber: serialNum++,
        containerNo: containerNo,
        type: opData.containerSize || "",
        pkgsStuffed: opData.noOfPackages || 0,
        grossWeight: opData.grossWeight || 0,
        sealNo: opData.customSealNo || "",
        shippingLineSealNo: opData.shippingLineSealNo || "",
        tareWeightKgs: opData.tareWeightKgs || 0,
        vgmWtInvoice: opData.vgmWtInvoice || 0,
        maxGrossWeightKgs: opData.maxGrossWeightKgs || 0,
        maxPayloadKgs: opData.maxPayloadKgs || 0,
        sealDate: "",
        sealType: "",
        grWtPlusTrWt: 0,
        sealDeviceId: "",
        rfid: "",
      };
      syncedContainers.push(newContainer);
    }
  });

  this.containers = syncedContainers;


  // ========================================
  // STEP 2: SYNC OPERATIONS ARRAY
  // ========================================

  // If no operations exist, create one operation with all containers
  if (!this.operations || this.operations.length === 0) {


    const transporterDetails = [];
    const containerDetails = [];
    const weighmentDetails = [];

    // IsDock check is already defined above

    allContainerNos.forEach((containerNo) => {
      const container = syncedContainers.find(
        (c) => c.containerNo === containerNo,
      );



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

      // 3. Weighment Details
      // REMOVED: Weighment Details should be fully independent and not tied to the container list.
    });

    // If no weighment rows exist at all, add one empty row to prevent UI issues
    if (weighmentDetails.length === 0) {
      weighmentDetails.push({
        weighBridgeName: "",
        regNo: "",
        dateTime: "",
        vehicleNo: "",
        tareWeight: 0,
        address: "",
      });
    }

    // Ensure at least one empty row exists so the UI isn't broken
    if (transporterDetails.length === 0) {
      transporterDetails.push({
        transporterName: "",
        vehicleNo: "",
        noOfPackages: 0,
        grossWeightKgs: 0,
        images: [],
        cartingDate: null,
      });
    }

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
            emptyPickUpLoc: "",
            emptyDropLoc: "",
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
      // Iterate over ALL valid containers to Upsert (Update or Insert) details
      allContainerNos.forEach((containerNo) => {
        const container = syncedContainers.find(
          (c) => c.containerNo === containerNo,
        );



        // 2. Container Details
        operation.containerDetails = operation.containerDetails || [];
        let cd = operation.containerDetails.find(
          (c) => c.containerNo === containerNo,
        );

        if (!cd) {
          // Insert new
          operation.containerDetails.push({
            containerNo,
            containerSize: container?.type || "",
            containerType: "",
            cargoType: "Gen",
            customSealNo: container?.sealNo || "",
            shippingLineSealNo: container?.shippingLineSealNo || "",
            maxGrossWeightKgs: container?.maxGrossWeightKgs || 0,
            tareWeightKgs: container?.tareWeightKgs || 0,
            maxPayloadKgs: container?.maxPayloadKgs || 0,
            grossWeight: container?.grossWeight || 0,
            vgmWtInvoice: container?.vgmWtInvoice || 0,
            images: [],
          });
        } else {
          // Update existing: Sync values from master list where local is empty or to keep in sync
          if (container) {
            cd.containerSize = container.type || cd.containerSize;
            cd.customSealNo = cd.customSealNo || container.sealNo || "";
            cd.shippingLineSealNo = cd.shippingLineSealNo || container.shippingLineSealNo || "";
            cd.grossWeight = cd.grossWeight || container.grossWeight || 0;
            cd.tareWeightKgs = cd.tareWeightKgs || container.tareWeightKgs || 0;
            cd.vgmWtInvoice = cd.vgmWtInvoice || container.vgmWtInvoice || 0;
            cd.maxGrossWeightKgs = cd.maxGrossWeightKgs || container.maxGrossWeightKgs || 0;
            cd.maxPayloadKgs = cd.maxPayloadKgs || container.maxPayloadKgs || 0;
          }
        }

        // 3. Weighment Details
        // REMOVED: Weighment Details should be fully independent and not tied to the container list.
      });
    });
  }



  // ========================================
  // STEP 3: SEAL SYNC
  // ========================================
  if (this.stuffing_seal_no) {
    this.annexC1Details = this.annexC1Details || {};
    this.annexC1Details.sealNumber = this.stuffing_seal_no;
  }

  next();
});

// Helper method to extract operation data for a container
exportJobSchema.methods.getOperationDataForContainer = function (containerNo) {
  let result = {
    containerSize: "",
    grossWeight: 0,
    noOfPackages: 0,
    customSealNo: "",
    shippingLineSealNo: "",
    tareWeightKgs: 0,
    vgmWtInvoice: 0,
    maxGrossWeightKgs: 0,
    maxPayloadKgs: 0
  };

  (this.operations || []).forEach((op) => {
    const cd = (op.containerDetails || []).find(
      (c) => c.containerNo === containerNo,
    );
    if (cd) {
      result.containerSize = cd.containerSize || result.containerSize;
      result.customSealNo = cd.customSealNo || result.customSealNo;
      result.shippingLineSealNo = cd.shippingLineSealNo || result.shippingLineSealNo;
      result.tareWeightKgs = cd.tareWeightKgs || result.tareWeightKgs;
      result.vgmWtInvoice = cd.vgmWtInvoice || result.vgmWtInvoice;
      result.maxGrossWeightKgs = cd.maxGrossWeightKgs || result.maxGrossWeightKgs;
      result.maxPayloadKgs = cd.maxPayloadKgs || result.maxPayloadKgs;
      result.grossWeight = cd.grossWeight || result.grossWeight;
    }

    const wd = (op.weighmentDetails || []).find(
      (w) => w.containerNo === containerNo,
    );
    if (wd) {
      result.grossWeight = wd.grossWeight || result.grossWeight;
    }

    const td = (op.transporterDetails || []).find(
      (t) => t.containerNo === containerNo,
    );
    if (td) {
      result.noOfPackages = td.noOfPackages || result.noOfPackages;
      // result.grossWeight stays as whatever was higher
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

  // 1. Bi-directional sync between detailedStatus and milestones
  const detailedSet = new Set(this.detailedStatus || []);

  // A. Update detailedStatus based on Milestones (handling unchecks)
  (this.milestones || []).forEach((m) => {
    if (m.milestoneName) {
      if (m.isCompleted) {
        detailedSet.add(m.milestoneName);
      } else {
        detailedSet.delete(m.milestoneName);
      }
    }
  });

  // B. Update Milestones based on detailedStatus (handling unchecks)
  if (this.milestones && this.milestones.length > 0) {
    this.milestones.forEach((m) => {
      if (detailedSet.has(m.milestoneName)) {
        if (!m.isCompleted) {
          m.isCompleted = true;
        }
        // Auto-fill date if missing or still using old placeholder
        if (!m.actualDate || m.actualDate.startsWith("dd-")) {
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
  }

  this.detailedStatus = Array.from(detailedSet);

  // 2. Business Logic: If Billing Done is selected, mark as Completed
  if (this.detailedStatus.includes("Billing Done")) {
    this.status = "Completed";
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