import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import ExJobModel from "./model/export/ExJobModel.mjs";

const normalizeToDMY = (val) => {
  if (!val) return val;
  const str = String(val).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str;

  const ymdMatch = str.match(/^(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }
  return str;
};

async function fixAllToDMY() {
  try {
    const uri = process.env.PROD_MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export";
    await mongoose.connect(uri.trim());
    console.log("Connected to DB");

    const jobs = await ExJobModel.find({
      $or: [
        { "operations.0.statusDetails.0.billing_details.agency_bill_date": { $regex: /^\d{4}-\d{2}-\d{2}$/ } },
        { "operations.0.statusDetails.0.billing_details.reimbursement_bill_date": { $regex: /^\d{4}-\d{2}-\d{2}$/ } },
        { "billing_details.agency_bill_date": { $regex: /^\d{4}-\d{2}-\d{2}$/ } },
        { "billing_details.reimbursement_bill_date": { $regex: /^\d{4}-\d{2}-\d{2}$/ } }
      ]
    }).lean();

    console.log(`Found ${jobs.length} jobs with YYYY-MM-DD dates to convert to DD-MM-YYYY.`);

    let count = 0;
    for (const job of jobs) {
      const opBDetails = job.operations?.[0]?.statusDetails?.[0]?.billing_details || {};
      const topBDetails = job.billing_details || {};

      const oldAgency = opBDetails.agency_bill_date || topBDetails.agency_bill_date || job.agency_bill_date || "";
      const oldReimb = opBDetails.reimbursement_bill_date || topBDetails.reimbursement_bill_date || job.reimbursement_bill_date || "";

      const newAgency = normalizeToDMY(oldAgency);
      const newReimb = normalizeToDMY(oldReimb);

      const updateObj = {};
      if (newAgency && newAgency !== oldAgency) {
        updateObj["operations.0.statusDetails.0.billing_details.agency_bill_date"] = newAgency;
        updateObj["billing_details.agency_bill_date"] = newAgency;
        updateObj["agency_bill_date"] = newAgency;
      }

      if (newReimb && newReimb !== oldReimb) {
        updateObj["operations.0.statusDetails.0.billing_details.reimbursement_bill_date"] = newReimb;
        updateObj["billing_details.reimbursement_bill_date"] = newReimb;
        updateObj["reimbursement_bill_date"] = newReimb;
      }

      if (Object.keys(updateObj).length > 0) {
        console.log(`Updating ${job.job_no}: Agency ("${oldAgency}" -> "${newAgency}") | Reimb ("${oldReimb}" -> "${newReimb}")`);
        await ExJobModel.updateOne({ _id: job._id }, { $set: updateObj });
        count++;
      }
    }

    console.log(`Successfully converted ${count} jobs to DD-MM-YYYY.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixAllToDMY();
