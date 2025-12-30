import mongoose from "mongoose";

const rodtepReSchema = new mongoose.Schema(
  {
    rodtep_entry: {
      type: Number,
    },
    tariff_line: {
      type: String, // Storing as String to preserve potential leading zeros if any, though sample showed Number
      index: true,
    },
    description: {
      type: String,
    },
    uqc: {
      type: String,
    },
    rate_percentage_fob: {
      type: Number,
    },
    cap_rs_per_uqc: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Rodtep_RE = mongoose.model("Rodtep_RE", rodtepReSchema);

export default Rodtep_RE;
