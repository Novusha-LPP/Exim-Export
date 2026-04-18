import mongoose from "mongoose";

const forwarderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contact_person: { type: String },
    phone: { type: String },
  },
  { timestamps: true }
);

const ForwarderModel = mongoose.model("Forwarder", forwarderSchema);

export default ForwarderModel;
