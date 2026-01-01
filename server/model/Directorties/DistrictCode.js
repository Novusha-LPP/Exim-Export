// model/Directories/DistrictCode.js
import mongoose from "mongoose";

const DistrictCodeSchema = new mongoose.Schema(
  {
    stateCode: {
      type: String,
      trim: true,
      maxlength: 3, // matches ICES Annexure A style state codes [attached_file:47]
    },
    districtCode: {
      type: String,
      trim: true,
      maxlength: 4, // ICES uses 1–3 digit + some extended like 620, 701 etc. [attached_file:47]
      unique: true,
    },
    districtName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("DistrictCode", DistrictCodeSchema);
