import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.PROD_MONGODB_URI || process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const doc = await db.collection("exjobs").findOne({ "charges.0": { $exists: true } });
    if (doc) {
      console.log("Found ExJob with charges:", doc.job_no);
      console.log(JSON.stringify(doc.charges, null, 2));
    } else {
      console.log("No ExJobs have charges.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
