import mongoose from "mongoose";
import openPointConnection from "./openPointDB.mjs";
const Schema = mongoose.Schema;

const projectSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["Active", "Archived"], default: "Active" },
  team_members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: { type: String, enum: ["L1", "L2", "L3", "L4"] },
      department: { type: String },
    },
  ],
  created_at: { type: Date, default: Date.now },
});

export default openPointConnection.model("OpenPointProject", projectSchema);
