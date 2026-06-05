import mongoose from "mongoose";
import ExportJobModel from "./model/export/ExJobModel.mjs";
import QueryModel from "./model/export/QueryModel.mjs";

const MONGO_URI = "mongodb://localhost:27017/export";

async function main() {
  await mongoose.connect(MONGO_URI);

  try {
    const jobs = await ExportJobModel.find({ job_no: /00063/ }).lean();
    console.log("Jobs matching 00063:");
    jobs.forEach(j => {
      console.log(`  - _id: ${j._id}, job_no: "${j.job_no}"`);
    });

    const queries = await QueryModel.find({ job_no: /00063/ }).lean();
    console.log("Queries matching 00063:");
    queries.forEach(q => {
      console.log(`  - _id: ${q._id}, job_no: "${q.job_no}", raisedFrom: "${q.raisedFromModule}", target: "${q.targetModule}"`);
    });

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.connection.close();
  }
}

main().catch(console.error);
