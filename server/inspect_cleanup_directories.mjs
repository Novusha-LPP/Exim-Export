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

async function inspect() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to Export DB:", MONGODB_URI.split("@").pop());

    if (importDbConnection.readyState !== 1) {
      await new Promise((resolve) => {
        importDbConnection.once("connected", resolve);
        setTimeout(resolve, 3000);
      });
    }

    // 1. All directories
    const directories = await Directory.find({}).lean();
    console.log(`\n=== DIRECTORIES ===`);
    console.log(`Total Directories: ${directories.length}`);

    // Year matching regex: 26-27, 2026-2027, 2026-27
    const yearQuery = {
      $or: [
        { year: { $regex: /26-27|2026-2027|2026-27/i } },
        { job_date: { $gte: "2026-04-01" } },
        { createdAt: { $gte: new Date("2026-04-01T00:00:00.000Z") } },
      ],
    };

    // 2. Fetch Export jobs 26-27 with projection
    const exportJobs2627 = await ExJobModel.find(yearQuery)
      .select("exporter_name exporter organization client consignee_name ieCode panNo pan_no gstin gstn year")
      .lean();
    console.log(`Export Jobs in FY 26-27: ${exportJobs2627.length}`);

    const exportOrgNames = new Set();
    const exportIeCodes = new Set();
    const exportPanNos = new Set();
    const exportGstNos = new Set();

    exportJobs2627.forEach((job) => {
      if (job.exporter_name) exportOrgNames.add(job.exporter_name.trim().toLowerCase());
      if (job.exporter) exportOrgNames.add(job.exporter.trim().toLowerCase());
      if (job.organization) exportOrgNames.add(job.organization.trim().toLowerCase());
      if (job.client) exportOrgNames.add(job.client.trim().toLowerCase());

      if (job.ieCode) exportIeCodes.add(job.ieCode.trim().toLowerCase());
      if (job.panNo || job.pan_no) exportPanNos.add((job.panNo || job.pan_no).trim().toLowerCase());
      if (job.gstin || job.gstn) exportGstNos.add((job.gstin || job.gstn).trim().toLowerCase());
    });

    // 3. Fetch Import jobs 26-27
    let importJobs2627 = [];
    if (importDbConnection.readyState === 1) {
      const importColl = importDbConnection.db.collection("jobs");
      importJobs2627 = await importColl.find(yearQuery, {
        projection: {
          importer_name: 1,
          importer: 1,
          exporter_name: 1,
          exporter: 1,
          organization: 1,
          client: 1,
          ieCode: 1,
          iec_code: 1,
          panNo: 1,
          pan_no: 1,
          gstin: 1,
          gst_no: 1,
          year: 1,
        }
      }).toArray();
      console.log(`Import Jobs in FY 26-27: ${importJobs2627.length}`);
    }

    const importOrgNames = new Set();
    const importIeCodes = new Set();
    const importPanNos = new Set();
    const importGstNos = new Set();

    importJobs2627.forEach((job) => {
      if (job.importer_name) importOrgNames.add(job.importer_name.trim().toLowerCase());
      if (job.importer) importOrgNames.add(job.importer.trim().toLowerCase());
      if (job.exporter_name) importOrgNames.add(job.exporter_name.trim().toLowerCase());
      if (job.exporter) importOrgNames.add(job.exporter.trim().toLowerCase());
      if (job.organization) importOrgNames.add(job.organization.trim().toLowerCase());
      if (job.client) importOrgNames.add(job.client.trim().toLowerCase());

      if (job.ieCode || job.iec_code) importIeCodes.add((job.ieCode || job.iec_code).trim().toLowerCase());
      if (job.panNo || job.pan_no) importPanNos.add((job.panNo || job.pan_no).trim().toLowerCase());
      if (job.gstin || job.gst_no) importGstNos.add((job.gstin || job.gst_no).trim().toLowerCase());
    });

    // Match Directories against FY 26-27 jobs
    const matchedDirectories = [];
    const unusedDirectories = [];

    directories.forEach((dir) => {
      const orgName = (dir.organization || "").trim().toLowerCase();
      const alias = (dir.alias || "").trim().toLowerCase();
      const ieCode = (dir.registrationDetails?.ieCode || "").trim().toLowerCase();
      const panNo = (dir.registrationDetails?.panNo || "").trim().toLowerCase();
      const gstNos = (dir.branchInfo || [])
        .map((b) => (b.gstNo || "").trim().toLowerCase())
        .filter(Boolean);

      let matchedReason = null;

      // Match check
      if (orgName && (exportOrgNames.has(orgName) || importOrgNames.has(orgName))) {
        matchedReason = `Org Name match: "${dir.organization}"`;
      } else if (alias && (exportOrgNames.has(alias) || importOrgNames.has(alias))) {
        matchedReason = `Alias match: "${dir.alias}"`;
      } else if (ieCode && (exportIeCodes.has(ieCode) || importIeCodes.has(ieCode))) {
        matchedReason = `IE Code match: "${dir.registrationDetails.ieCode}"`;
      } else if (panNo && (exportPanNos.has(panNo) || importPanNos.has(panNo))) {
        matchedReason = `PAN match: "${dir.registrationDetails.panNo}"`;
      } else {
        for (const gst of gstNos) {
          if (exportGstNos.has(gst) || importGstNos.has(gst)) {
            matchedReason = `GST match: "${gst}"`;
            break;
          }
        }
      }

      if (matchedReason) {
        matchedDirectories.push({ dir, reason: matchedReason });
      } else {
        unusedDirectories.push(dir);
      }
    });

    console.log(`\n=== MATCHING SUMMARY ===`);
    console.log(`Total Directories: ${directories.length}`);
    console.log(`Used Directories (in FY 26-27 jobs): ${matchedDirectories.length}`);
    console.log(`Unused Directories (NOT in FY 26-27 jobs): ${unusedDirectories.length}`);

    console.log(`\n=== UNUSED DIRECTORIES DETAILS ===`);
    unusedDirectories.forEach((d, idx) => {
      console.log(
        `${idx + 1}. [ID: ${d._id}] Org: "${d.organization}", Alias: "${d.alias || ""}", IEC: "${
          d.registrationDetails?.ieCode || ""
        }", PAN: "${d.registrationDetails?.panNo || ""}", Status: "${d.approvalStatus}", Created: ${d.createdAt}`
      );
    });

    process.exit(0);
  } catch (err) {
    console.error("Inspection error:", err);
    process.exit(1);
  }
}

inspect();
