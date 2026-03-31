import mongoose from "mongoose";

const purchaseBookEntrySchema = new mongoose.Schema({
    entryNo: { type: String, required: true, unique: true },
    entryDate: { type: String },
    supplierInvNo: { type: String },
    supplierInvDate: { type: String },
    jobNo: { type: String, index: true },
    chargeRef: { type: String, index: true },
    jobRef: { type: String, index: true },
    supplierName: { type: String },
    address1: { type: String },
    address2: { type: String },
    address3: { type: String },
    state: { type: String },
    country: { type: String },
    pinCode: { type: String },
    registrationType: { type: String, default: 'Regular' },
    gstinNo: { type: String, index: true },
    pan: { type: String },
    cin: { type: String },
    placeOfSupply: { type: String },
    creditTerms: { type: String },
    descriptionOfServices: { type: String },
    sac: { type: String },
    taxableValue: { type: Number },
    gstPercent: { type: Number },
    cgstAmt: { type: Number },
    sgstAmt: { type: Number },
    igstAmt: { type: Number },
    tds: { type: Number },
    total: { type: Number },
    status: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });


const PurchaseBookEntryModel = mongoose.model(
    "purchaseBookEntry",
    purchaseBookEntrySchema
);

export default PurchaseBookEntryModel;
