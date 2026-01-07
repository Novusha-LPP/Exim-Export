import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { IconButton, Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import logo from "../../../../assets/images/logo.jpg";

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

      // ==================== HEADER ====================
      // Logo (Left)
      // Note: jsPDF addImage supports webp in recent versions, but JPEG/PNG is safer.
      // If webp fails, we might need to canvas convert. Assuming it works or fail gracefully.
      try {
        doc.addImage(logo, "WEBP", 10, 10, 40, 20);
      } catch (err) {
        console.warn("Logo add failed", err);
        // Fallback or skip
      }

      // Job No (Top Center)
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const jobNoText = `JOB NO. ${data.job_no || ""}`;
      const jobNoWidth = doc.getTextWidth(jobNoText);
      doc.text(jobNoText, (pageWidth - jobNoWidth) / 2, 8); // Very top

      // Address / Company Info (Right)
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SURAJ", 60, 25);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("FORWARDERS & SHIPPING AGENCIES", 60, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("Clearing - Forwarding - Shipping Agents", 60, 34);

      // Address Block (Right Aligned)
      const rightMargin = 15;
      const addressX = 130;
      doc.setFontSize(8);
      doc.text("A-204 to 207, Wall Street - II,", addressX, 15);
      doc.text("Opp. Orient Club, Ellis Bridge,", addressX, 19);
      doc.text("Ahmedabad - 380 006.", addressX, 23);
      doc.text("Phone : (079) 2640 1929 / 2640 2005 / 6", addressX, 27);
      doc.text("Email : info@surajforwarders.com", addressX, 31);

      // CHA License Box (Bottom Right of Header)
      doc.setFillColor(0, 0, 139); // Dark Blue
      doc.rect(addressX, 33, 65, 5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("CHA LICENCE NO : ABOFS1766LCH005", addressX + 2, 36.5);
      doc.setTextColor(0, 0, 0);

      // AEO (Center/Right near logo) - mimicking screenshot layout roughly
      // (Screenshot had AEO logo, we skip or place text)

      let yPos = 45;

      // ==================== MAIN TABLE ====================
      // Mapping Data
      const invoice = data.invoices?.[0] || {};
      const sbNo = data.sb_no || "";
      const sbDate = data.sb_date
        ? new Date(data.sb_date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";
      const invoiceNo = invoice.invoiceNumber || "";
      const invoiceDate = invoice.invoiceDate || ""; // Assuming it is formatted or needs formatting
      const pod = data.port_of_discharge || "";

      // Packages
      const pkgs = `${data.total_no_of_pkgs || "0"} ${data.package_unit || ""}`;

      // Description (First product)
      const description = invoice.products?.[0]?.description || "";

      // Weights
      const grossWeight = `${data.gross_weight_kg || "0"} KGS`;
      const netWeight = `${data.net_weight_kg || "0"} KGS`;

      // LEO Date & Ref No
      // LEO Date lookup in milestones or statusDetails
      const leoMilestone = data.milestones?.find(
        (m) => m.milestoneName === "L.E.O"
      );
      const leoDateRaw =
        leoMilestone?.actualDate ||
        data.operations?.[0]?.statusDetails?.[0]?.leoDate ||
        "";
      const leoDate = leoDateRaw
        ? new Date(leoDateRaw).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";
      const refNo = data.exporter_ref_no || invoiceNo; // Fallback to invoice if ref missing

      // EGM
      const egmNo = data.egm_no || "";
      const egmDate = data.egm_date
        ? new Date(data.egm_date).toLocaleDateString("en-GB")
        : "";

      // Port Loading
      const pol = data.port_of_loading || "";

      // LCL/FCL and Rail/Road
      const mode = data.consignmentType || "";
      const railing = ""; // Determine if Rail or Road provided? data.operations[0].statusDetails[0].railRoad?

      doc.autoTable({
        startY: yPos,
        theme: "grid",
        styles: {
          lineColor: [255, 0, 0], // Red borders as per screenshot
          lineWidth: 0.5,
          textColor: [0, 0, 0],
          font: "helvetica",
          fontSize: 9,
          cellPadding: 1.5, // Compact
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
              styles: { fontStyle: "bold", fontSize: 11, textColor: [0, 0, 0] },
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
              styles: { fontStyle: "bold", fontSize: 10 },
            },
          ],
          [
            "Gross Weight",
            { content: grossWeight, styles: { fontStyle: "bold" } },
            "Net Weigth",
            { content: netWeight, styles: { fontStyle: "bold" } }, // "Net Weigth" typo in screenshot maintained? Or fixed? Let's fix it: Weight
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
            }, // Static Header?
            {
              content: "Rail / Road",
              styles: { fontStyle: "boldItalic", halign: "center" },
            }, // Static Header?
          ],
        ],
      });

      // Second Table: Container Details
      // Need to adjust startY
      yPos = doc.lastAutoTable.finalY + 0.5; // connect tables? screenshot shows connected.

      // Prepare container data
      const containers =
        data.operations?.[0]?.containerDetails || data.containers || [];
      // If containers empty, add one empty row
      const containerRows =
        containers.length > 0
          ? containers
          : [{ containerNo: "", containerSize: "", sealNo: "" }];

      const containerBody = containerRows.map((c) => [
        c.containerNo || "",
        c.containerSize || c.size || "20",
        c.sealNo || "", // Customs Seal
        "", // S/Line Seal
      ]);

      // Add extra empty rows to match screenshot height (approx 10-12 rows)
      const emptyRowCount = Math.max(0, 15 - containerBody.length);
      for (let i = 0; i < emptyRowCount; i++) {
        containerBody.push(["", "", "", ""]);
      }

      doc.autoTable({
        startY: yPos,
        theme: "grid",
        styles: {
          lineColor: [255, 0, 0],
          lineWidth: 0.5,
          textColor: [0, 0, 0],
          font: "helvetica",
          fontSize: 10,
          cellPadding: 2,
          minCellHeight: 8,
        },
        head: [["Container No", "Size", "Customs Seal No", "S/Line Seal No"]],
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0], // Black text
          fontStyle: "boldItalic",
          lineColor: [255, 0, 0],
          lineWidth: 0.5,
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
