import mongoose from "mongoose";
import { exportOperationSchema } from "../schemas/operationSchemas.mjs";

const { Schema, model } = mongoose;

const exOperationSchema = new Schema(
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
    ...exportOperationSchema.obj,
  },
  {
    timestamps: true,
    collection: "ex_operations",
  }
);

exOperationSchema.index({ job_no: 1 });

export const ExOperation =
  mongoose.models.ExOperation || model("ExOperation", exOperationSchema);

export default ExOperation;
