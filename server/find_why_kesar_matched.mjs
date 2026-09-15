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

function normalizeName(str) {
  if (!str) return "";
  return str
    .toUpperCase()
    .replace(/PRIVATE/g, "")
    .replace(/LIMITED/g, "")
    .replace(/PVT/g, "")
    .replace(/LTD/g, "")
    .replace(/LLP/g, "")
    .replace(/INC/g, "")
    .replace(/CORP/g, "")
    .replace(/CO/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  if (importDbConnection.readyState !== 1) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  const yearQuery = {
    $or: [
      { year: { $regex: /26-27|2026-2027|2026-27/i } },
      { job_date: { $gte: "2026-04-01" } },
      { createdAt: { $gte: new Date("2026-04-01T00:00:00.000Z") } },
    ],
  };

  const exportJobs = await ExJobModel.find(yearQuery).lean();
  let importJobs = [];
  if (importDbConnection.readyState === 1) {
    importJobs = await importDbConnection.db.collection("jobs").find(yearQuery).toArray();
  }

  console.log(`Checking KESAR in ${exportJobs.length} export jobs & ${importJobs.length} import jobs...`);

  const searchTerms = ["KESAR", "ABFFK8012Q", "24ABFFK8012Q1Z0"];

  exportJobs.forEach(job => {
    const jsonStr = JSON.stringify(job).toUpperCase();
    for (const term of searchTerms) {
      if (jsonStr.includes(term)) {
        console.log(`\nFound in Export Job ${job.job_no}:`);
        console.log(`- year: ${job.year}`);
        console.log(`- exporter_name: ${job.exporter_name}`);
        console.log(`- exporter: ${job.exporter}`);
        console.log(`- gstin: ${job.gstin}`);
        console.log(`- ieCode: ${job.ieCode}`);
        console.log(`- panNo: ${job.panNo}`);
        break;
      }
    }
  });

  importJobs.forEach(job => {
    const jsonStr = JSON.stringify(job).toUpperCase();
    for (const term of searchTerms) {
      if (jsonStr.includes(term)) {
        console.log(`\nFound in Import Job ${job.job_no}:`);
        console.log(`- year: ${job.year}`);
        console.log(`- importer_name: ${job.importer_name}`);
        console.log(`- exporter_name: ${job.exporter_name}`);
        break;
      }
    }
  });

  process.exit(0);
}

run();
