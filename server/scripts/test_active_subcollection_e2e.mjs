import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import { ExContainer } from "../model/export/normalized/ExContainerModel.mjs";
import { ExInvoice } from "../model/export/normalized/ExInvoiceModel.mjs";
import { populateJobSubcollections, syncJobSubcollections } from "../services/export-jobs/subcollectionSyncService.mjs";
import ExJobModel from "../model/export/ExJobModel.mjs";

const LOCAL_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export";

async function runE2ETest() {
  console.log("==========================================================");
  console.log(" Testing Active Subcollection Integration E2E");
  console.log(` Target DB: ${LOCAL_URI}`);
  console.log(` USE_NORMALIZED_SUBCOLLECTIONS: ${process.env.USE_NORMALIZED_SUBCOLLECTIONS}`);
  console.log("==========================================================");

  await mongoose.connect(LOCAL_URI);

  const testJobNo = "AMD/EXP/SEA/00001/26-27";

  // 1. Fetch raw root job from exportjobs
  const rawJob = await ExJobModel.findOne({ job_no: testJobNo }).lean();
  console.log("\n1. Fetched Raw Job from 'exportjobs':", testJobNo);
  console.log(" - Raw Job ID:", rawJob._id);

  // 2. Fetch and populate from subcollections
  const enrichedJob = await populateJobSubcollections({ ...rawJob });
  console.log("\n2. Enriched Job via subcollectionSyncService:");
  console.log(` - Containers (from ex_containers): ${enrichedJob.containers?.length || 0}`);
  console.log(` - Container 0 ContainerNo:        ${enrichedJob.containers?.[0]?.containerNo}`);
  console.log(` - Container 0 Gross Weight:       ${enrichedJob.containers?.[0]?.grossWeight} kg`);
  console.log(` - Invoices (from ex_invoices):     ${enrichedJob.invoices?.length || 0}`);
  console.log(` - Invoice 0 InvoiceNumber:        ${enrichedJob.invoices?.[0]?.invoiceNumber}`);

  // 3. Simulate an update dispatched through syncJobSubcollections
  console.log("\n3. Simulating Live UI Update to Container Details...");
  const updatedWeight = 27850;
  const modifiedContainers = enrichedJob.containers.map(c => ({
    ...c,
    grossWeight: updatedWeight,
    sealNo: "TEST-SEAL-999"
  }));

  await syncJobSubcollections(testJobNo, { containers: modifiedContainers }, rawJob._id);
  console.log(` - Written updated containers to 'ex_containers' with grossWeight=${updatedWeight}, sealNo='TEST-SEAL-999'`);

  // 4. Verify in ex_containers collection directly
  const verifiedDoc = await ExContainer.findOne({ job_no: testJobNo }).lean();
  console.log("\n4. Verification query directly on 'ex_containers' collection:");
  console.log(` - ContainerNo in ex_containers:  ${verifiedDoc.containerNo}`);
  console.log(` - SealNo in ex_containers:       ${verifiedDoc.sealNo}`);
  console.log(` - GrossWeight in ex_containers:  ${verifiedDoc.grossWeight} kg`);

  if (verifiedDoc.grossWeight === updatedWeight && verifiedDoc.sealNo === "TEST-SEAL-999") {
    console.log("\n>>> E2E VALIDATION PASSED: Local development is now actively reading and writing to normalized subcollections!");
  } else {
    console.error("\n>>> E2E VALIDATION FAILED: Data in ex_containers does not match update.");
  }

  // 5. Restore original container data so test is idempotent and non-destructive
  console.log("\n5. Restoring original container data...");
  await syncJobSubcollections(testJobNo, { containers: enrichedJob.containers }, rawJob._id);
  console.log(" - Original container details restored successfully.");

  await mongoose.disconnect();
}

runE2ETest();
