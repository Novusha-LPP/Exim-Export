import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { Button } from "@mui/material";
import logo from "../../../../assets/images/surajLogo.jpeg";
import signatureImg from "../../../../assets/images/gandhidhamSignature.jpg";
import companyLogo from "../../../../assets/images/Frieghttablogo.png";
import { rotateImage90Deg } from "../../../../utils/imageUtils";

const MovementJobRequestGenerator = ({ jobNo, children, onTrackSuccess }) => {
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

      const getContainerSizeLabel = (value) => {
        const raw = (value || "").toString().toUpperCase().trim();
        if (/^[2]\d{3}$/.test(raw)) return "20";
        if (/^[4]\d{3}$/.test(raw)) return "40";
        if (/^[9]\d{3}$/.test(raw)) return "45";
        const sizeMatch = raw.match(/\b(20|40|45)\b/);
        return sizeMatch ? sizeMatch[1] : raw;
      };

      const isGandhidham =
        String(data.branchCode || "").toUpperCase().trim() === "GIM" ||
        String(data.jobNumber || "").toUpperCase().startsWith("GIM") ||
        String(data.job_no || "").toUpperCase().startsWith("GIM");

      let signatureBase64 = "";
      try {
        signatureBase64 = await rotateImage90Deg(signatureImg);
      } catch (err) {
        console.warn("Failed to load signature image", err);
      }

      try {
        doc.addImage(logo, "JPEG", 9, 4, 190, 38);
        if (isGandhidham) {
          // Cover Ahmedabad address
          doc.setFillColor(255, 255, 255);
          doc.rect(112, 4, 87, 40, "F");

          // Draw Gandhidham address
          doc.setTextColor(100, 100, 100); // Grey color
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.text("GANDHIDHAM", 138, 8);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.text("209, 2nd Floor, Madhav Palace, Plot No. 55,", 138, 12.5);
          doc.text("Sector-8, Near Chamber of Commerce,", 138, 16.5);
          doc.text("GANDHIDHAM (Kutch) - 370 201", 138, 20.5);
          doc.text("Phone No. : (02836) 229011 / 12", 138, 24.5);
          doc.text("E-mail : anurag@surajforwders.com", 138, 28.5);
          doc.text("PIC : Mr. Anurag Pillai (M) +91 99243 04422", 138, 32.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text("PIC : Balvir Bhai (M) +91 99243 04434", 138, 36.5);

          doc.setFont("helvetica", "normal"); // Reset font style
          doc.setTextColor(0, 0, 0); // Reset color
        }
      } catch (err) {
        console.warn("Logo add failed", err);
      }

      // Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("MOVEMENT JOB REQUEST", pageWidth / 2, 48, { align: "center" });
      doc.line(pageWidth / 2 - 30, 49, pageWidth / 2 + 30, 49);

      // Date / Time / Sr No
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text(`Date :  ${formatDate(new Date())}`, pageWidth - 60, 56);
      doc.text("Time :  ________________", pageWidth - 60, 61);
      doc.text("Mvmt. Sr. No. __________", pageWidth - 60, 66);

      // To
      let yPos = 63;
      doc.setFont("helvetica", "bold");
      doc.text("To,", 15, yPos);
      yPos += 6;
      doc.text("The Manager,", 15, yPos);
      yPos += 6;
      doc.text(`${data.warehouseName || "______________"} C.F.S.`, 15, yPos);
      yPos += 6;

      const portOfLoading = data.port_of_loading || "";
      const portCity = portOfLoading.includes("-") ? portOfLoading.split("-")[1].trim() : portOfLoading;
      doc.text(portCity || "Mundra", 15, yPos);
      yPos += 12;

      doc.text("Sir,", 15, yPos);
      yPos += 8;

      const containers = data.containers || [];
      const count20 = containers.filter(c => getContainerSizeLabel(c.isoCode || c.containerSize || c.type || c.size) === "20").length;
      const count40 = containers.filter(c => getContainerSizeLabel(c.isoCode || c.containerSize || c.type || c.size) === "40" || getContainerSizeLabel(c.isoCode || c.containerSize || c.type || c.size) === "45").length;

      doc.text(`Sub: Movement of   ${count20}   x 20'/+   ${count40}   x 40' for M.V.   ${data.vessel_name || ""}`, 15, yPos);
      yPos += 8;

      doc.text(`Voyage No.  ${data.voyage_no || ""}  VC No.  ${data.voyage_no || ""}  Rotation No.  ${""}`, 15, yPos);
      yPos += 8;

      doc.setFont("helvetica", "normal");
      doc.text("With reference to the above we request you to kindly arrange to move below mentioned containers in port", 15, yPos);
      yPos += 5;
      doc.text("for the above captioned vessel. The said containers are cleared from all authorities in all aspects.", 15, yPos);
      yPos += 12;

      // Fields
      doc.setFont("helvetica", "bold");
      doc.text(`Shipping Bill No.  ${data.sb_no || ""}`, 15, yPos);
      yPos += 6;
      doc.text(`Shipping Bill Date.  ${formatDate(data.sb_date) || ""}`, 15, yPos);
      yPos += 6;
      doc.text(`Type of Cargo  ${data.consignmentType || ""}`, 15, yPos);
      yPos += 6;
      doc.text(`Shipping Bill Weight  ${data.gross_weight_kg || ""} ${data.gross_weight_unit || "KGS"}`, 15, yPos);
      yPos += 8;

      doc.text("Fork Lift [  ]         Labour [  ]         Crane [  ]", 15, yPos);
      yPos += 10;

      // Table: Container Details
      const tableBody = containers.map((c, i) => {
        const customSeal = c.customSealNo || c.custom_seal || c.sealNo || "";
        const lineSeal = c.shippingLineSealNo || c.line_seal || "";
        const sealStr = [customSeal && `Cust: ${customSeal}`, lineSeal && `Line: ${lineSeal}`].filter(Boolean).join("\n") || "";

        return [
          String(i + 1),
          c.containerNo || c.container_number || "",
          getContainerSizeLabel(c.isoCode || c.containerSize || c.type || c.size || ""),
          c.pkgsStuffed ? `${c.pkgsStuffed} PKGS` : "",
          c.grossWeight ? `${c.grossWeight} KGS` : "",
          sealStr,
          data.port_of_discharge || ""
        ];
      });

      // If empty, add a blank row
      if (tableBody.length === 0) {
        tableBody.push(["", "", "", "", "", "", ""]);
      }

      doc.autoTable({
        startY: yPos,
        theme: "grid",
        styles: {
          lineColor: [0, 0, 0],
          lineWidth: 0.8,
          textColor: [0, 0, 0],
          font: "helvetica",
          fontSize: 8.5,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
        },
        head: [["Sr No.", "Container No.", "Size", "No. of Packages", "Gross Weight of Container", "Seal No.", "POD"]],
        body: tableBody,
      });

      yPos = doc.lastAutoTable.finalY + 12;

      doc.setFont("helvetica", "normal");
      doc.text("Thanking you,", 15, yPos);
      yPos += 6;
      doc.text("Yours faithfully,", 15, yPos);
      yPos += 12;

      const firmName = isGandhidham ? "SURAJ FORWARDERS" : "SURAJ FORWARDERS & SHIPPING AGENCIES";

      if (isGandhidham) {
        doc.setTextColor(22, 54, 147); // Blue color
        doc.setFont("helvetica", "bold");
        doc.text("FOR, SURAJ FORWARDERS & SHIPPING AGENCIES", 15, yPos);

        let sigY = yPos + 2;
        if (signatureBase64) {
          try {
            doc.addImage(signatureBase64, "PNG", 15, sigY, 45, 20);
          } catch (e) {
            console.warn("Adding signature failed", e);
          }
          yPos += 20;
        }

        yPos += 6;
        doc.setTextColor(22, 54, 147); // Blue color
        doc.setFont("helvetica", "bold");
        doc.text("AUTHORIZED SIGNATURE", 15, yPos);
        doc.setTextColor(0, 0, 0); // Reset color
      } else {
        doc.setFont("helvetica", "bold");
        doc.text(`For ${firmName.toUpperCase()}`, 15, yPos);
      }

      // Preview Blob
      const filename = `MovementJobRequest_${data.job_no || "Job"}.pdf`;
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
      console.error("Error generating Movement Job Request:", error);
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
          Movement Job Request
        </Button>
      )}
    </>
  );
};

export default MovementJobRequestGenerator;
