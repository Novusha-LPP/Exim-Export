import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Schema for individual file objects
const fileSchema = new Schema({
  url: { type: String, required: true },
  name: String,
  size: Number,
  uploadedAt: Date
}, { _id: false });

// Schema for document upload tracking
const documentUploadSchema = new Schema({
  uploaded: { type: Boolean, default: false },
  files: { type: [fileSchema], default: [] }  // Array of file objects, not strings
}, { _id: false });

// Updated KYC Documents schema
const kycDocumentsSchema = new Schema({
  certificateOfIncorporation: { type: documentUploadSchema, default: () => ({}) },
  memorandumOfAssociation: { type: documentUploadSchema, default: () => ({}) },
  articlesOfAssociation: { type: documentUploadSchema, default: () => ({}) },
  powerOfAttorney: { type: documentUploadSchema, default: () => ({}) },
  copyOfPanAllotment: { type: documentUploadSchema, default: () => ({}) },
  copyOfTelephoneBill: { type: documentUploadSchema, default: () => ({}) },
  gstRegistrationCopy: { type: documentUploadSchema, default: () => ({}) },
  balanceSheet: { type: documentUploadSchema, default: () => ({}) }
}, { _id: false });

// Other schemas remain the same...
const addressSchema = new Schema({
  addressLine: { type: String, required: true },
  postalCode: { type: String, required: true },
  telephone: String,
  fax: String,
  email: String
}, { _id: false });

const generalInfoSchema = new Schema({
  entityType: { 
    type: String, 
    required: true,
    enum: ['Company', 'Partnership', 'LLP', 'Proprietorship']
  },
  companyName: { type: String, required: true },
  msmeRegistered: { type: Boolean, default: false }
}, { _id: false });

const registrationDetailsSchema = new Schema({
  binNo: String,
  ieCode: { type: String, required: true },
  panNo: { type: String, required: true },
  gstinMainBranch: String,
  gstinBranchCodeFree: String,
  gstinBranchCode15: String
}, { _id: false });

const branchInfoSchema = new Schema({
  branchCode: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: 'India' }
});

const aeoDetailsSchema = new Schema({
  aeoCode: String,
  aeoCountry: { type: String, default: 'India' },
  aeoRole: String
}, { _id: false });

const billingCurrencySchema = new Schema({
  defaultCurrency: { type: String, default: 'INR' },
  defaultBillTypes: [String]
}, { _id: false });

const authorizedSignatorySchema = new Schema({
  name: String,
  designation: String,
  mobile: String,
  email: String
});

const customHouseSchema = new Schema({
  name: String,
  location: String,
  code: String,
  linkedStatus: { type: String, enum: ['Linked', 'Not Linked'], default: 'Not Linked' }
});

const accountCreditInfoSchema = new Schema({
  creditLimit: { type: Number, default: 0 },
  unlimitedEnabled: { type: Boolean, default: false },
  creditPeriod: { type: Number, default: 0 }
}, { _id: false });

const bankDetailsSchema = new Schema({
  entityName: { type: String, required: true },
  branchLocation: { type: String, required: true },
  accountNumber: { type: String, required: true },
  adCode: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
});

const affiliateBranchSchema = new Schema({
  branchCode: String,
  branchName: String
});

// Main Directory Schema
const directorySchema = new Schema({
  // Organization Information
  organization: { type: String, required: true },
  alias: { type: String, required: true },
  approvalStatus: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  
  // General Information (KYC)
  generalInfo: { type: generalInfoSchema, required: true },
  
  // Address (Principal Place of Business)
  address: { type: addressSchema, required: true },
  
  // Documents (KYC Uploads) - Updated to handle file objects
  kycDocuments: { type: kycDocumentsSchema, default: () => ({}) },
  
  // Registration Details
  registrationDetails: { type: registrationDetailsSchema, required: true },
  
  // Branch Information (Array of branches)
  branchInfo: [branchInfoSchema],
  
  // AEO Details
  aeoDetails: { type: aeoDetailsSchema, default: () => ({}) },
  
  // Billing & Currency
  billingCurrency: { type: billingCurrencySchema, default: () => ({}) },
  
  // Authorized Signatory (Array)
  authorizedSignatory: [authorizedSignatorySchema],
  
  // Custom House (Drawback Bank) (Array)
  customHouse: [customHouseSchema],
  
  // Account & Credit Information
  accountCreditInfo: { type: accountCreditInfoSchema, default: () => ({}) },
  
  // Bank / Dealer Information (Array)
  bankDetails: [bankDetailsSchema],
  
  // Affiliate Branches (Array)
  affiliateBranches: [affiliateBranchSchema],
  
  // Notes
  notes: String,
  
  // History (Audit Trail)
  history: [{
    action: String,
    user: String,
    timestamp: { type: Date, default: Date.now },
    changes: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
directorySchema.index({ organization: 'text', alias: 'text' });
directorySchema.index({ 'registrationDetails.ieCode': 1 });
directorySchema.index({ 'registrationDetails.panNo': 1 });
directorySchema.index({ approvalStatus: 1 });
directorySchema.index({ createdAt: -1 });

// Virtual for entity type display
directorySchema.virtual('entityType').get(function() {
  return this.generalInfo?.entityType;
});

// Virtual for IE Code display
directorySchema.virtual('ieCode').get(function() {
  return this.registrationDetails?.ieCode;
});

export default model('Directory', directorySchema);
