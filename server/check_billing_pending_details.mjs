import mongoose from "mongoose";
import dotenv from "dotenv";
import ExJobModel from "./model/export/ExJobModel.mjs";

dotenv.config();

async function inspectAll() {
  try {
    const uri = process.env.PROD_MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export";
    await mongoose.connect(uri.trim());
    console.log("Connected to Mongo.");

    const jobs = await ExJobModel.find({
      $or: [
        { "operations.0.statusDetails.0.billing_details.agency_bill_date": { $exists: true, $ne: "" } },
        { "billing_details.agency_bill_date": { $exists: true, $ne: "" } },
        { agency_bill_date: { $exists: true, $ne: "" } }
      ]
    }).select("job_no send_for_billing operations.statusDetails.billing_details billing_details agency_bill_date agency_bill_no reimbursement_bill_no reimbursement_bill_date isFreightForwarding exporter createdAt").lean();

    console.log(`Total jobs with agency bill date: ${jobs.length}`);

    const swappedDateCandidates = [];

    for (const j of jobs) {
      const opB = j.operations?.[0]?.statusDetails?.[0]?.billing_details || {};
      const topB = j.billing_details || {};

      const agencyNo = opB.agency_bill_no || topB.agency_bill_no || j.agency_bill_no || "";
      const agencyDate = opB.agency_bill_date || topB.agency_bill_date || j.agency_bill_date || "";
      const reimbNo = opB.reimbursement_bill_no || topB.reimbursement_bill_no || j.reimbursement_bill_no || "";
      const reimbDate = opB.reimbursement_bill_date || topB.reimbursement_bill_date || j.reimbursement_bill_date || "";

      // Check if agencyDate is in format 09-XX-YYYY (where 09 is Sept in month position, stored as day)
      // or match 09-05-2025, 09-05-2026, 09-08-2026, 09-07-2026, 09-02-2026, 09-06-2026, etc.
      const matchSwapped = agencyDate.match(/^(0[1-9]|1[0-2])-(0[1-9]|1[0-2])-(202\d)$/);
      // Specifically check if 09-08, 09-07, 09-05, 09-02, 09-06, etc.
      const is09First = /^09-(0[1-9]|1[0-2])-(202\d)$/.test(agencyDate);
      // Or 05-09 vs 09-05
      
      if (agencyNo && agencyDate && (is09First || /^09-05-/.test(agencyDate))) {
        swappedDateCandidates.push({
          id: j._id,
          job_no: j.job_no,
          exporter: j.exporter,
          send_for_billing: j.send_for_billing,
          agencyNo,
          agencyDate,
          reimbNo,
          reimbDate,
          createdAt: j.createdAt
        });
      }
    }

    console.log(`Found ${swappedDateCandidates.length} candidate jobs where agencyDate has 09 as day (e.g. 09-MM-YYYY):`);
    console.table(swappedDateCandidates);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspectAll();
