import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import ExJobModel from "./model/export/ExJobModel.mjs";

async function inspect() {
  const uri = process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/export";
  await mongoose.connect(uri);

  const childJobNos = [
    'AMD/EXP/SEA/01187/26-27',
    'AMD/EXP/SEA/01188/26-27',
    'AMD/EXP/SEA/01189/26-27',
    'AMD/EXP/SEA/01190/26-27'
  ];

  const jobs = await ExJobModel.find({ job_no: { $in: childJobNos } }).lean();

  console.log(`Found ${jobs.length} child jobs:`);
  for (const j of jobs) {
    console.log("-----------------------------------------");
    console.log("job_no:", j.job_no);
    console.log("shipping_bill_no:", j.custom_house_details?.shipping_bill_no || j.sb_no);
    console.log("total_no_of_pkgs:", j.total_no_of_pkgs);
    console.log("gross_weight_kg:", j.gross_weight_kg);
    console.log("containers:", JSON.stringify(j.containers, null, 2));
  }

  await mongoose.disconnect();
}

inspect().catch(err => console.error(err));
