import mongoose from "mongoose";
import dotenv from "dotenv";
import { ExContainer } from "../model/export/normalized/ExContainerModel.mjs";
import { ExInvoice } from "../model/export/normalized/ExInvoiceModel.mjs";
import { ExOperation } from "../model/export/normalized/ExOperationModel.mjs";

dotenv.config();

const LOCAL_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export";

async function runSubcollectionMigration() {
  console.log("==========================================================");
  console.log(" Starting Local MongoDB Subcollection Normalization PoC");
  console.log(` Target Database: ${LOCAL_URI}`);
  console.log("==========================================================");

  try {
    await mongoose.connect(LOCAL_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(" Connected to local MongoDB successfully.\n");

    const db = mongoose.connection.db;
    const exportJobsCollection = db.collection("exportjobs");

    const totalJobs = await exportJobsCollection.countDocuments();
    console.log(`Found ${totalJobs} jobs in 'exportjobs' collection.`);

    let containersMigrated = 0;
    let invoicesMigrated = 0;
    let operationsMigrated = 0;
    let jobsWithData = 0;

    const cursor = exportJobsCollection.find({});

    while (await cursor.hasNext()) {
      const job = await cursor.next();
      if (!job.job_no) continue;

      let hasSubdata = false;

      // 1. Migrate Containers
      if (Array.isArray(job.containers) && job.containers.length > 0) {
        hasSubdata = true;
        for (const container of job.containers) {
          const containerData = {
            job_no: job.job_no,
            job_id: job._id,
            ...container,
          };
          delete containerData._id; // Ensure clean subcollection ID generation

          await ExContainer.updateOne(
            { job_no: job.job_no, containerNo: container.containerNo || "UNKNOWN" },
            { $set: containerData },
            { upsert: true }
          );
          containersMigrated++;
        }
      }

      // 2. Migrate Invoices
      if (Array.isArray(job.invoices) && job.invoices.length > 0) {
        hasSubdata = true;
        for (const invoice of job.invoices) {
          const invoiceData = {
            job_no: job.job_no,
            job_id: job._id,
            ...invoice,
          };
          delete invoiceData._id;

          await ExInvoice.updateOne(
            { job_no: job.job_no, invoiceNumber: invoice.invoiceNumber || "UNKNOWN" },
            { $set: invoiceData },
            { upsert: true }
          );
          invoicesMigrated++;
        }
      }

      // 3. Migrate Operations
      if (Array.isArray(job.operations) && job.operations.length > 0) {
        hasSubdata = true;
        for (const op of job.operations) {
          const opData = {
            job_no: job.job_no,
            job_id: job._id,
            ...op,
          };
          delete opData._id;

          await ExOperation.updateOne(
            { job_no: job.job_no },
            { $set: opData },
            { upsert: true }
          );
          operationsMigrated++;
        }
      }

      if (hasSubdata) {
        jobsWithData++;
      }
    }

    console.log("\n==========================================================");
    console.log(" Local Subcollection Migration Summary:");
    console.log(` - Total Jobs Processed:       ${totalJobs}`);
    console.log(` - Jobs with Subcollection Data: ${jobsWithData}`);
    console.log(` - Containers Extracted:       ${containersMigrated} (into 'ex_containers')`);
    console.log(` - Invoices Extracted:         ${invoicesMigrated} (into 'ex_invoices')`);
    console.log(` - Operations Extracted:       ${operationsMigrated} (into 'ex_operations')`);
    console.log("==========================================================");
  } catch (err) {
    console.error("Migration Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runSubcollectionMigration();
