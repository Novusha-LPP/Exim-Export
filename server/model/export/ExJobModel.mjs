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

// Product/Item Details Schema (for multiple products per invoice)
const productDetailsSchema = new Schema(
  {
    serialNumber: { type: String },
    description: { type: String, maxlength: 500 },
    ritc: { type: String, ref: "TariffHead" },
    quantity: { type: String },
    socQuantity: { type: String, default: "0" },
    unitPrice: { type: String },
    per: { type: String, ref: "UQC" },
    amount: { type: String },

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
      currency: { type: String},
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

    // --- Re-Export Details ---
    reExport: {
      isReExport: { type: Boolean, default: false },
      beNumber: { type: String, trim: true },
      beDate: { type: String, trim: true },
      invoiceSerialNo: { type: String, trim: true },
      itemSerialNo: { type: String, trim: true },
      importPortCode: { type: String, trim: true },
      manualBE: { type: Boolean, default: false },
      beItemDescription: { type: String, trim: true },
      quantityExported: { type: Number, default: 0 },
      technicalDetails: { type: String, trim: true },
      inputCreditAvailed: { type: Boolean, default: false },
      personalUseItem: { type: Boolean, default: false },
      otherIdentifyingParameters: { type: String, trim: true },
      againstExportObligation: { type: String, trim: true },
      obligationNo: { type: String, trim: true },
      quantityImported: { type: Number, default: 0 },
      assessableValue: { type: Number, default: 0 },
      totalDutyPaid: { type: Number, default: 0 },
      dutyPaidDate: { type: String, trim: true },
      drawbackAmtClaimed: { type: Number, default: 0 },
      itemUnUsed: { type: Boolean, default: false },
      commissionerPermission: { type: String, trim: true },
      commPermissionDate: { type: String, trim: true },
      boardNumber: { type: String, trim: true },
      modvatAvailed: { type: Boolean, default: false },
      modvatReversed: { type: Boolean, default: false },
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

    cessExpDuty: {
      // ... existing cessExpDuty fields ...
      cessDutyApplicable: { type: Boolean, default: false },
      exportDuty: { type: Number, default: 0 },
      // ... rest of your existing cess code
    },
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
    currency: {
      type: String,
      ref: "Currency",
    },
    invoiceValue: { type: Number, min: 0 },
    productValue: { type: Number, min: 0 },
    taxableValueForIGST: { type: Number, default: 0, min: 0 },
    priceIncludes: {
      type: String,
      enum: ["Both", "Freight Only", "Insurance Only", "Neither"],
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
    currency: { type: String, trim: true},
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
    enum: ["This job only", "All jobs"],
    default: "This job only",
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
    addressLine1: String,
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

// Exchange Rates Schema
const exchangeRateSchema = new Schema(
  {
    currencyCode: { type: String, ref: "Currency" },
    customExchangeRate: { type: Number },
    nonStdCurrency: { type: Boolean, default: false },

    // Different exchange rates for different purposes
    revenue: {
      exchangeRate: Number,
      cfx: Number,
    },
    cost: {
      exchangeRate: Number,
      cfx: Number,
    },
    agentExchangeRate: Number,

    // Bank details for exchange rate
    bankDetails: { type: Boolean, default: false },
    rateDate: Date,
  },
  { _id: false }
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

// Charges Schema for Export
const exportChargesSchema = new mongoose.Schema({
  charge_type: { type: String, trim: true }, // freight, insurance, handling, etc.

  charge_description: { type: String, trim: true },
  amount: { type: String, trim: true },
  currency: { type: String, trim: true },
  payment_terms: { type: String, trim: true },
  invoice_number: { type: String, trim: true },
  invoice_date: { type: String, trim: true },
  payment_status: { type: String, trim: true },
  payment_date: { type: String, trim: true },
  document_urls: [{ type: String, trim: true }],
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

    ////////////////////////////////////////////////// Basic Job Information

    submission_status: {
      type: String,
      enum: ["draft", "submitted", "under_review", "approved", "rejected"],
      default: "draft",
    },
    submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    admin_approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    admin_approved_date_time: { type: Date },
    admin_remark: { type: String, trim: true },

    submission_status_history: [
      {
        status: { type: String },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        date_time: { type: Date },
      },
    ],

  

    ////////////////////////////////////////////////// Excel sheet
    year: { type: String, trim: true },
    // job_no: { type: String, trim: true },
    custom_house: { type: String, trim: true },
    job_date: { type: String, trim: true },
    exporter: { type: String, trim: true },
    supplier_exporter: { type: String, trim: true },
    invoice_number: { type: String, trim: true },
    invoice_date: { type: String, trim: true },
    description: { type: String, trim: true },
    sb_no: { type: String, trim: true },
    no_of_pkgs: { type: String, trim: true },
    unit: { type: String, trim: true },
    shipping_line_airline: { type: String, trim: true },
    branchSrNo: { type: String, trim: true },
    adCode: { type: String, trim: true },
    bank_name: { type: String, trim: true },
    isDraftDoc: { type: Boolean },
    fta_Benefit_date_time: { type: String, trim: true },
    exBondValue: { type: String, trim: true },
    scheme: { type: String, trim: true },
    clearanceValue: { type: String, trim: true },
    ie_code_no: { type: String, trim: true },
    incoterms: {
      type: String,
      trim: true,
      default: "FOB",
      enum: ["FOB", "CIF", "CFR", "EXW", "DDP", "DDU", "FCA", "CPT", "CIP"],
    },
    exporter_ref_no: { type: String, trim: true },
    filing_mode: { type: String, trim: true },
    shipper: { type: String, trim: true },
    job_received_on: { type: Date },
    sb_type: { type: String, trim: true },
    transportMode: { type: String, trim: true },
    exporter_type: { type: String, trim: true },

    // Exporter Additional Fields (Missing)
    branch_code: { type: String, trim: true },
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
    epz_code: { type: String, trim: true },
    notify: { type: String, trim: true },

    // Additional Banking Fields (Missing)
    bank_branch: { type: String, trim: true },
    bank_ifsc_code: { type: String, trim: true },
    bank_swift_code: { type: String, trim: true },

    // Commercial Fields (Missing)
    currency: { type: String, trim: true },
    terms_of_invoice: { type: String, trim: true },
    product_value_usd: { type: String, trim: true },

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
    total_no_of_pkgs: { type: String, trim: true },
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

    // Job Management Fields (Missing)
    movement_type: { type: String, trim: true },
    // Port & Delivery Fields (Missing)
    place_of_delivery: { type: String, trim: true },
    country_of_final_destination: { type: String, trim: true },

    // Cargo Dimension Fields (Missing)
    dimensions_length: { type: String, trim: true },
    dimensions_width: { type: String, trim: true },
    dimensions_height: { type: String, trim: true },

    // Proforma Invoice Fields (Missing)
    proforma_invoice_number: { type: String, trim: true },
    proforma_invoice_date: { type: String, trim: true },
    proforma_invoice_value: { type: String, trim: true },

    // Boolean Control Fields (Missing)
    buyer_other_than_consignee: { type: Boolean, default: false },

    // Assignment Fields (Missing)
    assigned_documentation_executive: { type: String, trim: true },
    assigned_operations_executive: { type: String, trim: true },
    assigned_accounts_executive: { type: String, trim: true },

    // Ensure these arrays exist (some might be missing)
    // products: { type: Array, default: [] },
    charges: { type: Array, default: [] },
    documents: { type: Object, default: {} },
    priority_level: {
      type: String,
      trim: true,
      default: "Normal",
      enum: ["High", "Normal", "Low", "Urgent"],
    },
    status: { type: String, trim: true },
    detailed_status: { type: String, trim: true },

    // Additional tracking fields for your export schema
    container_placement_date_factory: { type: String, trim: true },
    original_docs_received_date: { type: String, trim: true },
    gate_in_thar_khodiyar_date: { type: String, trim: true },
    gate_in_thar_khodiyar_time: { type: String, trim: true },
    hand_over_date: { type: String, trim: true },
    file_hand_over_date: { type: String, trim: true },
    rail_out_date_plan: { type: String, trim: true },
    rail_out_date_actual: { type: String, trim: true },
    port_gate_in_date: { type: String, trim: true },
    cargo_arrived_icd_date: { type: String, trim: true },
    customs_clearance_done: { type: Boolean, default: false },
    cntr_size: {
      type: String,
      trim: true,
      enum: ["20", "40", "20HC", "40HC", "AIR"],
    },
    port_of_origin: { type: String, trim: true },
    docs_received_date: { type: String, trim: true },
    tracking_remarks: { type: String, trim: true },
    operation_remarks: { type: String, trim: true },

    ////////////////////////////////////////////////// Exporter Information
    exporter_name: { type: String, trim: true },
    exporter_address: { type: String, trim: true },
    exporter_city: { type: String, trim: true },
    exporter_state: { type: String, trim: true },
    exporter_country: { type: String, trim: true, default: "India" },
    exporter_pincode: { type: String, trim: true },
    exporter_phone: { type: String, trim: true },
    exporter_email: { type: String, trim: true },
    exporter_fax: { type: String, trim: true },
    exporter_website: { type: String, trim: true },

    // Regulatory Information
    ie_code: { type: String, trim: true }, // Import Export Code
    exporter_pan: { type: String, trim: true },
    exporter_gstin: { type: String, trim: true },
    exporter_tan: { type: String, trim: true },
    ad_code: { type: String, trim: true }, // Authorized Dealer Code
    rcmc_number: { type: String, trim: true }, // Registration Cum Membership Certificate
    rcmc_validity: { type: String, trim: true },

    // Banking Information - Removed duplicate bank_name
    bank_branch: { type: String, trim: true },
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
    country_of_origin: { type: String, trim: true, default: "India" },
    country_of_final_destination: { type: String, trim: true },

    // Vessel/Flight Information
    vessel_flight_name: { type: String, trim: true },
    voyage_flight_number: { type: String, trim: true },
    etd_port_of_loading: { type: String, trim: true }, // Estimated Time of Departure
    eta_port_of_discharge: { type: String, trim: true }, // Estimated Time of Arrival
    actual_departure_date: { type: String, trim: true },
    actual_arrival_date: { type: String, trim: true },

    // Carrier Information - Removed duplicate shipping_line_airline
    master_bl_awb_number: { type: String, trim: true },
    master_bl_awb_date: { type: String, trim: true },
    house_bl_awb_number: { type: String, trim: true },
    house_bl_awb_date: { type: String, trim: true },

    ////////////////////////////////////////////////// Cargo Information
    commodity_description: { type: String, trim: true },
    hs_code: { type: String, trim: true },
    package_unit: { type: String, trim: true },
    gross_weight_kg: { type: String, trim: true },
    gross_weight_unit: { type: String, trim: true },
    net_weight_kg: { type: String, trim: true },
    net_weight_unit: { type: String, trim: true },
    volume_cbm: { type: String, trim: true },
    volume_unit: { type: String, trim: true },
    chargeable_weight: { type: String, trim: true },
    chargeable_weight_unit: { type: String, trim: true },

    dimensions_length: { type: String, trim: true },
    dimensions_width: { type: String, trim: true },
    dimensions_height: { type: String, trim: true },
    marks_and_numbers: { type: String, trim: true },
    special_instructions: { type: String, trim: true },

    // Dangerous Goods Information
    is_dangerous_goods: { type: Boolean, default: false },
    un_number: { type: String, trim: true },
    proper_shipping_name: { type: String, trim: true },
    hazard_class: { type: String, trim: true },
    packing_group: { type: String, trim: true },

    ////////////////////////////////////////////////// Commercial Information
    // Invoice Details
    proforma_invoice_number: { type: String, trim: true },
    proforma_invoice_date: { type: String, trim: true },
    proforma_invoice_value: { type: String, trim: true },
    commercial_invoice_number: { type: String, trim: true },
    commercial_invoice_date: { type: String, trim: true },
    commercial_invoice_value: { type: String, trim: true },
    invoice_currency: { type: String, trim: true},
    exchange_rate: { type: String, trim: true },
    fob_value: { type: String, trim: true },
    freight_charges: { type: String, trim: true },
    insurance_charges: { type: String, trim: true },
    cif_value: { type: String, trim: true },

    ////////////////////////////////////////////////// Containers Information
    // Note: exportContainerSchema needs to be defined separately
    containers: [exportContainerSchema],
    // Removed duplicate container_count
    stuffing_date: { type: String, trim: true },
    stuffing_supervisor: { type: String, trim: true },
    stuffing_remarks: { type: String, trim: true },
    cfs: { type: String, trim: true },

    // Annex C1 Details



    ////////////////////////////////////////////////// Regulatory Compliance

    ////////////////////////////////////////////////// Charges and Financial
    // Note: exportChargesSchema needs to be defined separately
    export_charges: [exportChargesSchema],

    ////////////////////////////////////////////////// Additional Information
    remarks: { type: String, trim: true },

    // Job Assignment
    job_owner: { type: String, trim: true },

    job_no: {
      type: String,
      unique: true,
      uppercase: true,
    },
    sbNo: String, // Shipping Bill Number

    // Filing Information
    filingMode: {
      type: String,
      ref: "Directory", // Reference to exporter company
    },
    customHouse: {
      type: String,
      ref: "EDILocation",
    },
    loadingPort: {
      type: String,
      ref: "Port",
    },
    sbType: {
      type: String,
      enum: ["Green - Drawback", "Yellow", "Red", "Blue"],
      default: "Green - Drawback",
    },
    consignmentType: {
      type: String,
      enum: ["FCL", "LCL", "Break Bulk"],
      default: "FCL",
    },
    jobOwner: String, // User who created the job

    // Job Status and Tracking
    // Add proper validations
    jobStatus: {
      type: String,
      enum: {
        values: ["Draft", "In Progress", "Filed", "Completed", "Cancelled"],
        message: "{VALUE} is not a valid job status",
      },
      default: "Draft",
      index: true,
    },

    // Add string length limits
    remarks: {
      type: String,
      trim: true,
      maxlength: [1000, "Remarks cannot exceed 1000 characters"],
    },
    jobTrackingCompleted: { type: Boolean, default: false },
    jobCompletedDate: Date,
    customerRemark: String,

    // Workflow Information
    workflow: {
      location: {
        type: String,
        enum: ["All Locations", "Mumbai", "Delhi", "Chennai", "Kolkata"],
        default: "All Locations",
      },
      shipmentType: {
        type: String,
        enum: ["Domestic", "International"],
        default: "International",
      },
    },

    // Multiple Invoices
    invoices: [invoiceSchema],

    // Container Details
    containers: [containerDetailsSchema],

    // Buyer and Third Party Information
    buyerThirdPartyInfo: buyerThirdPartySchema,

    // Export Bond Details
    exportBondDetails: {
      qCertNoDate: String,
      typeOfShipment: {
        type: String,
        enum: ["Outright Sale", "Consignment", "Free Sample", "Replacement"],
        default: "Outright Sale",
      },
      specifyIfOther: String,
      permissionNoDate: String,
      exportUnder: {
        type: String,
        enum: ["EPCG", "Advance License", "DFRC", "Other"],
        default: "Other",
      },
      sbHeading: String,
      textToBePrintedOnSB: String,
      exportTradeControl: String,
    },

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

    // DOC Info (Deemed Export/Special Economic Zone)
    docInfo: {
      eximCode: {
        type: String,
        enum: ["19 : Drawback (DBK)", "Other"],
        default: "19 : Drawback (DBK)",
      },
      nfeiCategory: String,
      rewardItem: { type: Boolean, default: false },
      strCode: String,
      endUse: String,
      ptaFtaInfo: String,
      originDistrict: String,
      originState: { type: String, ref: "State" },
      alternateQty: Number,
      materialCode: String,
      medicinalPlant: String,
      formulation: String,
      surfaceMaterialInContact: String,
      labGrownDiamond: String,
    },

    // PMV Info (Price Market Value)
    pmvInfo: {
      currency: { type: String, ref: "Currency"},
      calculationMethod: {
        type: String,
        enum: ["%age", "Fixed Amount"],
        default: "%age",
      },
      pmvPerUnit: { type: Number, default: 211141.22 },
      totalPMV: { type: Number, default: 523841.37 },
    },

    // IGST & Compensation Cess Info
    igstCompensationInfo: {
      igstPaymentStatus: {
        type: String,
        enum: ["Export Against Payment", "LUT", "Bond"],
        default: "Export Against Payment",
      },
      taxableValueINR: { type: Number, default: 476500.85 },
      igstRate: { type: Number, default: 18.0 },
      igstAmountINR: { type: Number, default: 85770.96 },
      compensationCessRate: { type: Number, default: 0.0 },
      compensationCessAmountINR: { type: Number, default: 0.0 },
    },

    // RODTEP Info (Remission of Duties and Taxes on Exported Products)
    rodtepInfo: {
      rodtepClaim: {
        type: String,
        enum: ["Not Applicable", "Applicable"],
        default: "Not Applicable",
      },
      quantity: { type: Number, default: 0.0 },
      rateInPercentage: { type: Number, default: 0.0 },
      capValue: { type: Number, default: 0.0 },
      capValuePerUnits: { type: Number, default: 1 },
      rodtepAmountINR: { type: Number, default: 0.0 },
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
        exchangeRate: { type: Number, default: 87.3 },
        rate: { type: Number, default: 0.0 },
        baseValue: { type: Number, default: 63883.17 },
        amount: { type: Number, default: 30.0 },
      },
      insurance: {
        currency: { type: String, ref: "Currency" },
        exchangeRate: { type: Number, default: 87.3 },
        rate: { type: Number, default: 0.0 },
        baseValue: { type: Number, default: 63883.17 },
        amount: { type: Number, default: 7.73 },
      },
      discount: {
        currency: { type: String, ref: "Currency" },
        exchangeRate: { type: Number, default: 87.3 },
        rate: { type: Number, default: 0.0 },
        amount: { type: Number, default: 0.0 },
      },
      otherDeduction: {
        currency: { type: String, ref: "Currency"},
        exchangeRate: { type: Number, default: 87.3 },
        rate: { type: Number, default: 0.0 },
        amount: { type: Number, default: 0.0 },
      },
      commission: {
        currency: { type: String, ref: "Currency" },
        exchangeRate: { type: Number, default: 87.3 },
        rate: { type: Number, default: 0.0 },
        amount: { type: Number, default: 0.0 },
      },
      fobValue: {
        currency: { type: String, ref: "Currency" },
        amount: { type: Number, default: 63845.44 },
      },
    },

    // Exchange Rates
    exchangeRates: [exchangeRateSchema],

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

    apInvoices: [
      {
        date: Date,
        billNo: String,
        type: String,
        organization: { type: String, ref: "Directory" },
        currency: { type: String, ref: "Currency" },
        amount: Number,
        balance: Number,
      },
    ],

    // Document Management

    // eSanchit Documents
    eSanchitDocuments: [eSanchitDocumentSchema],

    // Milestone Tracking
    milestones: [milestoneSchema],
    job_tracking_completed: { type: String, trim: true }, // "16-Sep-2025"
    customer_remark: { type: String, trim: true, default: "Ready for Billing" },
    workflow_location: { type: String, trim: true, default: "All Locations" },
    shipment_type: { type: String, trim: true, default: "International" },
    milestones: [milestoneSchema],
    milestone_remarks: { type: String, trim: true },
    milestone_view_upload_documents: { type: String, trim: true },
    milestone_handled_by: { type: String, trim: true },

    // System Fields
    createdBy: { type: String },
    updatedBy: String,

    // History/Audit Trail
    history: [
      {
        action: String,
        user: String,
        timestamp: { type: Date, default: Date.now },
        changes: Schema.Types.Mixed,
        remarks: String,
      },
    ],
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
    ap_last_updated: { type: Date },
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
    rbi_waiver_date: { type: String, trim: true }, // RBI Waiver Date (number already exists)
    rotation_no: { type: String, trim: true }, // Rotation Number
    rotation_date: { type: String, trim: true }, // Rotation Date
    nature_of_contract: { type: String, trim: true }, // Nature of Contract
    str_amount_inr: { type: String, trim: true }, // STR Amount in INR (strCode already exists)
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
