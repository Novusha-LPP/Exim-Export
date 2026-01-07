import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { IconButton, Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import logo from "../../../../assets/images/logo.png";

const FileCoverGenerator = ({ jobNo, children }) => {
  const generateFileCover = async (e) => {
    if (e) e.stopPropagation();

    try {
      const encodedJobNo = encodeURIComponent(jobNo);
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const data = response.data;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Helper to parse dates like "DD-MM-YYYY" or ISO strings
      const parseDateSafe = (dateStr) => {
        if (!dateStr) return null;
        if (dateStr instanceof Date) return dateStr;

        // Handle DD-MM-YYYY
        if (typeof dateStr === 'string' && /^\d{1,2}-\d{1,2}-\d{4}/.test(dateStr)) {
          const [d, m, y] = dateStr.split('-');
          return new Date(y, m - 1, d);
        }

        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      };

      const formatDate = (date, options = { day: "2-digit", month: "short", year: "numeric" }) => {
        const d = parseDateSafe(date);
        if (!d) return "Invalid Date";
        return d.toLocaleDateString("en-GB", options);
      };

      // ==================== HEADER ====================
      // Composite Header Logo (Branding + Subtext + AEO)
      try {
        // Adjusted dimensions (wider) to fit the new full-header logo
        doc.addImage(logo, "PNG", 8, 10, 110, 26);
      } catch (err) {
        console.warn("Logo add failed", err);
      }

      // Job No (Top Center)
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const jobNoText = `JOB NO. ${data.job_no || ""}`;
      const jobNoWidth = doc.getTextWidth(jobNoText);
      doc.text(jobNoText, (pageWidth - jobNoWidth) / 2, 8);


      // Address Block (Right Aligned)
      const rightMargin = 15;
      const addressX = 130;
      doc.setFontSize(10);
      doc.text("A-204 to 207, Wall Street - II,", addressX, 15);
      doc.text("Opp. Orient Club, Ellis Bridge,", addressX, 19);
      doc.text("Ahmedabad - 380 006.", addressX, 23);
      doc.text("Phone : (079) 2640 1929 / 2640 2005 / 6", addressX, 27);
      doc.setTextColor(0, 0, 0);
      doc.text("Email : info@surajforwarders.com", addressX, 31);

      // CHA License Box (Bottom Right of Header)
      doc.setFillColor(0, 0, 139); // Dark Blue
      doc.rect(addressX, 33, 72, 6, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("CHA LICENCE NO : ABOFS1766LCH005", addressX + 2, 37.2);
      doc.setTextColor(0, 0, 0);

      let yPos = 45;

      // ==================== MAIN TABLE ====================
      // Mapping Data
      const invoice = data.invoices?.[0] || {};
      const sbNo = data.sb_no || "";
      const sbDate = formatDate(data.sb_date);
      const invoiceNo = invoice.invoiceNumber || "";
      const invoiceDate = formatDate(invoice.invoiceDate);
      const pod = data.port_of_discharge || "";

      // Packages
      const pkgs = `${data.total_no_of_pkgs || "0"} ${data.package_unit || ""}`;

      // Description (First product)
      const description = invoice.products?.[0]?.description || "";

      // Weights
      const grossWeight = `${data.gross_weight_kg || "0"} KGS`;
      const netWeight = `${data.net_weight_kg || "0"} KGS`;

      // LEO Date lookup in operations -> statusDetails
      const activeOp = data.operations?.[0] || {};
      const statusDetails = activeOp.statusDetails?.[0] || {};

      const leoDateRaw = statusDetails.leoDate || "";
      const leoDate = formatDate(leoDateRaw);
      const refNo = data.exporter_ref_no || invoiceNo; // Fallback to invoice if ref missing

      // EGM
      const egmNo = data.egm_no || "";
      const egmDate = formatDate(data.egm_date, { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, '-');

      // Port Loading
      const pol = data.port_of_loading || "";

      // LCL/FCL and Rail/Road
      const mode = data.consignmentType || "";
      const railing = statusDetails.railRoad || statusDetails.concorPrivate || "";

      doc.autoTable({
        startY: yPos,
        theme: "grid",
        styles: {
          lineColor: [255, 0, 0], // Red borders as per screenshot
          lineWidth: 0.8,
          textColor: [0, 0, 0],
          font: "helvetica",
          fontSize: 11,
          cellPadding: 2.5, // Compact
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { fontStyle: "bold", width: 35 },
          1: { width: 60 },
          2: { fontStyle: "bold", width: 35 },
          3: { width: 60 },
        },
        body: [
          [
            { content: "Exporter:", styles: { textColor: [0, 0, 0] } },
            {
              content: data.exporter || "",
              colSpan: 3,
              styles: { fontStyle: "bold", fontSize: 13, textColor: [0, 0, 0] },
            },
          ],
          [
            "Shipping Bill No.:",
            { content: sbNo, styles: { fontStyle: "bold" } },
            "Date:",
            { content: sbDate, styles: { fontStyle: "bold" } },
          ],
          [
            "Invoice No:",
            { content: invoiceNo, styles: { fontStyle: "bold" } },
            "Date:",
            { content: invoiceDate, styles: { fontStyle: "bold" } },
          ],
          [
            "Port of Discharge:",
            { content: pod, styles: { fontStyle: "bold" } },
            "Packages:",
            { content: pkgs, styles: { fontStyle: "bold" } },
          ],
          [
            "Description:",
            {
              content: description,
              colSpan: 3,
              styles: { fontStyle: "bold", fontSize: 12 },
            },
          ],
          [
            "Gross Weight",
            { content: grossWeight, styles: { fontStyle: "bold" } },
            "Net Weight",
            { content: netWeight, styles: { fontStyle: "bold" } },
          ],
          [
            "LEO Date :",
            { content: leoDate, styles: { fontStyle: "bold" } },
            "Ref No:",
            { content: refNo, styles: { fontStyle: "bold" } },
          ],
          [
            "EGM No:",
            { content: egmNo, styles: { fontStyle: "bold" } },
            "Date:",
            { content: egmDate, styles: { fontStyle: "bold" } },
          ],
          [
            "Port of Loading:",
            { content: pol, styles: { fontStyle: "bold" } },
            {
              content: "LCL/FCL-SS/ICD",
              styles: { fontStyle: "boldItalic", halign: "center" },
            },
            {
              content: "Rail / Road",
              styles: { fontStyle: "boldItalic", halign: "center" },
            },
          ],
          [
            "",
            "",
            { content: mode, styles: { fontStyle: "bold", halign: "center" } },
            { content: railing, styles: { fontStyle: "bold", halign: "center" } },
          ],
        ],
      });

      // Second Table: Container Details
      // Need to adjust startY
      yPos = doc.lastAutoTable.finalY + 0.5; // connect tables? screenshot shows connected.

      // Prepare container data
      const containers =
        data.containers?.length > 0 ? data.containers : (data.operations?.[0]?.containerDetails || []);
      // If containers empty, add one empty row
      const containerRows =
        containers.length > 0
          ? containers
          : [{ containerNo: "", containerSize: "", sealNo: "" }];

      // Booking Details for S/Line Seal No
      const booking = data.operations?.[0]?.bookingDetails?.[0] || {};
      const sLineSealNo = booking.shippingLineSealNo || "";

      const containerBody = containerRows.map((c) => [
        c.containerNo || "",
        c.containerSize || c.type || c.size || "20",
        c.sealNo || "", // Customs Seal
        sLineSealNo, // S/Line Seal (Same for all containers usually, or per container if structured differently later)
      ]);

      doc.autoTable({
        startY: yPos,
        theme: "grid",
        styles: {
          lineColor: [255, 0, 0],
          lineWidth: 0.8,
          textColor: [0, 0, 0],
          font: "helvetica",
          fontSize: 12,
          cellPadding: 2.5,
          minCellHeight: 10,
        },
        head: [["Container No", "Size", "Customs Seal No", "S/Line Seal No"]],
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0], // Black text
          fontStyle: "boldItalic",
          lineColor: [255, 0, 0],
          lineWidth: 0.8,
        },
        body: containerBody,
        columnStyles: {
          0: { width: 50, fontStyle: "bold" },
          1: { width: 20, halign: "center" },
          2: { width: 60, fontStyle: "bold" },
          3: { width: 60 },
        },
      });

      // Instead of saving directly, create a blob and open a preview window
      const filename = `FileCover_${data.job_no || "Job"}.pdf`;
      const pdfBlob = doc.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);

      const newTab = window.open("", "_blank");
      if (newTab) {
        newTab.document.write(
          `<html>
            <head>
              <title>${filename}</title>
              <style>
                body, html { margin: 0; padding: 0; height: 100%; font-family: Arial, sans-serif; }
                .header { 
                  background-color: #f5f5f5; 
                  padding: 10px 20px; 
                  border-bottom: 1px solid #ddd;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .filename { font-weight: bold; color: #333; }
                .download-btn {
                  background-color: #007bff;
                  color: white;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 4px;
                  cursor: pointer;
                  text-decoration: none;
                  font-size: 14px;
                }
                .download-btn:hover { background-color: #0056b3; }
                .pdf-container { height: calc(100% - 50px); }
                iframe { border: none; width: 100%; height: 100%; }
              </style>
            </head>
            <body>
              <div class="header">
                <span class="filename">${filename}</span>
                <a href="${blobUrl}" download="${filename}" class="download-btn">Download PDF</a>
              </div>
              <div class="pdf-container">
                <iframe src="${blobUrl}" type="application/pdf"></iframe>
              </div>
              <script>
                window.addEventListener('beforeunload', function() {
                  URL.revokeObjectURL('${blobUrl}');
                });
              </script>
            </body>
          </html>`
        );

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 300000); // Revoke after 5 minutes
      }
    } catch (error) {
      console.error("Error generating File Cover:", error);
      alert("Failed to generate File Cover PDF");
    }
  };

  return (
    <>
      {children ? (
        React.cloneElement(children, {
          onClick: (e) => {
            if (children.props.onClick) children.props.onClick(e);
            generateFileCover(e);
          },
        })
      ) : (
        <Button onClick={generateFileCover} variant="contained">
          Generate File Cover
        </Button>
      )}
    </>
  );
};

export default FileCoverGenerator;
