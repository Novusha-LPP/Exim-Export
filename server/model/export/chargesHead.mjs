import mongoose from "mongoose";

const ChargeHeadSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    category: { type: String },
    chargeType: { type: String, enum: ['Margin', 'Reimbursement'], default: 'Margin' },
    hsnCode: { type: String, trim: true },
    tdsCategory: { type: String, trim: true },
    isPbMandatory: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

ChargeHeadSchema.index({ name: "text" });

ChargeHeadSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

const ChargeHeadModel = mongoose.model("ChargeHead", ChargeHeadSchema);
export default ChargeHeadModel;
