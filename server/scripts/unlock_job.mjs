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

async function checkAndUnlockJob() {
  const targetJobNo = "GIM/EXP/SEA/00230/26-27";
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  try {
    // Escape slashes and special chars for regex match if needed
    const job = await ExJobModel.findOne({
      $or: [
        { job_no: targetJobNo },
        { job_no: { $regex: `^${targetJobNo.replace(/\//g, "\\/")}$`, $options: "i" } }
      ]
    });

    if (!job) {
      console.log(`❌ Job not found with job_no: "${targetJobNo}"`);
      // Also search partially or by number to be safe
      const partialMatches = await ExJobModel.find({
        job_no: { $regex: "00230", $options: "i" }
      }).select("job_no year isLocked lockedBy lockedAt operational_lock").lean();
      console.log("Partial matches found with '00230':", partialMatches);
      return;
    }

    console.log("\n📌 CURRENT JOB DETAILS BEFORE UNLOCK:");
    console.log({
      _id: job._id,
      job_no: job.job_no,
      year: job.year,
      isLocked: job.isLocked,
      lockedBy: job.lockedBy,
      lockedAt: job.lockedAt,
      operational_lock: job.operational_lock,
      status: job.status,
      send_for_billing: job.send_for_billing
    });

    // Reset lock fields
    const previousLockedBy = job.lockedBy;
    const previousIsLocked = job.isLocked;
    const previousOpLock = job.operational_lock;

    job.lockedBy = null;
    job.lockedAt = null;
    job.isLocked = false;
    job.operational_lock = false;

    await job.save();

    console.log("\n✅ JOB UNLOCKED SUCCESSFULLY!");
    console.log({
      job_no: job.job_no,
      previousLockedBy: previousLockedBy || "None",
      previousIsLocked,
      previousOpLock,
      newLockedBy: job.lockedBy,
      newIsLocked: job.isLocked,
      newOpLock: job.operational_lock
    });

  } catch (err) {
    console.error("❌ Error unlocking job:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  }
}

checkAndUnlockJob();
