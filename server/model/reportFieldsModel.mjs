import mongoose from "mongoose";

const reportFieldsSchema = new mongoose.Schema(
  {
    importer: {
      type: String,
      required: true,
    },
    importerURL: { type: String, trim: true },
    email: { type: String, trim: true },
    senderEmail: { type: String, trim: true },
    time: { type: String, trim: true },
    field: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { collection: "reportFields" }
);

const ReportFieldsModel = new mongoose.model(
  "ReportFields",
  reportFieldsSchema
);
export default ReportFieldsModel;
