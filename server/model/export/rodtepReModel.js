import mongoose from "mongoose";

const rodtepReSchema = new mongoose.Schema(
  {
    rodtep_entry: {
      type: Number,
      required: true,
    },
    tariff_line: {
      type: String, // Storing as String to preserve potential leading zeros if any, though sample showed Number
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    uqc: {
      type: String,
      required: true,
    },
    rate_percentage_fob: {
      type: Number,
      required: true,
    },
    cap_rs_per_uqc: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Rodtep_RE = mongoose.model("Rodtep_RE", rodtepReSchema);

export default Rodtep_RE;
