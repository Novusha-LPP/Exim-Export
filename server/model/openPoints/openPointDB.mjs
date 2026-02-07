import mongoose from "mongoose";
import dotenv from "dotenv";
import { userSchema } from "../userModel.mjs";

dotenv.config();

// Create a separate connection for OpenPoint database
const OPENPOINT_URI = (() => {
  if (process.env.NODE_ENV === "production")
    return process.env.IMPORT_MONGODB_URI_PROD
  if (process.env.NODE_ENV === "server")
    return process.env.IMPORT_MONGODB_URI_SERVER
  return process.env.IMPORT_MONGODB_URI_DEV
})();

if (!OPENPOINT_URI) {
  console.warn(
    "⚠️ OPENPOINT_URI is not defined. OpenPoint connection might fail."
  );
}

// Create dedicated connection
const actualOpenPointUri = OPENPOINT_URI;
const openPointConnection = mongoose.createConnection(actualOpenPointUri);

openPointConnection.on("connected", () => {
  // Extract database host from URI for logging
  let dbHost = "OpenPoint DB";
  try {
    if (actualOpenPointUri) {
      if (actualOpenPointUri.includes("@")) {
        // Format: mongodb+srv://user:pass@cluster.mongodb.net/db or mongodb://user:pass@host:port/db
        const afterAt = actualOpenPointUri.split("@")[1];
        if (afterAt) {
          dbHost = afterAt.split("/")[0].split("?")[0];
        }
      } else {
        // Format: mongodb://localhost:27017/dbname (no auth)
        const match = actualOpenPointUri.match(/mongodb:\/\/([^\/]+)/);
        if (match) {
          dbHost = match[1];
        }
      }
    }
  } catch (e) {
    // Fallback to default
  }
  console.log("🟢 OpenPoint Database connected to:", dbHost);
});

openPointConnection.on("error", (err) => {
  console.error("❌ OpenPoint Database connection error:", err);
});

// Register User model on this connection to support population
openPointConnection.model("User", userSchema);

export default openPointConnection;
