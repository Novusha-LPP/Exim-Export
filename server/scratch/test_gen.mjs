import mongoose from 'mongoose';
import ExJobModel from '../model/export/ExJobModel.mjs';

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/export";

const formatDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return "";
  const trimmed = dateStr.trim();
  if (!trimmed) return "";

  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  const months = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };
  const parts = trimmed.split(/[-/]/);
  if (parts.length >= 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2].split(/\s+/)[0];

    if (day.length === 1) day = "0" + day;

    const lowerMonth = month.toLowerCase();
    if (months[lowerMonth]) {
      month = months[lowerMonth];
    } else if (months[lowerMonth.substring(0, 3)]) {
      month = months[lowerMonth.substring(0, 3)];
    } else if (month.length === 1) {
      month = "0" + month;
    }

    if (year.length === 2) {
      year = "20" + year;
    }

    if (/^\d{2}$/.test(day) && /^\d{2}$/.test(month) && /^\d{4}$/.test(year)) {
      return `${day}-${month}-${year}`;
    }
  }

  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch (e) { }

  return trimmed;
};

const cleanPort = (portStr) => {
  if (!portStr) return "";
  const parts = portStr.split("-");
  const name = parts[parts.length - 1].trim();
  return name.toUpperCase();
};

async function test() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected.");

  const jobs = await ExJobModel.find({ consignmentType: /AIR/i })
    .sort({ createdAt: -1 })
    .lean();

  console.log(`Found ${jobs.length} total AIR jobs in database.`);

  let printedCount = 0;
  for (const job of jobs) {
    const firstOp = job.operations?.[0] || {};
    const status = firstOp.statusDetails?.[0] || {};

    const sb_date = formatDate(job.sb_date);
    const gateInDate = formatDate(status.gateInDate);
    const leoDate = formatDate(status.leoDate);
    const handoverForwardingNoteDate = formatDate(status.handoverForwardingNoteDate);
    const handoverConcorTharSanganaRailRoadDate = formatDate(status.handoverConcorTharSanganaRailRoadDate);
    const eGatePassCopyDate = formatDate(status.eGatePassCopyDate);
    const railOutReachedDate = formatDate(status.railOutReachedDate);
    const portOfLoading = cleanPort(job.port_of_loading);

    const customHouse = (job.custom_house || "").toUpperCase().trim();
    const location = customHouse.startsWith("ICD") ? customHouse.replace(/\s+/g, "-") : (customHouse || "ICD-SANAND");

    const rawConsignmentType = (job.consignmentType || "").toUpperCase();
    const stuffedAt = (job.goods_stuffed_at || "").toUpperCase();

    let category = "";
    if (rawConsignmentType === "AIR") {
      category = "AIR";
    } else if (rawConsignmentType === "LCL") {
      category = "LCL";
    } else if (rawConsignmentType === "FCL") {
      if (stuffedAt === "FACTORY") {
        category = "FCL_FACTORY";
      } else {
        category = "FCL_DOCK";
      }
    } else {
      if (rawConsignmentType.includes("AIR")) {
        category = "AIR";
      } else if (rawConsignmentType.includes("LCL")) {
        category = "LCL";
      } else if (rawConsignmentType.includes("FACTORY")) {
        category = "FCL_FACTORY";
      } else if (rawConsignmentType.includes("DOCK") || rawConsignmentType.includes("FCL")) {
        category = "FCL_DOCK";
      }
    }

    const remarksParts = [];

    if (category === "AIR") {
      if (sb_date) {
        remarksParts.push(`DOCS RECD FOR SB FILING ON ${sb_date}`);
        remarksParts.push(`SB FILED ON  ${sb_date}`);
      }
      if (gateInDate) {
        remarksParts.push(`CARGO ARRIVED AT AIRPORT ON ${gateInDate}`);
      }
      if (leoDate) {
        remarksParts.push(`LEO ON ${leoDate}`);
      }
      if (handoverForwardingNoteDate) {
        remarksParts.push(`CUST CLEARANCE DONE`);
      }
      if (handoverConcorTharSanganaRailRoadDate) {
        remarksParts.push(`FILE H O TO ${handoverConcorTharSanganaRailRoadDate}`);
      }
    }

    let milestoneRemarksStr = "";
    if (remarksParts.length > 0) {
      milestoneRemarksStr = remarksParts.join(", ") + ".";
    } else {
      milestoneRemarksStr = job.milestones
        ?.map((m) => m.remarks)
        .filter((r) => r && r.trim() !== "")
        .join(", ") || "";
    }

    // Only print jobs that actually have some populated dates or milestone remarks to verify
    if (sb_date || gateInDate || leoDate || milestoneRemarksStr) {
      printedCount++;
      if (printedCount <= 10) {
        console.log(`\nJob ${job.job_no}:`);
        console.log("Raw consignmentType:", job.consignmentType);
        console.log("sb_date:", job.sb_date, "->", sb_date);
        console.log("gateInDate:", status.gateInDate, "->", gateInDate);
        console.log("leoDate:", status.leoDate, "->", leoDate);
        console.log("handoverForwardingNoteDate:", status.handoverForwardingNoteDate, "->", handoverForwardingNoteDate);
        console.log("Calculated Milestone Remarks:", milestoneRemarksStr);
      }
    }
  }
  console.log(`\nPrinted ${printedCount} populated AIR jobs.`);

  await mongoose.disconnect();
}

test();
