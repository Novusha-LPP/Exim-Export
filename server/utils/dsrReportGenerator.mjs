import ExcelJS from "exceljs";
import ExportJob from "../model/export/ExJobModel.mjs";

/**
 * Generate DSR Report Excel Buffer for a specific exporter
 * @param {string} exporter - Exporter name
 * @param {boolean} onlyPending - If true, only include pending jobs
 * @returns {Promise<Buffer>} - Excel workbook buffer
 */
export const generateDSRBuffer = async (exporter, onlyPending = false, year = "") => {
  try {
    const isAll = String(exporter).toLowerCase() === "all";
    const filter = isAll ? {} : { exporter };

    if (year && year !== "" && year.toLowerCase() !== "all") {
      filter.year = year;
    }

    if (onlyPending) {
      filter.status = { $nin: ["Completed", "Cancelled"] };
    }

    const MAX_JOBS_FOR_REPORT = 5000; // Increased for background job

    const jobs = await ExportJob.find(filter)
      .sort({ createdAt: -1 })
      .limit(MAX_JOBS_FOR_REPORT)
      .lean();

    if (!jobs || jobs.length === 0) {
      throw new Error("No jobs found for the selected exporter");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("DSR Report");

    // Define columns
    worksheet.columns = [
      { header: "Container placement date", key: "container_placement_date", width: 22 },
      { header: "Origin docs received", key: "origin_docs_received", width: 20 },
      { header: "Handover date", key: "handover_date", width: 18 },
      { header: "Gate in at thar/khodiyar date & time", key: "gate_in_thar", width: 30 },
      { header: "Rail out date from icd (planned)", key: "rail_out_planned", width: 30 },
      { header: "Rail out date (actual)", key: "rail_out_actual", width: 20 },
      { header: "Cntr port gate in date", key: "cntr_port_gate_in", width: 22 },
      { header: "Remarks", key: "remarks", width: 30 },
      { header: "Lcl / fcl / air", key: "consignment_type", width: 15 },
      { header: "Remarks", key: "milestone_remarks", width: 65 },
      { header: "Port of origin", key: "port_of_origin", width: 20 },
      { header: "Job number", key: "job_no", width: 20 },
      { header: "Cntr 20 / 40", key: "cntr_size", width: 15 },
      { header: "Consignee name", key: "consignee_name", width: 30 },
      { header: "Exporter Ref No", key: "exporter_ref_no", width: 20 },
      { header: "Invoice no", key: "invoice_no", width: 20 },
      { header: "Invoice date", key: "invoice_date", width: 15 },
      { header: "Invoice value", key: "invoice_value", width: 15 },
      { header: "Sb number", key: "sb_no", width: 15 },
      { header: "Sb date", key: "sb_date", width: 15 },
      { header: "No of packages", key: "no_of_packages", width: 15 },
      { header: "Net weight (kgs)", key: "net_weight", width: 18 },
      { header: "Gross weight (kgs)", key: "gross_weight", width: 18 },
      { header: "Exporter", key: "exporter", width: 25 },
      { header: "Port", key: "port_details", width: 25 },
      { header: "Country", key: "country_details", width: 25 },
    ];

    // Add rows
    const formatDate = (dateStr) => {
      if (!dateStr || typeof dateStr !== 'string') return "";
      const trimmed = dateStr.trim();
      if (!trimmed) return "";

      // check if already DD-MM-YYYY
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        return trimmed;
      }

      // check if dd-MMM-yyyy (e.g. 23-Jan-2026)
      const months = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
      };
      const parts = trimmed.split(/[-/]/);
      if (parts.length >= 3) {
        let day = parts[0];
        let month = parts[1];
        let year = parts[2].split(/\s+/)[0]; // strip time if present

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

    jobs.forEach((job) => {
      const firstOp = job.operations?.[0] || {};
      const status = firstOp.statusDetails?.[0] || {};
      const firstInvoice = job.invoices?.[0] || {};

      let cntrSize = "";
      const cType = (job.consignmentType || "").toUpperCase();
      if (cType === "AIR" || cType === "LCL") {
        cntrSize = job.consignmentType;
      } else {
        const type = job.containers?.[0]?.type || "";
        const match = type.match(/20|40/);
        if (match) {
          cntrSize = match[0];
        } else {
          cntrSize = type;
        }
      }

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
      } else if (category === "FCL_DOCK") {
        if (sb_date) {
          remarksParts.push(`DOCS RECD FOR SB FILING ON ${sb_date}`);
          remarksParts.push(`SB FILED ON  ${sb_date}`);
        }
        if (gateInDate) {
          remarksParts.push(`CARGO ARRIVED AT ${location} ON ${gateInDate}`);
        }
        if (leoDate) {
          remarksParts.push(`LEO ON ${leoDate}`);
        }
        if (handoverForwardingNoteDate) {
          remarksParts.push(`D.O ON ${handoverForwardingNoteDate}`);
        }
        if (eGatePassCopyDate) {
          remarksParts.push(`STUFFING DONE`);
        }
        if (handoverForwardingNoteDate) {
          remarksParts.push(`CUST CLEARANCE DONE`);
          remarksParts.push(`CNTR H O TO ON ${handoverForwardingNoteDate}`);
        }
        if (railOutReachedDate) {
          const polStr = portOfLoading ? `POL:${portOfLoading} ` : "";
          remarksParts.push(`${polStr}CNTR RAIL OUT ON ${railOutReachedDate}`);
        }
      } else if (category === "LCL") {
        if (sb_date) {
          remarksParts.push(`DOCS RECD FOR SB FILING ON ${sb_date}`);
          remarksParts.push(`SB FILED ON  ${sb_date}`);
        }
        if (gateInDate) {
          remarksParts.push(`CARGO ARRIVED AT ${location} ON ${gateInDate}`);
        }
        if (leoDate) {
          remarksParts.push(`LEO ON ${leoDate}`);
        }
        if (handoverForwardingNoteDate) {
          remarksParts.push(`CUST CLEARANCE DONE`);
        }
        if (handoverConcorTharSanganaRailRoadDate) {
          remarksParts.push(`FILE H O TO ON ${handoverConcorTharSanganaRailRoadDate}`);
        }
      } else if (category === "FCL_FACTORY") {
        if (sb_date) {
          remarksParts.push(`DOCS RECD FOR SB FILING ON ${sb_date}`);
          remarksParts.push(`SB FILED ON  ${sb_date}`);
        }
        if (gateInDate) {
          remarksParts.push(`FS CNTR ARRIVED AT ${location} ON ${gateInDate}`);
        }
        if (leoDate) {
          remarksParts.push(`LEO ON ${leoDate}`);
        }
        if (handoverForwardingNoteDate) {
          remarksParts.push(`CUST CLEARANCE DONE`);
          remarksParts.push(`CNTR H O TO ON ${handoverForwardingNoteDate}`);
        }
        if (railOutReachedDate) {
          const polStr = portOfLoading ? `POL:${portOfLoading} ` : "";
          remarksParts.push(`${polStr}CNTR RAIL OUT ON ${railOutReachedDate}`);
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

      worksheet.addRow({
        container_placement_date: status.containerPlacementDate || "",
        origin_docs_received: job.job_date || "",
        handover_date: status.handoverForwardingNoteDate || "",
        gate_in_thar: status.gateInDate || "",
        rail_out_planned: status.handoverConcorTharSanganaRailRoadDate || "",
        rail_out_actual: status.railOutReachedDate || "",
        cntr_port_gate_in: status.gateInDate || "",
        remarks: job.customerremark,
        consignment_type: job.consignmentType || "",
        milestone_remarks: milestoneRemarksStr,
        port_of_origin: job.custom_house || "",
        job_no: job.job_no || "",
        cntr_size: cntrSize,
        consignee_name: job.consignees?.[0]?.consignee_name || "",
        exporter_ref_no: job.exporter_ref_no || "",
        invoice_no: firstInvoice.invoiceNumber || "",
        invoice_date: firstInvoice.invoiceDate || "",
        invoice_value: firstInvoice.invoiceValue || 0,
        sb_no: job.sb_no || "",
        sb_date: job.sb_date || "",
        no_of_packages: job.total_no_of_pkgs || 0,
        net_weight: job.net_weight_kg || 0,
        gross_weight: job.gross_weight_kg || 0,
        exporter: job.exporter || "",
        port_details: `Destination: ${job.destination_port || ""}\nDischarge: ${job.port_of_discharge || ""}`,
        country_details: `Destination: ${job.destination_country || ""}\nDischarge: ${job.discharge_country || ""}`,
      });
    });

    // Style the header
    const headerRow = worksheet.getRow(1);
    headerRow.height = 60;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11, color: { argb: "FF000000" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });

    // Set Column Widths
    worksheet.columns.forEach(column => {
      column.width = column.width || 15;
    });

    // Apply borders
    worksheet.eachRow((row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      });
    });

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    console.error("Error generating DSR buffer:", error);
    throw error;
  }
};
