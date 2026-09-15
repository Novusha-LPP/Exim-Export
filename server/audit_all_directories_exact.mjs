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

async function auditExact() {
  await mongoose.connect(MONGODB_URI);
  if (importDbConnection.readyState !== 1) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  const directories = await Directory.find({}).lean();
  console.log(`Total Directories in DB: ${directories.length}`);

  // Standard Export Jobs for 26-27 (excluding isGeneralJob: true)
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
  console.log(`Standard Export Jobs in FY 26-27: ${exportJobs.length}`);

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
    console.log(`Import Jobs in FY 26-27: ${importJobs.length}`);
  }

  // Exact sets of job identifiers (case-insensitive, trimmed)
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

    let matchReason = null;

    if (org && (exportOrgNames.has(org) || importOrgNames.has(org))) {
      matchReason = `Org Name match: "${org}"`;
    } else if (alias && (exportOrgNames.has(alias) || importOrgNames.has(alias))) {
      matchReason = `Alias match: "${alias}"`;
    } else if (iec && (exportIeCodes.has(iec) || importIeCodes.has(iec))) {
      matchReason = `IEC match: "${iec}"`;
    } else if (pan && (exportPanNos.has(pan) || importPanNos.has(pan))) {
      matchReason = `PAN match: "${pan}"`;
    } else {
      for (const g of gsts) {
        if (exportGstNos.has(g) || importGstNos.has(g)) {
          matchReason = `GST match: "${g}"`;
          break;
        }
      }
    }

    if (matchReason) {
      usedDirectories.push({ id: d._id, org: d.organization, matchReason });
    } else {
      unusedDirectories.push({ id: d._id, org: d.organization, iec, pan, status: d.approvalStatus, created: d.createdAt });
    }
  });

  console.log(`\n=== STRICT EXACT AUDIT RESULTS ===`);
  console.log(`Total Directories: ${directories.length}`);
  console.log(`Used Directories in Standard 26-27 Jobs: ${usedDirectories.length}`);
  console.log(`Unused Directories (NO Standard 26-27 Jobs): ${unusedDirectories.length}`);

  console.log(`\nUnused Directories List (${unusedDirectories.length}):`);
  unusedDirectories.forEach((u, i) => {
    console.log(`${i + 1}. [ID: ${u.id}] "${u.org}" (IEC: "${u.iec}", PAN: "${u.pan}", Status: "${u.status}", Created: ${u.created})`);
  });

  process.exit(0);
}

auditExact();
