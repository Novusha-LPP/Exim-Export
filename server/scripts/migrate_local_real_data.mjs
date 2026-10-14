import mongoose from "mongoose";
import { ExContainer } from "../model/export/normalized/ExContainerModel.mjs";
import { ExInvoice } from "../model/export/normalized/ExInvoiceModel.mjs";
import { ExOperation } from "../model/export/normalized/ExOperationModel.mjs";

// ============================================================================
// HARDCODED LOCAL DATABASE ONLY - ZERO ACCESS TO PRODUCTION ATLAS
// ============================================================================
const HARDCODED_LOCAL_DB_URI = "mongodb://localhost:27017/export";

// Strict safety assertion
if (!HARDCODED_LOCAL_DB_URI.includes("localhost") && !HARDCODED_LOCAL_DB_URI.includes("127.0.0.1")) {
  console.error("FATAL ERROR: Target is not a local database. Aborting immediately.");
  process.exit(1);
}

async function runLocalSubcollectionMigration() {
  console.log("====================================================================");
  console.log(" REAL DATA MIGRATION TO LOCAL SUBCOLLECTIONS");
  console.log(` Target URI (Hardcoded Local Only): ${HARDCODED_LOCAL_DB_URI}`);
  console.log("====================================================================\n");

  try {
    console.log("Connecting to local MongoDB...");
    await mongoose.connect(HARDCODED_LOCAL_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(" Connected to local MongoDB.\n");

    const db = mongoose.connection.db;
    const exportJobsCollection = db.collection("exportjobs");

    const totalJobsInDb = await exportJobsCollection.countDocuments();
    console.log(`Found ${totalJobsInDb} total jobs in local 'exportjobs' collection.`);

    console.log("Resetting normalized collections (ex_containers, ex_invoices, ex_operations)...");
    await Promise.all([
      ExContainer.deleteMany({}),
      ExInvoice.deleteMany({}),
      ExOperation.deleteMany({}),
    ]);
    console.log(" Subcollections cleared for clean initial population.\n");

    const cursor = exportJobsCollection.find({});
    let processedJobs = 0;
    let totalContainersMigrated = 0;
    let totalInvoicesMigrated = 0;
    let totalOperationsMigrated = 0;

    const containerBatch = [];
    const invoiceBatch = [];
    const operationBatch = [];

    const BATCH_SIZE = 500;

    while (await cursor.hasNext()) {
      const job = await cursor.next();
      const jobNo = (job.job_no || job.jobNumber || "").trim();
      if (!jobNo) continue;

      // 1. Containers
      if (Array.isArray(job.containers) && job.containers.length > 0) {
        for (const c of job.containers) {
          const doc = { ...c, job_no: jobNo, job_id: job._id };
          delete doc._id;
          containerBatch.push(doc);
          if (containerBatch.length >= BATCH_SIZE) {
            await ExContainer.insertMany(containerBatch);
            totalContainersMigrated += containerBatch.length;
            containerBatch.length = 0;
          }
        }
      }

      // 2. Invoices
      if (Array.isArray(job.invoices) && job.invoices.length > 0) {
        for (const inv of job.invoices) {
          const doc = { ...inv, job_no: jobNo, job_id: job._id };
          delete doc._id;
          invoiceBatch.push(doc);
          if (invoiceBatch.length >= BATCH_SIZE) {
            await ExInvoice.insertMany(invoiceBatch);
            totalInvoicesMigrated += invoiceBatch.length;
            invoiceBatch.length = 0;
          }
        }
      }

      // 3. Operations
      if (Array.isArray(job.operations) && job.operations.length > 0) {
        const op = job.operations[0];
        if (op) {
          const doc = { ...op, job_no: jobNo, job_id: job._id };
          delete doc._id;
          operationBatch.push(doc);
          if (operationBatch.length >= BATCH_SIZE) {
            await ExOperation.insertMany(operationBatch);
            totalOperationsMigrated += operationBatch.length;
            operationBatch.length = 0;
          }
        }
      }

      processedJobs++;
      if (processedJobs % 100 === 0 || processedJobs === totalJobsInDb) {
        process.stdout.write(`Processed ${processedJobs}/${totalJobsInDb} jobs...\r`);
      }
    }

    // Flush remaining batches
    if (containerBatch.length > 0) {
      await ExContainer.insertMany(containerBatch);
      totalContainersMigrated += containerBatch.length;
    }
    if (invoiceBatch.length > 0) {
      await ExInvoice.insertMany(invoiceBatch);
      totalInvoicesMigrated += invoiceBatch.length;
    }
    if (operationBatch.length > 0) {
      await ExOperation.insertMany(operationBatch);
      totalOperationsMigrated += operationBatch.length;
    }

    console.log(`\n\n Migration complete!`);
    console.log("--------------------------------------------------------------------");
    console.log(` Total Jobs Processed:        ${processedJobs}`);
    console.log(` Total Containers Migrated:    ${totalContainersMigrated}`);
    console.log(` Total Invoices Migrated:      ${totalInvoicesMigrated}`);
    console.log(` Total Operations Migrated:    ${totalOperationsMigrated}`);
    console.log("--------------------------------------------------------------------\n");

    // Verification check on job AMD/EXP/SEA/00513/26-27
    const checkJobNo = "AMD/EXP/SEA/00513/26-27";
    const verifiedContainers = await ExContainer.find({ job_no: checkJobNo }).lean();
    console.log(`Verification for Sample Job: ${checkJobNo}`);
    console.log(`Found ${verifiedContainers.length} containers in 'ex_containers':`);
    verifiedContainers.forEach((c, idx) => {
      console.log(`  [${idx + 1}] Container: ${c.containerNo} | Gross Wt: ${c.grossWeight} | Seal No: ${c.sealNo}`);
    });

    await mongoose.disconnect();
    console.log("\nDisconnected from local MongoDB. All done.");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

runLocalSubcollectionMigration();
