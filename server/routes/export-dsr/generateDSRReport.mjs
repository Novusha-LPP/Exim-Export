import { generateDSRBuffer, generateTableDSRBuffer } from "../../utils/dsrReportGenerator.mjs";
import express from "express";

const router = express.Router();

/**
 * Generate DSR Report Excel for a specific exporter
 */
router.get("/api/export-dsr/generate-dsr-report", async (req, res) => {
  try {
    const { exporter, onlyPending, year, startDate, endDate, status, format } = req.query;

    if (!exporter) {
      return res.status(400).json({
        success: false,
        error: "Exporter name is required",
      });
    }

    const isAll = String(exporter).toLowerCase() === "all";
    const isTableFormat = String(format).toLowerCase() === "table";

    const buffer = isTableFormat
      ? await generateTableDSRBuffer(exporter, onlyPending === "true", year, startDate, endDate, status || "all")
      : await generateDSRBuffer(exporter, onlyPending === "true", year, startDate, endDate, status || "all");

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    const prefix = isTableFormat ? "Table_DSR" : "DSR_Report";
    const safeExporterName = isAll ? "All_Exporters" : exporter.replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${prefix}_${safeExporterName}_${dateStr}.xlsx"`,
    );

    res.send(buffer);
  } catch (error) {
    if (error.message === "No jobs found for the selected exporter") {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    console.error("Error generating DSR report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate DSR report",
    });
  }
});

export default router;
