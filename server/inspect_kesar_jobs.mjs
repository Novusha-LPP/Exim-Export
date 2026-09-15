import mongoose from "mongoose";
import dotenv from "dotenv";
import Directory from "./model/Directorties/Directory.js";
import ExJobModel from "./model/export/ExJobModel.mjs";
import importDbConnection from "./model/importDB.js";

dotenv.config();

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
      ? process.env.SERVER_MONGODB_URI
      : process.env.DEV_MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  if (importDbConnection.readyState !== 1) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("=== ALL EXPORT JOBS FOR KESAR IN ANY FIELD ===");
  const kesarExportJobs = await ExJobModel.find({
    $or: [
      { exporter_name: /KESAR/i },
      { exporter: /KESAR/i },
      { organization: /KESAR/i },
      { client: /KESAR/i },
      { gstin: /ABFFK8012Q/i },
      { panNo: /ABFFK8012Q/i }
    ]
  }).lean();

  console.log(`Found ${kesarExportJobs.length} Export Jobs:`);
  kesarExportJobs.forEach(j => {
    console.log(`JobNo: ${j.job_no}, Year: ${j.year}, Exporter: ${j.exporter_name || j.exporter}, isGeneralJob: ${j.isGeneralJob}, createdAt: ${j.createdAt}`);
  });

  if (importDbConnection.readyState === 1) {
    console.log("\n=== ALL IMPORT JOBS FOR KESAR IN ANY FIELD ===");
    const kesarImportJobs = await importDbConnection.db.collection("jobs").find({
      $or: [
        { importer_name: /KESAR/i },
        { importer: /KESAR/i },
        { exporter_name: /KESAR/i },
        { exporter: /KESAR/i },
        { organization: /KESAR/i },
        { client: /KESAR/i }
      ]
    }).toArray();

    console.log(`Found ${kesarImportJobs.length} Import Jobs:`);
    kesarImportJobs.forEach(j => {
      console.log(`JobNo: ${j.job_no}, Year: ${j.year}, Importer: ${j.importer_name || j.importer}, Exporter: ${j.exporter_name || j.exporter}`);
    });
  }

  process.exit(0);
}

run();
