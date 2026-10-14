import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import { populateJobSubcollections, syncJobSubcollections, isSubcollectionEnabled } from "../services/export-jobs/subcollectionSyncService.mjs";
import { ExContainer } from "../model/export/normalized/ExContainerModel.mjs";
import { ExInvoice } from "../model/export/normalized/ExInvoiceModel.mjs";

const LOCAL_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export";

async function testServiceSync() {
  console.log("Connecting to local MongoDB...");
  console.log("NODE_ENV is:", process.env.NODE_ENV);
  console.log("isSubcollectionEnabled:", isSubcollectionEnabled());

  await mongoose.connect(LOCAL_URI);

  const testJobNo = "AMD/EXP/SEA/00001/26-27";

  console.log("\n1. Testing populateJobSubcollections...");
  const dummyJob = { job_no: testJobNo };
  const enriched = await populateJobSubcollections(dummyJob);
  console.log(`Enriched containers count: ${enriched.containers?.length || 0}`);
  console.log(`Enriched invoices count:   ${enriched.invoices?.length || 0}`);
  console.log(`Enriched operations count: ${enriched.operations?.length || 0}`);

  console.log("\n2. Testing syncJobSubcollections with updated grossWeight...");
  const newGrossWeight = 26500;
  const updatedContainers = enriched.containers.map(c => ({
    ...c,
    grossWeight: newGrossWeight,
  }));

  await syncJobSubcollections(testJobNo, { containers: updatedContainers });
  console.log(`Synced containers with new grossWeight = ${newGrossWeight}`);

  console.log("\n3. Re-populating and verifying updated container...");
  const reEnriched = await populateJobSubcollections({ job_no: testJobNo });
  console.log(`Verified grossWeight in re-enriched job: ${reEnriched.containers[0]?.grossWeight} kg`);

  if (reEnriched.containers[0]?.grossWeight === newGrossWeight) {
    console.log("SUCCESS: Subcollection read & write sync is 100% verified!");
  } else {
    console.error("FAILURE: Mismatch in grossWeight");
  }

  await mongoose.disconnect();
}

testServiceSync();
