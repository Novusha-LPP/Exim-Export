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

async function executeExactCleanup() {
  try {
    console.log("Starting Strict Exact Directory Cleanup for FY 26-27...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to Export DB:", MONGODB_URI.split("@").pop());

    if (importDbConnection.readyState !== 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }

    const directories = await Directory.find({}).lean();
    console.log(`Current Total Directories in DB: ${directories.length}`);

    // Query for Standard 26-27 Export Jobs (isGeneralJob: { $ne: true })
    const exportYearQuery = {
      isGeneralJob: { $ne: true },
      $or: [
        { year: { $regex: /26-27|2026-2027|2026-27/i } },
        { job_date: { $gte: "2026-04-01" } },
        { createdAt: { $gte: new Date("2026-04-01T00:00:00.000Z") } },
      ],
    };

    const selectFields = "exporter_name exporter organization client ieCode panNo pan_no gstin gstn year isGeneralJob";
    const exportJobs = await ExJobModel.find(exportYearQuery).select(selectFields).lean();

    let importJobs = [];
    if (importDbConnection.readyState === 1) {
      const importYearQuery = {
        $or: [
          { year: { $regex: /26-27|2026-2027|2026-27/i } },
          { job_date: { $gte: "2026-04-01" } },
          { createdAt: { $gte: new Date("2026-04-01T00:00:00.000Z") } },
        ],
      };
      importJobs = await importDbConnection.db.collection("jobs").find(importYearQuery, {
        projection: {
          importer_name: 1, importer: 1, exporter_name: 1, exporter: 1, organization: 1, client: 1,
          ieCode: 1, iec_code: 1, panNo: 1, pan_no: 1, gstin: 1, gst_no: 1, year: 1
        }
      }).toArray();
    }

    const exportOrgNames = new Set();
    const exportIeCodes = new Set();
    const exportPanNos = new Set();
    const exportGstNos = new Set();

    exportJobs.forEach((j) => {
      [j.exporter_name, j.exporter, j.organization, j.client].forEach(f => {
        if (f && typeof f === 'string' && f.trim()) exportOrgNames.add(f.trim().toUpperCase());
      });
      [j.ieCode].forEach(i => {
        if (i && typeof i === 'string' && i.trim()) exportIeCodes.add(i.trim().toUpperCase());
      });
      [j.panNo, j.pan_no].forEach(p => {
        if (p && typeof p === 'string' && p.trim()) exportPanNos.add(p.trim().toUpperCase());
      });
      [j.gstin, j.gstn].forEach(g => {
        if (g && typeof g === 'string' && g.trim()) exportGstNos.add(g.trim().toUpperCase());
      });
    });

    const importOrgNames = new Set();
    const importIeCodes = new Set();
    const importPanNos = new Set();
    const importGstNos = new Set();

    importJobs.forEach((j) => {
      [j.importer_name, j.importer, j.exporter_name, j.exporter, j.organization, j.client].forEach(f => {
        if (f && typeof f === 'string' && f.trim()) importOrgNames.add(f.trim().toUpperCase());
      });
      [j.ieCode, j.iec_code].forEach(i => {
        if (i && typeof i === 'string' && i.trim()) importIeCodes.add(i.trim().toUpperCase());
      });
      [j.panNo, j.pan_no].forEach(p => {
        if (p && typeof p === 'string' && p.trim()) importPanNos.add(p.trim().toUpperCase());
      });
      [j.gstin, j.gst_no].forEach(g => {
        if (g && typeof g === 'string' && g.trim()) importGstNos.add(g.trim().toUpperCase());
      });
    });

    const usedDirectories = [];
    const unusedDirectories = [];

    directories.forEach((d) => {
      const org = (d.organization || "").trim().toUpperCase();
      const alias = (d.alias || "").trim().toUpperCase();
      const iec = (d.registrationDetails?.ieCode || "").trim().toUpperCase();
      const pan = (d.registrationDetails?.panNo || "").trim().toUpperCase();
      const gsts = (d.branchInfo || []).map(b => (b.gstNo || "").trim().toUpperCase()).filter(Boolean);

      let matched = false;

      if (org && (exportOrgNames.has(org) || importOrgNames.has(org))) matched = true;
      else if (alias && (exportOrgNames.has(alias) || importOrgNames.has(alias))) matched = true;
      else if (iec && (exportIeCodes.has(iec) || importIeCodes.has(iec))) matched = true;
      else if (pan && (exportPanNos.has(pan) || importPanNos.has(pan))) matched = true;
      else {
        for (const g of gsts) {
          if (exportGstNos.has(g) || importGstNos.has(g)) {
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

    console.log(`\nAudit Summary:`);
    console.log(`- Total Directories: ${directories.length}`);
    console.log(`- Used Directories in FY 26-27: ${usedDirectories.length}`);
    console.log(`- Unused Directories to Remove: ${unusedDirectories.length}`);

    if (unusedDirectories.length === 0) {
      console.log("No unused directories found.");
      process.exit(0);
    }

    console.log("\nDirectories to be removed:");
    unusedDirectories.forEach((d, i) => {
      console.log(`${i + 1}. [ID: ${d._id}] "${d.organization}" (IEC: ${d.registrationDetails?.ieCode || ""})`);
    });

    // 1. Create safety backup
    const backupPath = path.join(process.cwd(), "unused_directories_backup_exact_26-27.json");
    fs.writeFileSync(backupPath, JSON.stringify(unusedDirectories, null, 2));
    console.log(`\nBackup saved at: ${backupPath}`);

    // 2. Perform deletion
    const deleteIds = unusedDirectories.map((d) => d._id);
    const deleteRes = await Directory.deleteMany({ _id: { $in: deleteIds } });

    console.log(`\nSuccessfully deleted ${deleteRes.deletedCount} unused directory records from MongoDB!`);
    const finalCount = await Directory.countDocuments();
    console.log(`Final Active Directories remaining in DB: ${finalCount}`);

    process.exit(0);
  } catch (err) {
    console.error("Error executing cleanup:", err);
    process.exit(1);
  }
}

executeExactCleanup();
