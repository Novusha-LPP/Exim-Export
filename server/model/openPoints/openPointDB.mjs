import mongoose from "mongoose";
import dotenv from "dotenv";
import { userSchema } from "../userModel.mjs";

dotenv.config();

const OPENPOINT_URI = process.env.IMPORT_MONGODB_URI_PROD;

if (!OPENPOINT_URI) {
  console.warn(
    "⚠️ IMPORT_MONGODB_URI_PROD is not defined. OpenPoint connection might fail or fallback."
  );
}

// Create dedicated connection
const openPointConnection = mongoose.createConnection(
  OPENPOINT_URI || process.env.PROD_MONGODB_URI
);

openPointConnection.on("connected", () => {
  console.log(
    "🟢 OpenPoint Database connected to:",
    OPENPOINT_URI?.split("@")[1]?.split("/")[0] || "OpenPoint DB"
  );
});

openPointConnection.on("error", (err) => {
  console.error("❌ OpenPoint Database connection error:", err);
});

// Register User model on this connection to support population
openPointConnection.model("User", userSchema);

export default openPointConnection;
