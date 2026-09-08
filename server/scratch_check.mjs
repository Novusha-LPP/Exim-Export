import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import ExJobModel from "./model/export/ExJobModel.mjs";

async function checkAll() {
  try {
    const uri = process.env.PROD_MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export";
    await mongoose.connect(uri.trim());

    const jobs = await ExJobModel.find({
      $or: [
        { "operations.0.statusDetails.0.billing_details.agency_bill_date": { $regex: /^2026-/ } },
        { "operations.0.statusDetails.0.billing_details.reimbursement_bill_date": { $regex: /^2026-/ } },
        { "billing_details.agency_bill_date": { $regex: /^2026-/ } }
      ]
    }).select("job_no operations.statusDetails.billing_details billing_details").lean();

    console.log(`Found ${jobs.length} jobs with ISO yyyy-mm-dd billing dates:`);
    jobs.forEach(j => {
      const b = j.operations?.[0]?.statusDetails?.[0]?.billing_details || j.billing_details || {};
      console.log(j.job_no, "->", { agency: b.agency_bill_date, reimb: b.reimbursement_bill_date });
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAll();
