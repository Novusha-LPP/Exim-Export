import mongoose from "mongoose";

const { Schema, model } = mongoose;

const licenseSchema = new Schema(
  {
    Owner: { type: String },
    lic_ref_no: { type: String, index: true },
    lic_no: { type: String },
    lic_date: { type: String },
    Type: { type: String },
  },
  {
    timestamps: true,
  }
);

// Index for search
licenseSchema.index({ lic_ref_no: 1 });
licenseSchema.index({ lic_no: 1 });

export default model("License", licenseSchema);
