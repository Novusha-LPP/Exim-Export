import mongoose from "mongoose";

const DrawbackSchema = new mongoose.Schema(
  {
    tariff_item: { type: String, trim: true, index: true },
    description_of_goods: { type: String, trim: true },
    unit: { type: String, trim: true },
    drawback_rate: { type: String, trim: true },
    drawback_cap: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Drawback", DrawbackSchema);
