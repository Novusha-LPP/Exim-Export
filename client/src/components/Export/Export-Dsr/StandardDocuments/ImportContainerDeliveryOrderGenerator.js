import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { Button } from "@mui/material";
import logo from "../../../../assets/images/surajLogo.jpeg";

const ImportContainerDeliveryOrderGenerator = ({ jobNo, children, onTrackSuccess }) => {
  const generatePDF = async (e) => {
    if (e) e.stopPropagation();

    try {
      const encodedJobNo = encodeURIComponent(jobNo);
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const data = response.data;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const parseDateSafe = (dateStr) => {
        if (!dateStr) return null;
        if (dateStr instanceof Date) return dateStr;
        if (typeof dateStr === 'string' && /^\d{1,2}-\d{1,2}-\d{4}/.test(dateStr)) {
          const [d, m, y] = dateStr.split('-');
          return new Date(y, m - 1, d);
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      };

      const formatDate = (date) => {
        const d = parseDateSafe(date);
        if (!d) return "";
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).replace(/\//g, '-');
      };

      const isGandhidham =
        String(data.branchCode || "").toUpperCase().trim() === "GIM" ||
        String(data.jobNumber || "").toUpperCase().startsWith("GIM");
      const firmName = isGandhidham ? "SURAJ FORWARDERS" : "SURAJ FORWARDERS & SHIPPING AGENCIES";
      const licCode = isGandhidham ? "ABOFS1766LCH006" : "ABOFS1766LCH005";

      const containers = data.containers?.length > 0 ? data.containers : [{ containerNo: "", type: "", customSealNo: "", shippingLineSealNo: "" }];
      const vehicleNo = data.operations?.[0]?.transporterDetails?.[0]?.vehicleNo || "";

      containers.forEach((c, index) => {
        if (index > 0) {
          doc.addPage();
        }

        // Header logo & address
        try {
          doc.addImage(logo, "JPEG", 9, 4, 190, 38);
        } catch (err) {
          console.warn("Logo add failed", err);
        }

        let yPos = 46;

        // Title box
        doc.rect(14, yPos, pageWidth - 28, 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(
          "Container Delivery To OR Container Receipt From MICT / GAPL Gate /C.F.S. Gate Complex",
          pageWidth / 2,
          yPos + 8,
          { align: "center" }
        );
        yPos += 18;

        // Delivery Order No line
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Import Container Delivery Order No. ___________________________________________", 14, yPos);
        yPos += 8;

        // Main table layout
        const tableBody = [
          [
            { content: `Vehicle\n\n${vehicleNo}`, styles: { fontStyle: "bold" } },
            { content: "Driver\n\n", styles: { fontStyle: "bold" } },
            { content: "Hauler/Group Code\n\n", styles: { fontStyle: "bold" } }
          ],
          [
            { content: `Agent Name / Code\n\n${firmName}`, styles: { fontStyle: "bold" } },
            { content: `Line Name / Code\n\n${data.shipping_line_airline || ""}`, styles: { fontStyle: "bold" } },
            { content: `VCN No.\n\n${data.voyage_no || ""}`, styles: { fontStyle: "bold" } }
          ],
          [
            { content: `Vessel Name / Code\n\n${data.vessel_name || ""}`, styles: { fontStyle: "bold" } },
            { content: "Import / Export\n\nEXPORT", styles: { fontStyle: "bold" } },
            { content: `IGM No. / Rot No.\n\n${data.voyage_no || ""}`, styles: { fontStyle: "bold" } }
          ],
          [
            { content: `Container No.\n\n${c.containerNo || c.container_number || ""}`, styles: { fontStyle: "bold", fontSize: 10 } },
            { content: `ISO Code\n\n${c.containerSize || c.type || c.size || ""}`, styles: { fontStyle: "bold" } },
            { content: "Empty / Ldd\n\nLDD", styles: { fontStyle: "bold" } },
            { content: `Gr. Wt. & (Containers)\n\n${data.gross_weight_kg || ""} KGS`, styles: { fontStyle: "bold" }, colSpan: 1 }
          ],
          [
            { content: "Delivery Order No.\n\n", styles: { fontStyle: "bold" } },
            { content: "HAZ / IMO / UN No.\n\n", styles: { fontStyle: "bold" } },
            { content: `POD / POL\n\n${data.port_of_discharge || ""} / ${data.port_of_loading || ""}`, styles: { fontStyle: "bold" } },
            { content: `Seal No.\n1) ${c.customSealNo || c.custom_seal || c.sealNo || ""}\n2) ${c.shippingLineSealNo || c.line_seal || ""}`, styles: { fontStyle: "bold" } }
          ],
          [
            { content: "Stamp to Maintained\n\n", styles: { fontStyle: "bold" } },
            { content: "Voltage\n\n", styles: { fontStyle: "bold" } },
            { content: `C.H.A. Name / No.\n\n${firmName} / ${licCode}`, styles: { fontStyle: "bold" } },
            { content: `S/Bill No. / Date\n\n${data.sb_no || ""} / ${formatDate(data.sb_date)}`, styles: { fontStyle: "bold" } }
          ]
        ];

        doc.autoTable({
          startY: yPos,
          theme: "grid",
          styles: {
            lineColor: [0, 0, 0],
            lineWidth: 0.8,
            textColor: [0, 0, 0],
            font: "helvetica",
            fontSize: 8.5,
            cellPadding: 4,
            minCellHeight: 18,
          },
          body: tableBody,
          columnStyles: {
            0: { width: 55 },
            1: { width: 55 },
            2: { width: 45 },
            3: { width: 35 },
          },
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // Custom Clearance Text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("THIS CONTAINER IS CLEARED BY CUSTOMS", 14, yPos);
        yPos += 8;

        // Stuffing details & Booking details
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text(`STUFFING LOCATION:  ${data.goods_stuffed_at || ""}`, 14, yPos);
        yPos += 7;
        doc.text(`BOOKING No:  ${data.booking_no || ""}`, 14, yPos);
        yPos += 12;

        // Sign / Date box
        doc.text(`Date:  ${formatDate(new Date())}`, 14, yPos);
        
        // Sign box
        doc.rect(pageWidth - 70, yPos - 5, 56, 18);
        doc.text("Sign ___________________ /Stamp", pageWidth - 67, yPos + 7);
      });

      // Preview Blob
      const filename = `ImportContainerDeliveryOrder_${data.job_no || "Job"}.pdf`;
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
                  background-color: #16408f;
                  color: white;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 4px;
                  cursor: pointer;
                  text-decoration: none;
                  font-size: 14px;
                  font-weight: bold;
                }
                .download-btn:hover { background-color: #19448a; }
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
        setTimeout(() => URL.revokeObjectURL(blobUrl), 300000);
      }

      if (onTrackSuccess) {
        onTrackSuccess();
      }
    } catch (error) {
      console.error("Error generating Import Container Delivery Order:", error);
      alert("Failed to generate PDF");
    }
  };

  return (
    <>
      {children ? (
        React.cloneElement(children, {
          onClick: (e) => {
            e.stopPropagation();
            if (children.props.onClick) children.props.onClick(e);
            generatePDF(e);
          },
        })
      ) : (
        <Button onClick={generatePDF} variant="contained">
          Import Container Delivery Order
        </Button>
      )}
    </>
  );
};

export default ImportContainerDeliveryOrderGenerator;
