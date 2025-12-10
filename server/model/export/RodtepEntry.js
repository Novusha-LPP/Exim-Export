import mongoose from "mongoose";

const RodtepEntrySchema = new mongoose.Schema(
  {
    rodtep_entry: { type: String, required: true, trim: true },
    tariff_lines: { type: String, required: true, trim: true },
    description_of_goods_cth: { type: String, required: true, trim: true },
    uqc: { type: String, required: true, trim: true },
    rate_as_percentage_of_fob: { type: String, required: true, trim: true },
    cap: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("RodtepEntry", RodtepEntrySchema);
