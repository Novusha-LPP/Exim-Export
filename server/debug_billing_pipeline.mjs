/**
 * debug_billing_pipeline.mjs
 * Diagnoses why Freight Enquiry jobs are stuck in "Billing" pipeline stage.
 * Run: node debug_billing_pipeline.mjs
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.PROD_MONGODB_URI || process.env.MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export";

await mongoose.connect(uri.trim());
console.log("Connected to MongoDB");

const db = mongoose.connection.db;

// Fetch all converted freight enquiries
const enquiries = await db.collection("freightenquiries").find({
  $or: [
    { status: "Converted" },
    { source_job_no: { $exists: true, $ne: "" } },
    { success_no: { $exists: true, $ne: "" } }
  ]
}).toArray();

console.log("Total converted freight enquiries: " + enquiries.length);

// Gather all job nos to lookup
const jobNos = enquiries.flatMap(e => [e.enquiry_no, e.success_no, e.source_job_no].filter(Boolean));
const exjobs = await db.collection("exportjobs").find(
  { job_no: { $in: jobNos } },
  {
    projection: {
      job_no: 1,
      send_for_billing: 1,
      billing_completed: 1,
      draft_bl_approved: 1,
      sailing_date: 1,
      arrival_date: 1,
      "operations.statusDetails.billing_details": 1
    }
  }
).toArray();

const jobMap = {};
exjobs.forEach(j => { if (j.job_no) jobMap[j.job_no.trim()] = j; });

console.log("Linked ExJobs found: " + exjobs.length);
console.log("\n--- BILLING STAGE ANALYSIS ---");

let stuckCount = 0;
for (const e of enquiries) {
  const job = jobMap[e.success_no] || jobMap[e.source_job_no] || jobMap[e.enquiry_no];

  // Simulate the merge
  const merged = { ...e };
  if (job) {
    if (job.send_for_billing) merged.send_for_billing = job.send_for_billing;
    if (job.billing_completed) merged.billing_completed = job.billing_completed;
    if (job.sailing_date) merged.sailing_date = job.sailing_date;
    if (job.arrival_date) merged.arrival_date = job.arrival_date;

    // Billing details from operations
    const opBilling = (job.operations || [])
      .flatMap(op => op.statusDetails || [])
      .find(sd =>
        sd.billing_details?.agency_bill_no ||
        sd.billing_details?.agency_bill_date ||
        sd.billing_details?.reimbursement_bill_no ||
        sd.billing_details?.reimbursement_bill_date
      )?.billing_details;

    if (opBilling) {
      merged.billing_details = { ...(merged.billing_details || {}), ...opBilling };
    } else if (job.operations?.[0]?.statusDetails?.[0]?.billing_details) {
      merged.billing_details = { ...(merged.billing_details || {}), ...job.operations[0].statusDetails[0].billing_details };
    }
  }

  // Compute gate
  const draftApproved = merged.draft_bl_approved === true;
  const sobOk = !!merged.sailing_date;
  const billingOk = !!(
    (merged.billing_details?.agency_bill_no && merged.billing_details?.agency_bill_date) ||
    (merged.billing_details?.reimbursement_bill_no && merged.billing_details?.reimbursement_bill_date) ||
    merged.billing_completed ||
    merged.send_for_billing
  );

  let stage;
  if (!draftApproved) stage = "Draft BL";
  else if (!sobOk) stage = "SOB";
  else if (!billingOk) stage = "Billing [STUCK]";
  else if (!merged.arrival_date) stage = "ETA Pending";
  else if (!merged.final_delivery_date) stage = "Delivery";
  else stage = "Completed";

  if (stage.includes("STUCK")) {
    stuckCount++;
    console.log("\n  ENQ: " + e.enquiry_no + " | SUC: " + e.success_no);
    console.log("  Source Job: " + (e.source_job_no || "(none)"));
    console.log("  Linked ExJob: " + (job ? job.job_no : "(NOT FOUND IN DB)"));
    console.log("  draft_bl_approved: " + merged.draft_bl_approved);
    console.log("  sailing_date: " + (merged.sailing_date || "(none)"));
    console.log("  send_for_billing: " + (merged.send_for_billing || "(none)"));
    console.log("  billing_completed: " + (merged.billing_completed || "(none)"));
    console.log("  billing_details (ENQ): " + JSON.stringify(e.billing_details || {}));
    console.log("  billing_details (merged): " + JSON.stringify(merged.billing_details || {}));
    if (job) {
      const allOpBillings = (job.operations || []).flatMap(op => op.statusDetails || []).map(sd => sd.billing_details);
      console.log("  op billing_details (raw): " + JSON.stringify(allOpBillings));
    }
  }
}

console.log("\n--- SUMMARY ---");
console.log("Jobs stuck in Billing: " + stuckCount + " / " + enquiries.length);

await mongoose.disconnect();
console.log("Done.");
