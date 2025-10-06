import mongoose from "mongoose";

const Schema = mongoose.Schema;

const importerSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  contact: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  address: {
    type: String,
  },
});

const ImporterModel = mongoose.model("Importer", importerSchema);
export default ImporterModel;
