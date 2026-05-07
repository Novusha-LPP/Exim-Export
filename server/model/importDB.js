import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const IMPORT_DB_URI = (() => {
  if (process.env.NODE_ENV === "production")
    return process.env.IMPORT_MONGODB_URI_PROD;
  if (process.env.NODE_ENV === "server")
    return process.env.IMPORT_MONGODB_URI_SERVER;
  return process.env.IMPORT_MONGODB_URI_PROD;
})();

if (!IMPORT_DB_URI) {
  console.warn(
    "⚠️ IMPORT_DB_URI is not defined. Import DB connection might fail."
  );
}

const importDbConnection = mongoose.createConnection(IMPORT_DB_URI);

importDbConnection.on("connected", () => {
  let dbHost = "Import DB";
  try {
    if (IMPORT_DB_URI) {
      if (IMPORT_DB_URI.includes("@")) {
        const afterAt = IMPORT_DB_URI.split("@")[1];
        if (afterAt) {
          dbHost = afterAt.split("/")[0].split("?")[0];
        }
      } else {
        const match = IMPORT_DB_URI.match(/mongodb:\/\/([^\/]+)/);
        if (match) {
          dbHost = match[1];
        }
      }
    }
  } catch (e) { }
  console.log("🟢 Import Database connected to:", dbHost);
});

importDbConnection.on("error", (err) => {
  console.error("❌ Import Database connection error:", err);
});

export default importDbConnection;
