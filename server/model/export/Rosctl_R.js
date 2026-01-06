import mongoose from "mongoose";

const RosctlRSchema = new mongoose.Schema(
  {
    tariff_item: { type: String, index: true },
    description_of_goods: { type: String, trim: true },
    unit: { type: String, trim: true },
    rate: { type: Number },
    cap_per_unit: { type: Number },
    type: { type: String }, // "B" or "D"
    schedule_category: { type: String }, // "SL" or "CTL"
  },
  { timestamps: true, collection: "rosctl_rs" }
);

export default mongoose.model("Rosctl_R", RosctlRSchema);
