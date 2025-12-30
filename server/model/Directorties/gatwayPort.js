import mongoose from "mongoose";

const GatewayPortSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    unece_code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      sparse: true       // allows multiple documents without this field
    },

    port_type: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },
  },
  { timestamps: true }
);



export default mongoose.model("GatewayPort", GatewayPortSchema);
