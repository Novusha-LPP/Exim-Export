import mongoose from "mongoose";

const SeaPortSchema = new mongoose.Schema(
  {
    portName: {
      type: String,
      trim: true,
    },
    portCode: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    uneceCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

SeaPortSchema.index({ portName: "text", portCode: "text", country: "text" });
SeaPortSchema.index({ portCode: 1 });

export default mongoose.model("SeaPort", SeaPortSchema);
