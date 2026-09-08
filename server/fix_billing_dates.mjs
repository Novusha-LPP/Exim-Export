import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import ExJobModel from "./model/export/ExJobModel.mjs";

async function fixDatesInDB() {
  try {
    const uri = process.env.PROD_MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export";
    await mongoose.connect(uri.trim());
    console.log("Connected to DB");

    const jobs = await ExJobModel.find({
      $or: [
        { "operations.0.statusDetails.0.billing_details.agency_bill_date": { $regex: /^2026-0[1-8]-09$/ } },
        { "operations.0.statusDetails.0.billing_details.agency_bill_date": { $regex: /^09-0[1-8]-2026$/ } },
        { "operations.0.statusDetails.0.billing_details.reimbursement_bill_date": { $regex: /^2026-0[1-8]-09$/ } },
        { "operations.0.statusDetails.0.billing_details.reimbursement_bill_date": { $regex: /^09-0[1-8]-2026$/ } },
        { "billing_details.agency_bill_date": { $regex: /^2026-0[1-8]-09$/ } },
        { "billing_details.agency_bill_date": { $regex: /^09-0[1-8]-2026$/ } }
      ]
    }).lean();

    console.log(`Found ${jobs.length} jobs needing date fix.`);

    let updatedCount = 0;

    for (const job of jobs) {
      const opBDetails = job.operations?.[0]?.statusDetails?.[0]?.billing_details || {};
      const topBDetails = job.billing_details || {};

      let updateObj = {};

      const fixVal = (val) => {
        if (!val) return val;
        // e.g. "2026-08-09" -> "2026-09-08" or "08-09-2026"
        let m = val.match(/^2026-(0[1-8])-09$/);
        if (m) return `09-${m[1]}-2026`; // store standard DD-MM-YYYY e.g. 08-09-2026
        m = val.match(/^09-(0[1-8])-2026$/);
        if (m) return `${m[1]}-09-2026`; // store standard DD-MM-YYYY e.g. 08-09-2026
        return val;
      };

      const oldAgency = opBDetails.agency_bill_date || topBDetails.agency_bill_date || job.agency_bill_date;
      const oldReimb = opBDetails.reimbursement_bill_date || topBDetails.reimbursement_bill_date || job.reimbursement_bill_date;

      const newAgency = fixVal(oldAgency);
      const newReimb = fixVal(oldReimb);

      if (newAgency !== oldAgency) {
        updateObj["operations.0.statusDetails.0.billing_details.agency_bill_date"] = newAgency;
        updateObj["billing_details.agency_bill_date"] = newAgency;
        updateObj["agency_bill_date"] = newAgency;
      }

      if (newReimb !== oldReimb) {
        updateObj["operations.0.statusDetails.0.billing_details.reimbursement_bill_date"] = newReimb;
        updateObj["billing_details.reimbursement_bill_date"] = newReimb;
        updateObj["reimbursement_bill_date"] = newReimb;
      }

      if (Object.keys(updateObj).length > 0) {
        console.log(`Updating ${job.job_no}: Agency ("${oldAgency}" -> "${newAgency}") | Reimb ("${oldReimb}" -> "${newReimb}")`);
        await ExJobModel.updateOne({ _id: job._id }, { $set: updateObj });
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} jobs in DB.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixDatesInDB();
