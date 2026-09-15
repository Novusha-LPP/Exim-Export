import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const uri = process.env.PROD_MONGODB_URI || process.env.MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export";
await mongoose.connect(uri.trim());
const db = mongoose.connection.db;

// For FF-SUC/EXP/AIR/0001/26-27 which has source_job_no = AMD/EXP/AIR/00002/26-27
// Check BOTH the FF job and the source AMD job
console.log("=== Checking FF Job (what the server finds) ===");
const ffJob = await db.collection("exportjobs").findOne({ job_no: "FF-SUC/EXP/AIR/0001/26-27" });
if (ffJob) {
  console.log("send_for_billing:", ffJob.send_for_billing);
  const opBillings = (ffJob.operations||[]).flatMap(op => (op.statusDetails||[]).map(sd => sd.billing_details));
  console.log("op billing_details:", JSON.stringify(opBillings));
} else {
  console.log("NOT FOUND");
}

console.log("\n=== Checking SOURCE Job (AMD/EXP/AIR/00002/26-27) ===");
const sourceJob = await db.collection("exportjobs").findOne({ job_no: "AMD/EXP/AIR/00002/26-27" });
if (sourceJob) {
  console.log("send_for_billing:", sourceJob.send_for_billing);
  const opBillings = (sourceJob.operations||[]).flatMap(op => (op.statusDetails||[]).map(sd => sd.billing_details));
  console.log("op billing_details:", JSON.stringify(opBillings));
} else {
  console.log("NOT FOUND");
}

// Now check what the server ExJobModel.find query would return:
// The query is: job_no: { $in: [enquiry_no, success_no, source_job_no] }
// For this job: ["FF-SUC/EXP/AIR/0001/26-27", "FF-SUC/EXP/AIR/0001/26-27", "AMD/EXP/AIR/00002/26-27"]
console.log("\n=== What ExJobModel.find returns (simulated) ===");
const exJobs = await db.collection("exportjobs").find(
  { job_no: { $in: ["FF-SUC/EXP/AIR/0001/26-27", "AMD/EXP/AIR/00002/26-27"] } },
  { projection: { job_no: 1, send_for_billing: 1, "operations.statusDetails.billing_details": 1 } }
).toArray();
for (const j of exJobs) {
  console.log("Found job:", j.job_no, "| send_for_billing:", j.send_for_billing);
  const ops = (j.operations||[]).flatMap(op => (op.statusDetails||[]).map(sd => sd.billing_details));
  console.log("  op billings:", JSON.stringify(ops));
}

console.log("\n=== Server jobMap lookup simulation ===");
const jobMap = {};
exJobs.forEach(j => { if (j.job_no) jobMap[j.job_no.trim()] = j; });
// The server prefers: success_no, then source_job_no, then enquiry_no
const enq = { success_no: "FF-SUC/EXP/AIR/0001/26-27", source_job_no: "AMD/EXP/AIR/00002/26-27", enquiry_no: "FF-SUC/EXP/AIR/0001/26-27" };
const resolved = (enq.success_no && jobMap[enq.success_no]) || (enq.source_job_no && jobMap[enq.source_job_no]) || (enq.enquiry_no && jobMap[enq.enquiry_no]);
console.log("Resolved job_no:", resolved?.job_no || "NONE");
console.log("Resolved send_for_billing:", resolved?.send_for_billing);

await mongoose.disconnect();
console.log("\nDone.");
