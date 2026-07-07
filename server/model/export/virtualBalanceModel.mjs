import mongoose from "mongoose";

const virtualBalanceSchema = new mongoose.Schema({
  referenceNo: { type: String, required: true, unique: true },
  cfsName: { type: String, required: true, uppercase: true, trim: true },
  jobNo: { type: String, uppercase: true, trim: true, index: true },
  partyName: { type: String, uppercase: true, trim: true },
  amountPaid: { type: Number, required: true },
  paymentDate: { type: Date },
  utr: { type: String, trim: true },
  fromBank: { type: String, uppercase: true, trim: true },
  remarks: { type: String, trim: true },
  status: { type: String, enum: ["paid", "unpaid"], default: "unpaid", lowercase: true },
  fileUrl: { type: String, trim: true },
}, { timestamps: true });

const VirtualBalanceModel = mongoose.model("virtualBalance", virtualBalanceSchema);
export default VirtualBalanceModel;
