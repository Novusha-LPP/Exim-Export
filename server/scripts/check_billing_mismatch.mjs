import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: "c:/Users/india/Desktop/projects/Exim-Export/server/.env" });

const uri = process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/export";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const col = db.collection("export_jobs");

  console.log("Connected to DB:", uri.replace(/:([^:@]{4})[^:@]*@/, ":****@"));

  const year = "26-27";

  // 1. Count jobs in year 26-27
  const total2627 = await col.countDocuments({ year });
  console.log(`Total jobs in year ${year}:`, total2627);

  // 2. Sent for billing filter in Jobs module
  // filter.$and.push({ job_no: { $not: /^FF/i } });
  // filter.$and.push({ isGeneralJob: { $ne: true } });
  // filter.$and.push({
  //   $and: [
  //     { $or: [{ status: { $regex: "^pending$", $options: "i" } }, { status: { $exists: false } }, { status: null }, { status: "" }] },
  //     { detailedStatus: { $ne: "Billing Done" } }
  //   ],
  //   send_for_billing: true
  // });
  const sentForBillingJobsQuery = {
    year,
    job_no: { $not: /^FF/i },
    isGeneralJob: { $ne: true },
    $and: [
      { $or: [{ status: { $regex: "^pending$", $options: "i" } }, { status: { $exists: false } }, { status: null }, { status: "" }] },
      { detailedStatus: { $ne: "Billing Done" } }
    ],
    send_for_billing: true
  };

  const sentForBillingCount = await col.countDocuments(sentForBillingJobsQuery);
  console.log("Export Jobs module - 'Sent for Billing' count:", sentForBillingCount);

  // 3. Completed in Jobs module
  const completedJobsQuery = {
    year,
    job_no: { $not: /^FF/i },
    $and: [{ status: { $regex: "^(?!cancelled$).*", $options: "i" } }, { isJobCanceled: { $ne: true } }],
    $or: [{ status: { $regex: "^completed$", $options: "i" } }, { detailedStatus: "Billing Done" }]
  };
  const completedCount = await col.countDocuments(completedJobsQuery);
  console.log("Export Jobs module - 'Completed' count:", completedCount);

  // 4. Now let's check billing-pending in Billing module
  // In billing module, jobs sent for billing:
  const allSentForBilling = await col.find({
    year,
    send_for_billing: true
  }).project({
    job_no: 1,
    status: 1,
    detailedStatus: 1,
    isGeneralJob: 1,
    charges: 1,
    "operations.statusDetails": 1
  }).toArray();

  console.log("Total jobs with send_for_billing: true in year 26-27 (all types):", allSentForBilling.length);

  // Let's inspect their billing_date, payment_requests, purchase_books
  let billingPendingCount = 0;
  let hasBillingDoneCount = 0;
  let hasPendingPrCount = 0;
  let hasApprovedPrCount = 0;
  let prCompletedCount = 0;

  for (const job of allSentForBilling) {
    const opStatus = job.operations?.[0]?.statusDetails?.[0] || {};
    const agencyNo = opStatus.billing_details?.agency_bill_no || job.billing_details?.agency_bill_no || job.agency_bill_no || job.tally_bill_no || job.bill_no || "";
    const agencyDate = opStatus.billing_details?.agency_bill_date || job.billing_details?.agency_bill_date || job.agency_bill_date || job.tally_bill_date || job.bill_date || "";
    const reimbNo = opStatus.billing_details?.reimbursement_bill_no || job.billing_details?.reimbursement_bill_no || job.reimbursement_bill_no || "";
    const reimbDate = opStatus.billing_details?.reimbursement_bill_date || job.billing_details?.reimbursement_bill_date || job.reimbursement_bill_date || "";
    const isFF = String(job.job_no || "").toUpperCase().startsWith("FF");
    
    let billing_date = "";
    if (isFF) {
      billing_date = (agencyDate && agencyNo) ? agencyDate : "";
    } else {
      billing_date = ((agencyDate && agencyNo) && (reimbDate && reimbNo)) ? (agencyDate || reimbDate) : "";
    }

    const hasBillingDone = Boolean(billing_date);
    if (!hasBillingDone) {
      billingPendingCount++;
    } else {
      hasBillingDoneCount++;
    }
  }

  console.log("Billing module analysis of send_for_billing: true:");
  console.log(" - billingPendingCount (send_for_billing && !hasBillingDone):", billingPendingCount);
  console.log(" - hasBillingDoneCount:", hasBillingDoneCount);

  // 5. What about all jobs in 26-27 that have hasBillingDone:
  const allJobsInYear = await col.find({ year }).project({
    job_no: 1,
    status: 1,
    detailedStatus: 1,
    isGeneralJob: 1,
    "operations.statusDetails": 1
  }).toArray();

  let totalBillingDoneAllJobs = 0;
  let ffJobsCount = 0;
  let genJobsCount = 0;

  for (const job of allJobsInYear) {
    const isFF = String(job.job_no || "").toUpperCase().startsWith("FF");
    const isGen = Boolean(job.isGeneralJob);
    if (isFF) ffJobsCount++;
    if (isGen) genJobsCount++;

    const opStatus = job.operations?.[0]?.statusDetails?.[0] || {};
    const agencyNo = opStatus.billing_details?.agency_bill_no || job.billing_details?.agency_bill_no || job.agency_bill_no || job.tally_bill_no || job.bill_no || "";
    const agencyDate = opStatus.billing_details?.agency_bill_date || job.billing_details?.agency_bill_date || job.agency_bill_date || job.tally_bill_date || job.bill_date || "";
    const reimbNo = opStatus.billing_details?.reimbursement_bill_no || job.billing_details?.reimbursement_bill_no || job.reimbursement_bill_no || "";
    const reimbDate = opStatus.billing_details?.reimbursement_bill_date || job.billing_details?.reimbursement_bill_date || job.reimbursement_bill_date || "";
    
    let billing_date = "";
    if (isFF) {
      billing_date = (agencyDate && agencyNo) ? agencyDate : "";
    } else {
      billing_date = ((agencyDate && agencyNo) && (reimbDate && reimbNo)) ? (agencyDate || reimbDate) : "";
    }

    if (billing_date) {
      totalBillingDoneAllJobs++;
    }
  }

  console.log("Total jobs in year with hasBillingDone:", totalBillingDoneAllJobs);
  console.log("FF jobs in year:", ffJobsCount);
  console.log("General jobs in year:", genJobsCount);

  await mongoose.disconnect();
}

run().catch(console.error);
