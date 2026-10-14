import mongoose from "mongoose";
import { containerDetailsSchema } from "../schemas/containerSchemas.mjs";

const { Schema, model } = mongoose;

const exContainerSchema = new Schema(
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
    ...containerDetailsSchema.obj,
  },
  {
    timestamps: true,
    collection: "ex_containers",
  }
);

exContainerSchema.index({ job_no: 1, containerNo: 1 });

export const ExContainer =
  mongoose.models.ExContainer || model("ExContainer", exContainerSchema);

export default ExContainer;
