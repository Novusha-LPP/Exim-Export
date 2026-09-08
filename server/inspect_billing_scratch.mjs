import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import ExJobModel from "./model/export/ExJobModel.mjs";

async function inspect() {
  const uri = process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/export";
  await mongoose.connect(uri);

  const jobs = await ExJobModel.find({
    $or: [
      { job_no: /00022/i },
      { job_number: /00022/i }
    ]
  }).lean();

  console.log(`Found ${jobs.length} jobs matching 00022:`);
  for (const j of jobs) {
    console.log("-----------------------------------------");
    console.log("job_no:", j.job_no);
    console.log("billing_details:", JSON.stringify(j.billing_details, null, 2));
    console.log("statusDetails billing_details:", JSON.stringify(j.operations?.[0]?.statusDetails?.[0]?.billing_details, null, 2));
  }

  await mongoose.disconnect();
}

inspect().catch(err => console.error(err));
