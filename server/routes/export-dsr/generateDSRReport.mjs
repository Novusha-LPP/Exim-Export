import ExcelJS from "exceljs";
import ExportJob from "../../model/export/ExJobModel.mjs";
import express from "express";

const router = express.Router();

/**
 * Generate DSR Report Excel for a specific exporter
 */
router.get("/api/export-dsr/generate-dsr-report", async (req, res) => {
    try {
        const { exporter } = req.query;

        if (!exporter) {
            return res.status(400).json({
                success: false,
                error: "Exporter name is required",
            });
        }

        // Fetch jobs for the selected exporter
        const jobs = await ExportJob.find({ exporter: exporter })
            .sort({ createdAt: -1 })
            .lean();

        if (!jobs || jobs.length === 0) {
            return res.status(404).json({
                success: false,
                error: "No jobs found for the selected exporter",
            });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("DSR Report");

        // Define columns strictly as per requirement
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
            { header: "Milestone remarks", key: "milestone_remarks", width: 25 },
            { header: "Exporter", key: "exporter", width: 30 },
            { header: "Port of origin", key: "port_of_origin", width: 20 },
            { header: "Job number", key: "job_no", width: 20 },
            { header: "Docs recd date", key: "docs_recd_date", width: 20 },
            { header: "Cntr 20 / 40", key: "cntr_size", width: 15 },
            { header: "Consignee name", key: "consignee_name", width: 30 },
            { header: "Invoice no", key: "invoice_no", width: 20 },
            { header: "Invoice date", key: "invoice_date", width: 15 },
            { header: "Invoice value", key: "invoice_value", width: 15 },
            { header: "Sb number", key: "sb_no", width: 15 },
            { header: "Sb date", key: "sb_date", width: 15 },
            { header: "No of packages", key: "no_of_packages", width: 15 },
            { header: "Net weight (kgs)", key: "net_weight", width: 18 },
            { header: "Gross weight (kgs)", key: "gross_weight", width: 18 },
            { header: "Port of destination", key: "port_of_destination", width: 20 },
            { header: "Country", key: "country", width: 20 },
        ];

        // Add rows
        jobs.forEach((job) => {
            const firstOp = job.operations?.[0] || {};
            const status = firstOp.statusDetails?.[0] || {};
            const transporter = firstOp.transporterDetails?.[0] || {};
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
                gate_in_thar: transporter.gateInDate || "",
                rail_out_planned: status.handoverConcorTharSanganaRailRoadDate || "",
                rail_out_actual: status.railOutReachedDate || "",
                cntr_port_gate_in: transporter.gateInDate || "",
                remarks: "",
                consignment_type: job.consignmentType || "",
                milestone_remarks: job.milestoneremarks || "",
                exporter: job.exporter || "",
                port_of_origin: job.custom_house || "",
                job_no: job.job_no || "",
                docs_recd_date: transporter.gateInDate || "",
                cntr_size: cntrSize,
                consignee_name: job.consignees?.[0]?.consignee_name || "",
                invoice_no: firstInvoice.invoiceNumber || "",
                invoice_date: firstInvoice.invoiceDate || "",
                invoice_value: firstInvoice.invoiceValue || 0,
                sb_no: job.sb_no || "",
                sb_date: job.sb_date || "",
                no_of_packages: job.total_no_of_pkgs || 0,
                net_weight: job.gross_weight_kg || 0, // Swapped as per requirement
                gross_weight: job.net_weight_kg || 0, // Swapped as per requirement
                port_of_destination: job.destination_port || job.port_of_discharge || "",
                country: job.destination_country || job.discharge_country || "",
            });
        });

        // Style the header
        const headerRow = worksheet.getRow(1);
        headerRow.height = 45; // Increased height for wrapped text
        headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFFF00" }, // Bright Yellow
            };
            cell.alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true // Enable newline for long headers
            };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
        });

        // Set narrower widths for specific columns to force wrapping as seen in screenshot
        worksheet.getColumn('container_placement_date').width = 12;
        worksheet.getColumn('origin_docs_received').width = 12;
        worksheet.getColumn('handover_date').width = 12;
        worksheet.getColumn('gate_in_thar').width = 15;
        worksheet.getColumn('rail_out_planned').width = 15;
        worksheet.getColumn('rail_out_actual').width = 10;
        worksheet.getColumn('cntr_port_gate_in').width = 15;
        worksheet.getColumn('remarks').width = 12;
        worksheet.getColumn('consignment_type').width = 10;
        worksheet.getColumn('milestone_remarks').width = 15;
        worksheet.getColumn('cntr_size').width = 10;

        // Set response headers
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="DSR_Report_${exporter}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error generating DSR report:", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate DSR report",
        });
    }
});

export default router;
