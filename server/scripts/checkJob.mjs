import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.PROD_MONGODB_URI || process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    // Find any job
    const job = await db.collection("exjobs").findOne();
    if (job) {
      console.log("Found Job:", job.job_no);
      console.log("freightInsuranceCharges:", job.freightInsuranceCharges);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
