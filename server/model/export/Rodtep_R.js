import mongoose from "mongoose";

const RodtepRSchema = new mongoose.Schema(
  {
    chapter: { type: String, trim: true, index: true },
    rodtep_entry: { type: Number },
    tariff_item: { type: mongoose.Schema.Types.Mixed, index: true },
    description_of_goods: { type: String, trim: true },
    uqc: { type: String, trim: true },
    rate_percentage_fob: { type: Number },
    cap_per_uqc: { type: Number },
  },
  { timestamps: true }
);

RodtepRSchema.index({ chapter: 1, tariff_item: 1 });

export default mongoose.model("Rodtep_R", RodtepRSchema, "rodtep_rs");
