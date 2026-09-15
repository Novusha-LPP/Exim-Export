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

async function verify() {
  await mongoose.connect(MONGODB_URI);
  if (importDbConnection.readyState !== 1) {
    await new Promise((r) => {
      importDbConnection.once("connected", r);
      setTimeout(r, 3000);
    });
  }

  const directories = await Directory.find({}).lean();

  const yearQuery = {
    $or: [
      { year: { $regex: /26-27|2026-2027|2026-27/i } },
      { job_date: { $gte: "2026-04-01" } },
      { createdAt: { $gte: new Date("2026-04-01T00:00:00.000Z") } },
    ],
  };

  const selectFields = "exporter_name exporter importer_name importer organization client consignee_name buyer_name notify_name shipper ieCode iec_code iecNo iec_no panNo pan_no pan gstin gstn gst_no gstNo";

  const exportJobs = await ExJobModel.find(yearQuery).select(selectFields).lean();

  let importJobs = [];
  if (importDbConnection.readyState === 1) {
    importJobs = await importDbConnection.db.collection("jobs").find(yearQuery, {
      projection: {
        exporter_name: 1, exporter: 1, importer_name: 1, importer: 1, organization: 1, client: 1,
        consignee_name: 1, buyer_name: 1, notify_name: 1, shipper: 1, ieCode: 1, iec_code: 1, iecNo: 1, iec_no: 1,
        panNo: 1, pan_no: 1, pan: 1, gstin: 1, gstn: 1, gst_no: 1, gstNo: 1
      }
    }).toArray();
  }

  console.log(`Analyzing ${directories.length} directories against ${exportJobs.length} export jobs and ${importJobs.length} import jobs for FY 26-27...`);

  const jobNormNames = new Set();
  const jobRawNames = new Set();
  const jobIecCodes = new Set();
  const jobPanNos = new Set();
  const jobGstNos = new Set();

  function addJobFields(j) {
    const fields = [
      j.exporter_name, j.exporter, j.importer_name, j.importer, j.organization, j.client, j.consignee_name, j.buyer_name, j.notify_name, j.shipper
    ];
    fields.forEach(f => {
      if (f && typeof f === 'string') {
        const trimmed = f.trim();
        if (trimmed) {
          jobRawNames.add(trimmed.toUpperCase());
          const norm = normalizeName(trimmed);
          if (norm) jobNormNames.add(norm);
        }
      }
    });

    const iecs = [j.ieCode, j.iec_code, j.iecNo, j.iec_no];
    iecs.forEach(i => {
      if (i && typeof i === 'string' && i.trim()) jobIecCodes.add(i.trim().toUpperCase());
    });

    const pans = [j.panNo, j.pan_no, j.pan];
    pans.forEach(p => {
      if (p && typeof p === 'string' && p.trim()) jobPanNos.add(p.trim().toUpperCase());
    });

    const gsts = [j.gstin, j.gstn, j.gst_no, j.gstNo];
    gsts.forEach(g => {
      if (g && typeof g === 'string' && g.trim()) jobGstNos.add(g.trim().toUpperCase());
    });
  }

  exportJobs.forEach(addJobFields);
  importJobs.forEach(addJobFields);

  const used = [];
  const unused = [];

  directories.forEach(d => {
    const org = (d.organization || "").trim().toUpperCase();
    const alias = (d.alias || "").trim().toUpperCase();
    const iec = (d.registrationDetails?.ieCode || "").trim().toUpperCase();
    const pan = (d.registrationDetails?.panNo || "").trim().toUpperCase();
    const normOrg = normalizeName(org);
    const normAlias = normalizeName(alias);
    const gsts = (d.branchInfo || []).map(b => (b.gstNo || "").trim().toUpperCase()).filter(Boolean);

    let match = null;
    if (org && jobRawNames.has(org)) match = `Exact Org Match: "${org}"`;
    else if (alias && jobRawNames.has(alias)) match = `Exact Alias Match: "${alias}"`;
    else if (iec && jobIecCodes.has(iec)) match = `IEC Match: "${iec}"`;
    else if (pan && jobPanNos.has(pan)) match = `PAN Match: "${pan}"`;
    else if (normOrg && jobNormNames.has(normOrg)) match = `Normalized Org Match: "${org}" -> "${normOrg}"`;
    else if (normAlias && jobNormNames.has(normAlias)) match = `Normalized Alias Match: "${alias}" -> "${normAlias}"`;
    else {
      for (const g of gsts) {
        if (jobGstNos.has(g)) {
          match = `GST Match: "${g}"`;
          break;
        }
      }
    }

    if (match) {
      used.push({ id: d._id, org: d.organization, iec, pan, match });
    } else {
      unused.push({ id: d._id, org: d.organization, iec, pan, status: d.approvalStatus, created: d.createdAt });
    }
  });

  console.log(`\nResults:`);
  console.log(`Total Directories: ${directories.length}`);
  console.log(`Used Directories in FY 26-27: ${used.length}`);
  console.log(`Unused Directories in FY 26-27: ${unused.length}`);

  console.log(`\nUnused Directories List (${unused.length}):`);
  unused.forEach((u, i) => {
    console.log(`${i+1}. [ID: ${u.id}] "${u.org}" (IEC: ${u.iec || 'N/A'}, PAN: ${u.pan || 'N/A'}, Status: ${u.status}, Created: ${u.created})`);
  });

  process.exit(0);
}

verify();
