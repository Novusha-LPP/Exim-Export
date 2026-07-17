import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ExJobModel from "../model/export/ExJobModel.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the parent directory (server root)
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
      ? process.env.SERVER_MONGODB_URI
      : process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export";

async function run() {
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully.");

  // Find all jobs where send_for_billing is true and send_for_billing_date has value
  const jobs = await ExJobModel.find({
    send_for_billing: true,
    send_for_billing_date: { $exists: true, $ne: "" }
  });

  console.log(`Found ${jobs.length} jobs sent for billing.`);
  
  let updatedCount = 0;

  for (const job of jobs) {
    const originalDate = job.send_for_billing_date;
    if (!originalDate) continue;

    const trimmed = originalDate.trim();
    // Check if it already has a time component
    // It should have a space or colon to indicate HH:mm
    const hasTime = trimmed.includes(" ") || trimmed.includes(":");

    if (!hasTime) {
      const fixedDate = `${trimmed} 00:00`;
      console.log(`Job: ${job.job_no} | Date: "${originalDate}" -> Fixing to: "${fixedDate}"`);
      
      job.send_for_billing_date = fixedDate;
      // Mark as modified to ensure mongoose saves string update
      job.markModified("send_for_billing_date");
      await job.save();
      updatedCount++;
    }
  }

  console.log(`Migration completed. Updated ${updatedCount} jobs.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
