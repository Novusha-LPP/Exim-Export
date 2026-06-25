import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { Button } from "@mui/material";
import logo from "../../../../assets/images/surajLogo.jpeg";

const CartingJobRequestGenerator = ({ jobNo, children, onTrackSuccess }) => {
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

      // Header logo & address
      try {
        doc.addImage(logo, "JPEG", 9, 4, 190, 38);
      } catch (err) {
        console.warn("Logo add failed", err);
      }

      // Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("CARTING JOB REQUEST", pageWidth / 2, 48, { align: "center" });
      doc.line(pageWidth / 2 - 25, 49, pageWidth / 2 + 25, 49);

      // Date
      let yPos = 55;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Date:  ${formatDate(new Date())}`, pageWidth - 55, yPos);
      yPos = 62;

      const isGandhidham =
        String(data.branchCode || "").toUpperCase().trim() === "GIM" ||
        String(data.jobNumber || "").toUpperCase().startsWith("GIM");
      const firmName = isGandhidham ? "SURAJ FORWARDERS" : "SURAJ FORWARDERS & SHIPPING AGENCIES";

      // A/C
      doc.setFont("helvetica", "bold");
      doc.text(`A/C: ${firmName.toUpperCase()}`, 15, yPos);
      yPos += 10;

      // To
      doc.text("The Manager,", 15, yPos);
      yPos += 6;
      doc.text(data.warehouseName || "SEABIRD", 15, yPos);
      yPos += 6;
      
      const portOfLoading = data.port_of_loading || "";
      const portCity = portOfLoading.includes("-") ? portOfLoading.split("-")[1].trim() : portOfLoading;
      doc.text(portCity || "Mundra", 15, yPos);
      yPos += 10;

      // Table 1: Cargo details
      const invoice = data.invoices?.[0] || {};
      const description = invoice.products?.[0]?.description || data.description || "";

      doc.autoTable({
        startY: yPos,
        theme: "grid",
        styles: {
          lineColor: [0, 0, 0],
          lineWidth: 0.8,
          textColor: [0, 0, 0],
          font: "helvetica",
          fontSize: 9,
          cellPadding: 4,
        },
        columnStyles: {
          0: { width: 90, fontStyle: "bold" },
          1: { width: 90, fontStyle: "bold" },
        },
        body: [
          [
            `CARGO TYPE\n\n${data.consignmentType || ""}`,
            `PACKAGE TYPE\n\n${data.package_unit || "PKG"}`
          ],
          [
            `SB:-\n\n${data.sb_no || ""}`,
            `NO OF PACKAGES\n\n${data.total_no_of_pkgs || ""} pkgs`
          ],
          [
            { content: `EXPORTER: .\n\n${data.exporter || ""}`, colSpan: 2 }
          ],
          [
            { content: `GOODS DESCRIPTION:\n\n${description}`, colSpan: 2 }
          ]
        ],
      });

      yPos = doc.lastAutoTable.finalY + 8;

      // Table 2: Details grid
      const transDetails = data.operations?.[0]?.transporterDetails || [];
      const containers = data.containers || [];
      
      const detailsBody = [];
      for (let i = 0; i < 5; i++) {
        const trans = transDetails[i] || {};
        const c = containers[i] || {};
        detailsBody.push([
          String(i + 1),
          trans.vehicleNo || "",
          c.containerNo || c.container_number || "",
          trans.grossWeightKgs ? `${trans.grossWeightKgs} KGS` : "",
          trans.noOfPackages || ""
        ]);
      }

      doc.autoTable({
        startY: yPos,
        theme: "grid",
        styles: {
          lineColor: [0, 0, 0],
          lineWidth: 0.8,
          textColor: [0, 0, 0],
          font: "helvetica",
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
        },
        head: [["SR.NO.", "VEHICLE NO", "CONTAINER NO", "GROSS WEIGHT", "PKG"]],
        body: detailsBody,
        columnStyles: {
          0: { width: 20, halign: "center" },
          1: { width: 45 },
          2: { width: 50 },
          3: { width: 40 },
          4: { width: 25, halign: "center" },
        },
      });

      yPos = doc.lastAutoTable.finalY + 12;

      // Sign Footer
      doc.text("Thanking you,", 15, yPos);
      yPos += 6;
      doc.text("Yours Faithfully,", 15, yPos);
      yPos += 12;
      doc.text(`For ${firmName.toUpperCase()}`, 15, yPos);

      // Preview Blob
      const filename = `CartingJobRequest_${data.job_no || "Job"}.pdf`;
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
      console.error("Error generating Carting Job Request:", error);
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
          Carting Job Request
        </Button>
      )}
    </>
  );
};

export default CartingJobRequestGenerator;
