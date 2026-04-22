import mongoose from "mongoose";

const freightEnquirySchema = new mongoose.Schema(
  {
    enquiry_no: { type: String, unique: true, required: true },
    enquiry_date: { type: String, required: true },
    organization_name: { type: String, required: true },
    shipment_type: { type: String, enum: ["Import-Sea", "Export-Sea", "Import-Air", "Export-Air"], required: true },
    container_size: { type: String },
    consignment_type: { type: String, enum: ["LCL", "FCL", "AIR", ""] },
    goods_stuffed: { type: String, enum: ["FACTORY STUFFED", "DOCK STUFFED", ""] },
    port_of_loading: { type: String, required: true },
    port_of_destination: { type: String },
    contact_no: { type: String },
    email: { type: String },
    net_weight: { type: String },
    gross_weight: { type: String },
    dimension: { type: String },
    no_packages: { type: String },
    remarks: { type: String },
    source_job_no: { type: String },
    status: { type: String, default: "Open" },
    received_rates: [
      {
        forwarder_name: String,
        forwarder_email: String,
        base_rates: [
          {
            charge_name: String,
            amount: Number,
          }
        ],
        shipping_line_rates: [
           {
            charge_name: String,
            amount: Number,
           }
        ],
        total: Number,
        created_at: { type: Date, default: Date.now },
      }
    ],
    selected_rate_index: { type: Number, default: -1 },
    charges: { type: Array, default: [] },
  },
  { timestamps: true }
);

const FreightEnquiryModel = mongoose.model("FreightEnquiry", freightEnquirySchema);

export default FreightEnquiryModel;
