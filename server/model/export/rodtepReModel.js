import mongoose from "mongoose";

const rodtepReSchema = new mongoose.Schema(
  {
    chapter: { type: String, trim: true, index: true },
    rodtep_entry: { type: Number },
    tariff_item: {
      type: mongoose.Schema.Types.Mixed,
      index: true,
    },
    description_of_goods: { type: String, trim: true },
    uqc: { type: String, trim: true },
    rate_percentage_fob: { type: Number },
    cap_per_uqc: { type: Number },
  },
  {
    timestamps: true,
  }
);

rodtepReSchema.index({ chapter: 1, tariff_item: 1 });

const Rodtep_RE = mongoose.model("Rodtep_RE", rodtepReSchema, "rodtep_res");

export default Rodtep_RE;
