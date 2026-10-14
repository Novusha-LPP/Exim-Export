import mongoose from "mongoose";
import { invoiceSchema } from "../schemas/invoiceSchemas.mjs";

const { Schema, model } = mongoose;

const exInvoiceSchema = new Schema(
  {
    job_no: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    job_id: {
      type: Schema.Types.ObjectId,
      ref: "ExportJob",
      index: true,
    },
    ...invoiceSchema.obj,
  },
  {
    timestamps: true,
    collection: "ex_invoices",
  }
);

exInvoiceSchema.index({ job_no: 1, invoiceNumber: 1 });

export const ExInvoice =
  mongoose.models.ExInvoice || model("ExInvoice", exInvoiceSchema);

export default ExInvoice;
