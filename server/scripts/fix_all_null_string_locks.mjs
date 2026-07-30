import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ExJobModel from "../model/export/ExJobModel.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
    ? process.env.SERVER_MONGODB_URI
    : process.env.DEV_MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URI;

async function fixAllInvalidLocks() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  try {
    // Find all jobs where lockedBy is string "null", "undefined", "NULL", or empty string ""
    const invalidLocks = await ExJobModel.find({
      lockedBy: { $in: ["null", "undefined", "NULL", "", "None", "null "] }
    }).select("job_no year lockedBy lockedAt");

    console.log(`Found ${invalidLocks.length} jobs with invalid string 'null' locks.`);

    if (invalidLocks.length > 0) {
      for (const job of invalidLocks) {
        console.log(`Clearing invalid lock on job: ${job.job_no} (lockedBy was: "${job.lockedBy}")`);
      }

      const updateResult = await ExJobModel.updateMany(
        { lockedBy: { $in: ["null", "undefined", "NULL", "", "None", "null "] } },
        { $set: { lockedBy: null, lockedAt: null } }
      );

      console.log(`✅ Fixed ${updateResult.modifiedCount} jobs in database.`);
    } else {
      console.log("✅ No other jobs found with invalid string locks.");
    }

  } catch (err) {
    console.error("❌ Error fixing invalid locks:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  }
}

fixAllInvalidLocks();
