import mongoose from "mongoose";

const DrawbackSchema = new mongoose.Schema(
  {
    chapter: { type: String, trim: true, index: true },
    tariff_item: { type: String, trim: true, index: true },
    description_of_goods: { type: String, trim: true },
    unit: { type: String, trim: true },
    drawback_rate: { type: String, trim: true },
    drawback_cap: { type: String, trim: true },
  },
  { timestamps: true }
);

DrawbackSchema.index({ chapter: 1, tariff_item: 1 });

export default mongoose.model("Drawback", DrawbackSchema);
