import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
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

async function runCleanup() {
  try {
    console.log("Starting Directory Cleanup Operation for FY 26-27...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to Export DB:", MONGODB_URI.split("@").pop());

    if (importDbConnection.readyState !== 1) {
      await new Promise((r) => {
        importDbConnection.once("connected", r);
        setTimeout(r, 3000);
      });
    }

    const directories = await Directory.find({}).lean();
    console.log(`Total Directories found in DB: ${directories.length}`);

    const yearQuery = {
      $or: [
        { year: { $regex: /26-27|2026-2027|2026-27/i } },
        { job_date: { $gte: "2026-04-01" } },
        { createdAt: { $gte: new Date("2026-04-01T00:00:00.000Z") } },
      ],
    };

    const selectFields =
      "exporter_name exporter importer_name importer organization client consignee_name buyer_name notify_name shipper ieCode iec_code iecNo iec_no panNo pan_no pan gstin gstn gst_no gstNo";

    const exportJobs = await ExJobModel.find(yearQuery).select(selectFields).lean();

    let importJobs = [];
    if (importDbConnection.readyState === 1) {
      importJobs = await importDbConnection.db
        .collection("jobs")
        .find(yearQuery, {
          projection: {
            exporter_name: 1,
            exporter: 1,
            importer_name: 1,
            importer: 1,
            organization: 1,
            client: 1,
            consignee_name: 1,
            buyer_name: 1,
            notify_name: 1,
            shipper: 1,
            ieCode: 1,
            iec_code: 1,
            iecNo: 1,
            iec_no: 1,
            panNo: 1,
            pan_no: 1,
            pan: 1,
            gstin: 1,
            gstn: 1,
            gst_no: 1,
            gstNo: 1,
          },
        })
        .toArray();
    }

    console.log(
      `Found ${exportJobs.length} Export Jobs and ${importJobs.length} Import Jobs for FY 26-27.`
    );

    const jobNormNames = new Set();
    const jobRawNames = new Set();
    const jobIecCodes = new Set();
    const jobPanNos = new Set();
    const jobGstNos = new Set();

    function addJobFields(j) {
      const fields = [
        j.exporter_name,
        j.exporter,
        j.importer_name,
        j.importer,
        j.organization,
        j.client,
        j.consignee_name,
        j.buyer_name,
        j.notify_name,
        j.shipper,
      ];
      fields.forEach((f) => {
        if (f && typeof f === "string") {
          const trimmed = f.trim();
          if (trimmed) {
            jobRawNames.add(trimmed.toUpperCase());
            const norm = normalizeName(trimmed);
            if (norm) jobNormNames.add(norm);
          }
        }
      });

      const iecs = [j.ieCode, j.iec_code, j.iecNo, j.iec_no];
      iecs.forEach((i) => {
        if (i && typeof i === "string" && i.trim()) jobIecCodes.add(i.trim().toUpperCase());
      });

      const pans = [j.panNo, j.pan_no, j.pan];
      pans.forEach((p) => {
        if (p && typeof p === "string" && p.trim()) jobPanNos.add(p.trim().toUpperCase());
      });

      const gsts = [j.gstin, j.gstn, j.gst_no, j.gstNo];
      gsts.forEach((g) => {
        if (g && typeof g === "string" && g.trim()) jobGstNos.add(g.trim().toUpperCase());
      });
    }

    exportJobs.forEach(addJobFields);
    importJobs.forEach(addJobFields);

    const usedDirectories = [];
    const unusedDirectories = [];

    directories.forEach((d) => {
      const org = (d.organization || "").trim().toUpperCase();
      const alias = (d.alias || "").trim().toUpperCase();
      const iec = (d.registrationDetails?.ieCode || "").trim().toUpperCase();
      const pan = (d.registrationDetails?.panNo || "").trim().toUpperCase();
      const normOrg = normalizeName(org);
      const normAlias = normalizeName(alias);
      const gsts = (d.branchInfo || []).map((b) => (b.gstNo || "").trim().toUpperCase()).filter(Boolean);

      let matched = false;
      if (org && jobRawNames.has(org)) matched = true;
      else if (alias && jobRawNames.has(alias)) matched = true;
      else if (iec && jobIecCodes.has(iec)) matched = true;
      else if (pan && jobPanNos.has(pan)) matched = true;
      else if (normOrg && jobNormNames.has(normOrg)) matched = true;
      else if (normAlias && jobNormNames.has(normAlias)) matched = true;
      else {
        for (const g of gsts) {
          if (jobGstNos.has(g)) {
            matched = true;
            break;
          }
        }
      }

      if (matched) {
        usedDirectories.push(d);
      } else {
        unusedDirectories.push(d);
      }
    });

    console.log(`\nMatching Summary:`);
    console.log(`- Total Directories: ${directories.length}`);
    console.log(`- Used Directories in FY 26-27: ${usedDirectories.length}`);
    console.log(`- Unused Directories to Remove: ${unusedDirectories.length}`);

    if (unusedDirectories.length === 0) {
      console.log("No unused directories found to remove.");
      process.exit(0);
    }

    // 1. Save backup JSON
    const backupPath = path.join(process.cwd(), "unused_directories_backup_26-27.json");
    fs.writeFileSync(backupPath, JSON.stringify(unusedDirectories, null, 2));
    console.log(`\nCreated safety backup of ${unusedDirectories.length} unused directories at: ${backupPath}`);

    // 2. Perform deletion
    const unusedIds = unusedDirectories.map((d) => d._id);
    const deleteResult = await Directory.deleteMany({ _id: { $in: unusedIds } });

    console.log(`\nSuccessfully deleted ${deleteResult.deletedCount} unused directory records from DB!`);
    const remainingCount = await Directory.countDocuments();
    console.log(`Remaining active directories in DB: ${remainingCount}`);

    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
}

runCleanup();
