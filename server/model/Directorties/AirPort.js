import mongoose from "mongoose";

const AirPortSchema = new mongoose.Schema(
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
    portDetails: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

AirPortSchema.index({ portName: "text", portCode: "text", country: "text" });
AirPortSchema.index({ portCode: 1 });

export default mongoose.model("AirPort", AirPortSchema);
