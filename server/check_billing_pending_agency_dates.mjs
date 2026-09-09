import mongoose from "mongoose";
import dotenv from "dotenv";
import ExJobModel from "./model/export/ExJobModel.mjs";

dotenv.config();

async function checkAllAgencyDates() {
  try {
    const uri = process.env.PROD_MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export";
    await mongoose.connect(uri.trim());
    console.log("Connected to MongoDB.");

    const jobs = await ExJobModel.find({
      $or: [
        { "operations.0.statusDetails.0.billing_details.agency_bill_no": { $exists: true, $ne: "" } },
        { "billing_details.agency_bill_no": { $exists: true, $ne: "" } },
        { agency_bill_no: { $exists: true, $ne: "" } }
      ]
    }).select("job_no send_for_billing operations.statusDetails.billing_details billing_details agency_bill_date agency_bill_no isFreightForwarding exporter createdAt").lean();

    console.log(`Total jobs with agency bill no: ${jobs.length}`);

    const dateCounts = {};
    const jobsToFix = [];

    for (const j of jobs) {
      const opB = j.operations?.[0]?.statusDetails?.[0]?.billing_details || {};
      const topB = j.billing_details || {};

      const agencyNo = opB.agency_bill_no || topB.agency_bill_no || j.agency_bill_no || "";
      const agencyDate = opB.agency_bill_date || topB.agency_bill_date || j.agency_bill_date || "";
      const reimbNo = opB.reimbursement_bill_no || topB.reimbursement_bill_no || j.reimbursement_bill_no || "";
      const reimbDate = opB.reimbursement_bill_date || topB.reimbursement_bill_date || j.reimbursement_bill_date || "";

      if (agencyDate) {
        dateCounts[agencyDate] = (dateCounts[agencyDate] || 0) + 1;
      }

      // Check if day and month might be swapped (e.g. 09-05-2026, 09-05-2025, 09-04-2026, 09-06-2026, 09-07-2026, etc. or 08-09-2026, etc.)
      // Specifically check dates starting with 09- (where 09 is month Sept placed in day position) or dates like DD-MM-YYYY
      if (agencyNo && agencyDate && !reimbNo) {
        jobsToFix.push({
          id: j._id,
          job_no: j.job_no,
          exporter: j.exporter,
          send_for_billing: j.send_for_billing,
          agencyNo,
          agencyDate,
          createdAt: j.createdAt
        });
      }
    }

    console.log("\nSummary of agency_bill_date values in DB:");
    console.log(dateCounts);

    console.log(`\nJobs with Agency Bill No & Date ONLY (No Reimbursement Bill) count: ${jobsToFix.length}`);
    console.table(jobsToFix.slice(0, 50));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkAllAgencyDates();
