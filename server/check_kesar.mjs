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

async function checkKesar() {
  await mongoose.connect(MONGODB_URI);
  if (importDbConnection.readyState !== 1) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  const kesarDir = await Directory.findOne({ organization: /KESAR INDUSTRIES/i }).lean();
  console.log("=== KESAR DIRECTORY ===");
  console.log(JSON.stringify(kesarDir, null, 2));

  if (!kesarDir) {
    console.log("Directory for KESAR INDUSTRIES not found.");
    process.exit(0);
  }

  const org = (kesarDir.organization || "").trim();
  const iec = (kesarDir.registrationDetails?.ieCode || "").trim();
  const pan = (kesarDir.registrationDetails?.panNo || "").trim();
  const gsts = (kesarDir.branchInfo || []).map((b) => (b.gstNo || "").trim()).filter(Boolean);

  console.log("\nSearching ExJobModel (year = 26-27 or date >= 2026-04-01) for:");
  console.log({ org, iec, pan, gsts });

  const yearQuery = {
    $or: [
      { year: { $regex: /26-27|2026-2027|2026-27/i } },
      { job_date: { $gte: "2026-04-01" } },
      { createdAt: { $gte: new Date("2026-04-01T00:00:00.000Z") } },
    ],
  };

  const exportJobs = await ExJobModel.find(yearQuery).lean();
  console.log(`\nSearching in ${exportJobs.length} Export Jobs 26-27...`);

  exportJobs.forEach((j) => {
    const fields = [
      j.exporter_name, j.exporter, j.organization, j.client, j.consignee_name, j.buyer_name
    ].filter(Boolean).map(s => String(s).trim());

    const matchName = fields.find(f => f.toUpperCase().includes("KESAR"));
    const matchIec = iec && [j.ieCode, j.iec_code].filter(Boolean).some(i => String(i).trim() === iec);
    const matchPan = pan && [j.panNo, j.pan_no].filter(Boolean).some(p => String(p).trim() === pan);
    const matchGst = gsts.some(g => [j.gstin, j.gstn].filter(Boolean).some(jGst => String(jGst).trim() === g));

    if (matchName || matchIec || matchPan || matchGst) {
      console.log(`Export Job Matched: JobNo="${j.job_no}", Exporter="${j.exporter_name || j.exporter}", ieCode="${j.ieCode}", panNo="${j.panNo}", gstin="${j.gstin}"`);
      console.log(`Match Reason: Name=${!!matchName}, IEC=${!!matchIec}, PAN=${!!matchPan}, GST=${!!matchGst}`);
    }
  });

  if (importDbConnection.readyState === 1) {
    const importJobs = await importDbConnection.db.collection("jobs").find(yearQuery).toArray();
    console.log(`\nSearching in ${importJobs.length} Import Jobs 26-27...`);

    importJobs.forEach((j) => {
      const fields = [
        j.importer_name, j.importer, j.exporter_name, j.exporter, j.organization, j.client
      ].filter(Boolean).map(s => String(s).trim());

      const matchName = fields.find(f => f.toUpperCase().includes("KESAR"));
      const matchIec = iec && [j.ieCode, j.iec_code].filter(Boolean).some(i => String(i).trim() === iec);
      const matchPan = pan && [j.panNo, j.pan_no].filter(Boolean).some(p => String(p).trim() === pan);
      const matchGst = gsts.some(g => [j.gstin, j.gst_no].filter(Boolean).some(jGst => String(jGst).trim() === g));

      if (matchName || matchIec || matchPan || matchGst) {
        console.log(`Import Job Matched: JobNo="${j.job_no}", Importer="${j.importer_name || j.importer}", ieCode="${j.ieCode || j.iec_code}", panNo="${j.panNo || j.pan_no}"`);
        console.log(`Match Reason: Name=${!!matchName}, IEC=${!!matchIec}, PAN=${!!matchPan}, GST=${!!matchGst}`);
      }
    });
  }

  process.exit(0);
}

checkKesar();
