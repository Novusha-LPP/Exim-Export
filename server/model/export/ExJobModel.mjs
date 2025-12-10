import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Sub-schemas for complex nested data
const areDetailsSchema = new Schema(
  {
    serialNumber: { type: Number },
    areNumber: { type: String, trim: true },
    areDate: { type: Date }, // use String if you prefer
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
        licDate: { type: Date },
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
        licDate: { type: Date },
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
    unitPrice: { type: String },
    priceUnit: { type: String },
    per: { type: String, ref: "UQC" },
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
    dbkUnder: {
      type: String,
      enum: ["Actual", "Provisional"],
      default: "Actual",
    },
    dbkDescription: { type: String, maxlength: 500 },
    dbkRate: { type: Number, default: 1.5, min: 0 },
    dbkCap: { type: Number, default: 0, min: 0 },
    dbkAmount: { type: Number, default: 0, min: 0 },
    percentageOfFobValue: { type: String, default: "1.5% of FOB Value" },
  },
  { _id: true }
);

// Invoice Schema (multiple invoices per job)
const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String },
    invoiceDate: { type: Date },
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
    // packingFOB: { type: Number, default: 0, min: 0 },
    invoice_value: { type: Number, default: 0 },
    product_value_fob: { type: Number, default: 0 },
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
    sealDate: Date,
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
  dateOfIssue: Date,
  placeOfIssue: String,
  expiryDate: Date,
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

// Container/Package Schema for Export
const exportContainerSchema = new mongoose.Schema({
  container_number: { type: String, trim: true },
  container_type: { type: String, trim: true }, // FCL, LCL
  container_size: { type: String, trim: true }, // 20ft, 40ft, 40HC
  seal_number: { type: String, trim: true },
  stuffing_date: { type: String, trim: true },
  stuffing_location: { type: String, trim: true },
  gross_weight: { type: String, trim: true },
  net_weight: { type: String, trim: true },
  tare_weight: { type: String, trim: true },
  volume: { type: String, trim: true },
  packages_count: { type: String, trim: true },
  package_type: { type: String, trim: true }, // Cartons, Pallets, Bags, etc.
  marks_and_numbers: { type: String, trim: true },
  container_images: [{ type: String, trim: true }],
  stuffing_images: [{ type: String, trim: true }],
  seal_images: [{ type: String, trim: true }],
  weighment_slip: [{ type: String, trim: true }],
  vgm_certificate: [{ type: String, trim: true }], // Verified Gross Mass
  vgm_date: { type: String, trim: true },
  gate_in_date: { type: String, trim: true },
  gate_out_date: { type: String, trim: true },
  loading_date: { type: String, trim: true },
  departure_date: { type: String, trim: true },
});

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
      enum: ["FCL", "LCL", "Break Bulk"],
    },
    shipping_line_airline: { type: String, trim: true },
    branchSrNo: { type: String, trim: true },
    adCode: { type: String, trim: true },
    bank_name: { type: String, trim: true },
    ie_code_no: { type: String, trim: true },
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

    vessel_sailing_date: { type: String, trim: true },
    voyage_no: { type: String, trim: true },
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
    ie_code: { type: String, trim: true }, // Import Export Code
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
    containers: [exportContainerSchema],

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
      exportContractNoDate: String,
      natureOfPayment: {
        type: String,
        enum: [
          "Letter Of Credit",
          "Advance Payment",
          "Open Account",
          "Consignment",
        ],
        default: "Letter Of Credit",
      },
      paymentPeriod: { type: Number, default: 0 }, // in days

      // AEO Details (use from directory if available)
      aeoCode: String,
      aeoCountry: { type: String, ref: "Country", default: "IN" },
      aeoRole: String,
    },

    annexC1Details: {
      ieCodeOfEOU: {
        type: String,
        trim: true,
      },
      branchSerialNo: {
        type: Number,
        default: 0,
      },
      examinationDate: Date,
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
            required: true,
          },
          documentName: {
            type: String,
            required: true,
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
    milestones: [milestoneSchema],

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
      default: "ABOFS1766LCH005 SURAJ FORWARDERS & SHIPPING AGENCIES",
    },
    masterblno: { type: String, trim: true }, // Master BL Number
    houseblno: { type: String, trim: true }, // House BL Number
  },

  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
// Remove redundant indexes and add compound indexes
exportJobSchema.index({ jobNumber: 1 }, { unique: true });
exportJobSchema.index({ filingMode: 1, jobStatus: 1 }); // Compound index
exportJobSchema.index({ jobDate: -1, customHouse: 1 }); // Common query pattern
exportJobSchema.index({ createdAt: -1 }); // For recent jobs
exportJobSchema.index({ "invoices.invoiceNumber": 1 }, { sparse: true });

// Virtual fields
exportJobSchema.virtual("totalInvoiceValue").get(function () {
  return this.invoices.reduce(
    (total, invoice) => total + invoice.invoiceValue,
    0
  );
});

exportJobSchema.virtual("totalCharges").get(function () {
  return this.charges.reduce(
    (total, charge) => total + charge.revenue.amount,
    0
  );
});

exportJobSchema.virtual("isCompleted").get(function () {
  return this.jobStatus === "Completed";
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
  return this.find({ jobStatus: status });
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
