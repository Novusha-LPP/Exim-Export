import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const IMPORT_MONGODB_URI =
  "mongodb://exim:I9y5bcMUHkGHpgq2@ac-oqmvpdw-shard-00-00.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-01.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-02.xya3qh0.mongodb.net:27017/exim?ssl=true&replicaSet=atlas-103rb8-shard-0&authSource=admin&retryWrites=true&w=majority";

function fixSwappedDate(val) {
  if (!val) return val;
  let str = String(val).trim();

  if (/^\d{2}-\d{2}-00\d{2}$/.test(str)) {
    str = str.replace(/-00(\d{2})$/, '-20$1');
  }

  let m = str.match(/^09-(0[1-9]|1[0-2])-(202[4-6])$/);
  if (m) {
    const day = m[1];
    const year = m[2];
    return `${day}-09-${year}`;
  }

  m = str.match(/^(202[4-6])-(0[1-9]|1[0-2])-09$/);
  if (m) {
    const year = m[1];
    const day = m[2];
    return `${day}-09-${year}`;
  }

  return str;
}

async function runFix({ dryRun = true } = {}) {
  console.log(`Connecting to Import MongoDB... (dryRun = ${dryRun})`);
  const conn = await mongoose.createConnection(IMPORT_MONGODB_URI.trim()).asPromise();
  console.log("Connected successfully to Import DB.");

  const collectionsToSearch = ["jobs", "importjobs", "import_jobs"];
  let totalFixCount = 0;

  for (const collName of collectionsToSearch) {
    const coll = conn.collection(collName);
    const docs = await coll.find({
      $or: [
        { "operations.0.statusDetails.0.billing_details.agency_bill_date": { $exists: true, $ne: "" } },
        { "billing_details.agency_bill_date": { $exists: true, $ne: "" } },
        { agency_bill_date: { $exists: true, $ne: "" } }
      ]
    }).toArray();

    console.log(`Found ${docs.length} documents with agency_bill_date in collection '${collName}'.`);

    const updateReport = [];

    for (const doc of docs) {
      const opB = doc.operations?.[0]?.statusDetails?.[0]?.billing_details || {};
      const topB = doc.billing_details || {};

      const agencyNo = topB.agency_bill_no || opB.agency_bill_no || doc.agency_bill_no || "";
      const agencyDate = topB.agency_bill_date || opB.agency_bill_date || doc.agency_bill_date || "";
      const reimbNo = topB.reimbursement_bill_no || opB.reimbursement_bill_no || doc.reimbursement_bill_no || "";
      const reimbDate = topB.reimbursement_bill_date || opB.reimbursement_bill_date || doc.reimbursement_bill_date || "";

      const fixedAgencyDate = fixSwappedDate(agencyDate);
      const fixedReimbDate = reimbDate ? fixSwappedDate(reimbDate) : reimbDate;

      const agencyNeedsFix = fixedAgencyDate !== agencyDate;
      const reimbNeedsFix = reimbDate && fixedReimbDate !== reimbDate;

      if (agencyNeedsFix || reimbNeedsFix) {
        totalFixCount++;
        updateReport.push({
          job_no: doc.job_no || doc.job_number || doc._id,
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

          await coll.updateOne({ _id: doc._id }, { $set: updateObj });
        }
      }
    }

    if (updateReport.length > 0) {
      console.log(`\nFound ${updateReport.length} jobs needing date fix in '${collName}':`);
      console.table(updateReport);
    }
  }

  console.log(`\nTotal Import jobs updated: ${totalFixCount}`);
  await conn.close();
  return totalFixCount;
}

const isExecute = process.argv.includes("--execute");
runFix({ dryRun: !isExecute }).catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
