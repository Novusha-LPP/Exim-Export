import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { Button } from "@mui/material";
import logo from "../../../../assets/images/surajLogo.jpeg";
import signatureImg from "../../../../assets/images/gandhidhamSignature.jpg";
import companyLogo from "../../../../assets/images/Frieghttablogo.png";
import { rotateImage90Deg } from "../../../../utils/imageUtils";

const StorageApplicationGenerator = ({ jobNo, children, onTrackSuccess }) => {
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
          doc.rect(112, 4, 87, 38, "F");

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
          
          doc.setTextColor(0, 0, 0); // Reset color
        }
      } catch (err) {
        console.warn("Logo add failed", err);
      }

      // Date
      let yPos = 46;
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text(`Date: -  ${formatDate(new Date())}`, pageWidth - 55, yPos);
      yPos += 8;

      // To
      doc.text("To", 15, yPos);
      yPos += 5;
      doc.text("Exim Document Department", 15, yPos);
      yPos += 5;
      doc.text("Exim Yard", 15, yPos);
      yPos += 5;
      doc.text("Adani Port and SEZ Ltd", 15, yPos);
      yPos += 5;

      const portOfLoading = data.port_of_loading || "";
      const portCity = portOfLoading.includes("-") ? portOfLoading.split("-")[1].trim() : portOfLoading;
      doc.text(portCity || "Mundra", 15, yPos);
      yPos += 12;

      // Subject
      const containers = data.containers || [];
      const count20 = containers.filter(c => getContainerSizeLabel(c.isoCode || c.containerSize || c.type || c.size) === "20").length;
      const count40 = containers.filter(c => getContainerSizeLabel(c.isoCode || c.containerSize || c.type || c.size) === "40" || getContainerSizeLabel(c.isoCode || c.containerSize || c.type || c.size) === "45").length;

      doc.text(`Subject: - Application for storage of   ${count20}   x 20' +   ${count40}   x 40' factory stuffed containers in Adani Exim Yard.`, 15, yPos);
      yPos += 10;

      // Account / CHA / Shipper
      const firmName = isGandhidham ? "SURAJ FORWARDERS" : "SURAJ FORWARDERS & SHIPPING AGENCIES";
      const licCode = isGandhidham ? "ABOFS1766LCH006" : "ABOFS1766LCH005";

      doc.text(`Account Holder:  ${firmName.toUpperCase()}`, 15, yPos);
      yPos += 6;
      doc.text(`CHA:  ${licCode} ${firmName.toUpperCase()}`, 15, yPos);
      yPos += 6;
      doc.text(`Shipper:  ${data.exporter || ""}`, 15, yPos);
      yPos += 10;

      // Dear Sir
      doc.text("Dear Sir,", 15, yPos);
      yPos += 6;

      doc.setFont("helvetica", "normal");
      doc.text("With reference to above details please allow us to store above mentioned no of containers at Adani Exim Yard.", 15, yPos);
      yPos += 5;
      doc.text("As VCN of desired vessel not available.", 15, yPos);
      yPos += 8;

      const tableBody = containers.map((c, index) => {
        // 1. Try clubbed job style: operations[index].transporterDetails[0]
        let op = data.operations?.[index];
        let trans = op?.transporterDetails?.[0];

        // 2. Try single job style: operations[0].transporterDetails[index]
        if (!trans || !trans.vehicleNo) {
          const mainOp = data.operations?.[0] || {};
          const t = mainOp.transporterDetails?.[index];
          if (t && t.vehicleNo) {
            trans = t;
          }
        }

        const vNo = c.weighmentVehicleNo || trans?.vehicleNo || (index === 0 ? data.operations?.[0]?.transporterDetails?.[0]?.vehicleNo : "") || "";

        return [
          c.containerNo || c.container_number || "",
          getContainerSizeLabel(c.isoCode || c.containerSize || c.type || c.size || ""),
          data.sb_no || "",
          formatDate(data.sb_date) || "",
          c.customSealNo || c.custom_seal || c.sealNo || "",
          vNo
        ];
      });

      if (tableBody.length === 0) {
        tableBody.push(["", "", "", "", "", ""]);
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
        head: [["Container No", "Size", "Shipping Bill", "Shipping Bill Date", "RFID Seal No", "Vehicle no"]],
        body: tableBody,
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Note
      doc.setFont("helvetica", "bold");
      doc.text("Containers gated in as Export storage and RFID seal verified in port gate", 15, yPos);
      yPos += 15;

      // Footer
      doc.text("Thanking you,", 15, yPos);
      yPos += 8;
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
        doc.text(`For ${firmName.toUpperCase()}`, 15, yPos);
        yPos += 12;
        doc.text("AUTHORISED SIGN", 15, yPos);
      }

      // Preview Blob
      const filename = `StorageYardApplication_${data.job_no || "Job"}.pdf`;
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
      console.error("Error generating Storage Application:", error);
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
          Storage Yard Application
        </Button>
      )}
    </>
  );
};

export default StorageApplicationGenerator;
