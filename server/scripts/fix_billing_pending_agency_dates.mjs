import mongoose from "mongoose";
import dotenv from "dotenv";
import ExJobModel from "../model/export/ExJobModel.mjs";

dotenv.config();

const MONGODB_URI =
  process.env.PROD_MONGODB_URI ||
  process.env.SERVER_MONGODB_URI ||
  "mongodb://localhost:27017/export";

/**
 * Fix date values:
 * 1. 09-05-2026 -> 05-09-2026, 09-08-2026 -> 08-09-2026, 09-07-2026 -> 07-09-2026, 09-02-2026 -> 02-09-2026, 09-05-2025 -> 05-09-2025
 * 2. 26-05-0026 -> 26-05-2026 (year typos)
 */
function fixSwappedDate(val) {
  if (!val) return val;
  let str = String(val).trim();

  // Fix typo years e.g. 26-05-0026 -> 26-05-2026
  if (/^\d{2}-\d{2}-00\d{2}$/.test(str)) {
    str = str.replace(/-00(\d{2})$/, '-20$1');
  }

  // 09-XX-YYYY where XX is 01-12 -> XX-09-YYYY
  let m = str.match(/^09-(0[1-9]|1[0-2])-(202[4-6])$/);
  if (m) {
    const day = m[1];
    const year = m[2];
    return `${day}-09-${year}`;
  }

  // 2026-XX-09 or 2025-XX-09 -> XX-09-YYYY
  m = str.match(/^(202[4-6])-(0[1-9]|1[0-2])-09$/);
  if (m) {
    const year = m[1];
    const day = m[2];
    return `${day}-09-${year}`;
  }

  return str;
}

async function runFix({ dryRun = true } = {}) {
  console.log(`Connecting to MongoDB... (dryRun = ${dryRun})`);
  await mongoose.connect(MONGODB_URI.trim());
  console.log("Connected successfully.");

  const jobs = await ExJobModel.find({
    $or: [
      { "operations.0.statusDetails.0.billing_details.agency_bill_date": { $exists: true, $ne: "" } },
      { "billing_details.agency_bill_date": { $exists: true, $ne: "" } },
      { agency_bill_date: { $exists: true, $ne: "" } }
    ]
  }).lean();

  console.log(`Found ${jobs.length} jobs with agency_bill_date.`);

  let fixCount = 0;
  const updateReport = [];

  for (const job of jobs) {
    const opB = job.operations?.[0]?.statusDetails?.[0]?.billing_details || {};
    const topB = job.billing_details || {};

    const agencyNo = opB.agency_bill_no || topB.agency_bill_no || job.agency_bill_no || "";
    const agencyDate = opB.agency_bill_date || topB.agency_bill_date || job.agency_bill_date || "";
    const reimbNo = opB.reimbursement_bill_no || topB.reimbursement_bill_no || job.reimbursement_bill_no || "";
    const reimbDate = opB.reimbursement_bill_date || topB.reimbursement_bill_date || job.reimbursement_bill_date || "";

    const fixedAgencyDate = fixSwappedDate(agencyDate);
    const fixedReimbDate = reimbDate ? fixSwappedDate(reimbDate) : reimbDate;

    const agencyNeedsFix = fixedAgencyDate !== agencyDate;
    const reimbNeedsFix = reimbDate && fixedReimbDate !== reimbDate;

    if (agencyNeedsFix || reimbNeedsFix) {
      fixCount++;
      updateReport.push({
        job_no: job.job_no,
        exporter: job.exporter,
        agencyNo,
        oldAgencyDate: agencyDate,
        newAgencyDate: fixedAgencyDate,
        reimbNo: reimbNo || "(none)",
        oldReimbDate: reimbDate || "(none)",
        newReimbDate: fixedReimbDate || "(none)"
      });

      if (!dryRun) {
        const updateObj = {};
        if (agencyNeedsFix) {
          updateObj["operations.0.statusDetails.0.billing_details.agency_bill_date"] = fixedAgencyDate;
          updateObj["billing_details.agency_bill_date"] = fixedAgencyDate;
          updateObj["agency_bill_date"] = fixedAgencyDate;
        }
        if (reimbNeedsFix) {
          updateObj["operations.0.statusDetails.0.billing_details.reimbursement_bill_date"] = fixedReimbDate;
          updateObj["billing_details.reimbursement_bill_date"] = fixedReimbDate;
          updateObj["reimbursement_bill_date"] = fixedReimbDate;
        }

        await ExJobModel.updateOne({ _id: job._id }, { $set: updateObj });

        if (job.is_club_job_parent && Array.isArray(job.clubbed_jobs) && job.clubbed_jobs.length > 0) {
          const childUpdateObj = {};
          if (agencyNeedsFix) {
            childUpdateObj["operations.0.statusDetails.0.billing_details.agency_bill_date"] = fixedAgencyDate;
            childUpdateObj["billing_details.agency_bill_date"] = fixedAgencyDate;
          }
          if (reimbNeedsFix) {
            childUpdateObj["operations.0.statusDetails.0.billing_details.reimbursement_bill_date"] = fixedReimbDate;
            childUpdateObj["billing_details.reimbursement_bill_date"] = fixedReimbDate;
          }
          await ExJobModel.updateMany(
            { job_no: { $in: job.clubbed_jobs } },
            { $set: childUpdateObj }
          );
        }
      }
    }
  }

  console.log(`\nFound ${fixCount} jobs needing date fix:`);
  console.table(updateReport);

  await mongoose.disconnect();
  return fixCount;
}

const isExecute = process.argv.includes("--execute");
runFix({ dryRun: !isExecute }).catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
