import ExcelJS from "exceljs";
import ExportJob from "../model/export/ExJobModel.mjs";

/**
 * Generate DSR Report Excel Buffer for a specific exporter
 * @param {string} exporter - Exporter name
 * @param {boolean} onlyPending - If true, only include pending jobs
 * @returns {Promise<Buffer>} - Excel workbook buffer
 */
export const generateDSRBuffer = async (exporter, onlyPending = false) => {
  try {
    const isAll = String(exporter).toLowerCase() === "all";
    const filter = isAll ? {} : { exporter };
    
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
      { header: "Remarks", key: "remarks", width: 15 },
      { header: "Lcl / fcl / air", key: "consignment_type", width: 15 },
      { header: "Remarks", key: "milestone_remarks", width: 25 },
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
        milestone_remarks: job.milestones
          ?.map((m) => m.remarks)
          .filter((r) => r && r.trim() !== "")
          .join(", ") || "",
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
        net_weight: job.gross_weight_kg || 0,
        gross_weight: job.net_weight_kg || 0,
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
