import mongoose from "mongoose";
import ExportJobModel from "./model/export/ExJobModel.mjs";
import QueryModel from "./model/export/QueryModel.mjs";

const MONGO_URI = "mongodb://localhost:27017/export";

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected!");

  try {
    const jobs = await ExportJobModel.find({}).select("job_no").limit(10).lean();
    console.log("=== Sample Job Numbers from ExportJobModel ===");
    jobs.forEach(j => console.log(`  job_no: "${j.job_no}"`));

    const queries = await QueryModel.find({}).select("job_no").limit(10).lean();
    console.log("\n=== Sample Job Numbers from QueryModel ===");
    queries.forEach(q => console.log(`  job_no: "${q.job_no}"`));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

main().catch(console.error);
