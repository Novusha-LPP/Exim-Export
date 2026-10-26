import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const LOCAL_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export";
const PROD_URI = process.env.PROD_MONGODB_URI;

/**
 * Sync 26-27 jobs from production exportjobs into local exportjobs
 */
export async function syncFromProd() {
  console.log("Connecting to local MongoDB:", LOCAL_URI);
  await mongoose.connect(LOCAL_URI);
  const localDb = mongoose.connection.db;

  console.log("Connecting to Production MongoDB...");
  const prodMongoose = await mongoose.createConnection(PROD_URI).asPromise();
  const prodDb = prodMongoose.db;

  const count = await prodDb.collection("exportjobs").countDocuments({ year: "26-27" });
  console.log(`Found ${count} jobs for year 26-27 in Production exportjobs.`);

  if (count === 0) {
    console.log("No 26-27 jobs found in Production.");
    process.exit(0);
  }

  const cursor = prodDb.collection("exportjobs").find({ year: "26-27" });
  const batchSize = 500;
  let batch = [];
  let totalUpserted = 0;

  console.log("Starting bulk upsert into local exportjobs...");

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    batch.push({
      updateOne: {
        filter: { job_no: doc.job_no, isGeneralJob: doc.isGeneralJob || false },
        update: { $set: doc },
        upsert: true
      }
    });

    if (batch.length === batchSize) {
      const res = await localDb.collection("exportjobs").bulkWrite(batch, { ordered: false });
      totalUpserted += (res.upsertedCount + res.modifiedCount + res.matchedCount);
      console.log(`Progress: ${totalUpserted}/${count}`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    const res = await localDb.collection("exportjobs").bulkWrite(batch, { ordered: false });
    totalUpserted += (res.upsertedCount + res.modifiedCount + res.matchedCount);
  }

  console.log(`✅ Successfully synced ${totalUpserted} jobs for 26-27 into local exportjobs.`);

  const local2627Count = await localDb.collection("exportjobs").countDocuments({ year: "26-27" });
  console.log(`Total 26-27 jobs in local exportjobs now: ${local2627Count}`);

  await prodMongoose.close();
  await mongoose.disconnect();
}

/**
 * Copy 26-27 jobs from local exjobs into local exportjobs
 */
export async function copyFromLocalExjobs() {
  console.log("Connecting to local MongoDB:", LOCAL_URI);
  await mongoose.connect(LOCAL_URI);
  const localDb = mongoose.connection.db;

  const exjobs = await localDb.collection("exjobs").find({ year: "26-27" }).toArray();
  console.log(`Found ${exjobs.length} jobs in local exjobs collection.`);

  if (exjobs.length === 0) {
    console.log("No 26-27 jobs found in local exjobs.");
    return;
  }

  const ops = exjobs.map(doc => ({
    updateOne: {
      filter: { job_no: doc.job_no, isGeneralJob: doc.isGeneralJob || false },
      update: { $set: doc },
      upsert: true
    }
  }));

  const res = await localDb.collection("exportjobs").bulkWrite(ops, { ordered: false });
  console.log(`✅ Copied from exjobs: ${res.upsertedCount} inserted, ${res.modifiedCount} modified.`);

  const local2627Count = await localDb.collection("exportjobs").countDocuments({ year: "26-27" });
  console.log(`Total 26-27 jobs in local exportjobs now: ${local2627Count}`);

  await mongoose.disconnect();
}

const mode = process.argv[2] || "prod";
if (mode === "local") {
  copyFromLocalExjobs().catch(console.error);
} else {
  syncFromProd().catch(console.error);
}
