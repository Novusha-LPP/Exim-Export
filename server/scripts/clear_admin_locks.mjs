import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ExJobModel from "../model/export/ExJobModel.mjs";
import UserModel from "../model/userModel.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
    ? process.env.SERVER_MONGODB_URI
    : process.env.DEV_MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URI;

async function clearAdminLocks() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  try {
    const adminUsers = await UserModel.find({ role: "Admin" }).select("username").lean();
    const adminUsernames = adminUsers.map((u) => u.username).filter(Boolean);

    console.log("Admin usernames found:", adminUsernames);

    if (adminUsernames.length > 0) {
      const regexes = adminUsernames.map((u) => new RegExp(`^${u}$`, "i"));
      const adminLockedJobs = await ExJobModel.find({
        lockedBy: { $in: regexes }
      }).select("job_no lockedBy");

      console.log(`Found ${adminLockedJobs.length} jobs currently locked by admin users.`);

      if (adminLockedJobs.length > 0) {
        for (const job of adminLockedJobs) {
          console.log(`Clearing lock on job ${job.job_no} (lockedBy: ${job.lockedBy})`);
        }

        const updateResult = await ExJobModel.updateMany(
          { lockedBy: { $in: regexes } },
          { $set: { lockedBy: null, lockedAt: null } }
        );

        console.log(`✅ Cleared locks on ${updateResult.modifiedCount} admin-locked jobs.`);
      }
    }
  } catch (err) {
    console.error("❌ Error clearing admin locks:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  }
}

clearAdminLocks();
