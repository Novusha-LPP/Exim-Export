import mongoose from "mongoose";

const paymentRequestSchema = new mongoose.Schema({
    requestNo: { type: String, required: true, unique: true },
    requestDate: { type: String },
    jobNo: { type: String, index: true },
    chargeRef: { type: String, index: true },
    jobRef: { type: String, index: true },
    bankFrom: { type: String },
    paymentTo: { type: String, index: true },
    againstBill: { type: String },
    amount: { type: Number },
    transactionType: { type: String, default: 'NEFT' },
    accountNo: { type: String },
    ifscCode: { type: String },
    bankName: { type: String },
    instrumentNo: { type: String },
    instrumentDate: { type: String },
    transferMode: { type: String, default: 'Online' },
    beneficiaryCode: { type: String },
    status: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }

}, { timestamps: true });

const PaymentRequestModel = mongoose.model(
    "paymentRequest",
    paymentRequestSchema
);

export default PaymentRequestModel;
