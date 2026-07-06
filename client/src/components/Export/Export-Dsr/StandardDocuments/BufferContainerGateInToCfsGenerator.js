import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { Button } from "@mui/material";
import logo from "../../../../assets/images/surajLogo.jpeg";
import signatureImg from "../../../../assets/images/gandhidhamSignature.jpg";
import { rotateImage90Deg } from "../../../../utils/imageUtils";

const BufferContainerGateInToCfsGenerator = ({ jobNo, children, onTrackSuccess }) => {
  const generatePDF = async (e) => {
    if (e) e.stopPropagation();

    try {
      const encodedJobNo = encodeURIComponent(jobNo);
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const data = response.data;

      let signatureBase64 = "";
      try {
        signatureBase64 = await rotateImage90Deg(signatureImg);
      } catch (err) {
        console.warn("Failed to load signature image", err);
      }

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
        String(data.jobNumber || "").toUpperCase().startsWith("GIM") ||
        String(data.job_no || "").toUpperCase().startsWith("GIM");
      const firmName = isGandhidham ? "SURAJ FORWARDERS" : "SURAJ FORWARDERS & SHIPPING AGENCIES";

      const containers = data.containers?.length > 0 ? data.containers : [{ containerNo: "", type: "", pkgsStuffed: 0 }];

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

      let yPos = 48;

      // Dated line
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`DATED: ${formatDate(new Date())}`, pageWidth - 55, yPos);
      yPos += 12;

      // To
      doc.text("TO,", 14, yPos);
      yPos += 5;
      doc.text("THE SUPERINTENDENT OF CUSTOMS (DP)", 14, yPos);
      yPos += 5;
      doc.text("MUNDRA PORT CUSTOMS,", 14, yPos);
      yPos += 5;
      doc.text("MP&SEZ, MUNDRA PORT.", 14, yPos);
      yPos += 10;

      // Subject
      doc.text("SUB: BUFFAR CONTAINER GATE IN TO CFS", 14, yPos);
      yPos += 10;

      // Salutation
      doc.text("Respected Sir,", 14, yPos);
      yPos += 8;

      // Body text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const bodyText = "With reference to above subject, we request your good selves to grant us a permission for gate in the below said loaded container gate in. We again request to do the needful, as in this regards your kind co-operation would be highly appreciated.";
      const splitBody = doc.splitTextToSize(bodyText, pageWidth - 28);
      doc.text(splitBody, 14, yPos);
      yPos += (splitBody.length * 5) + 8;

      // Table columns & rows
      const tableHeaders = [
        ["SR.\nNO", "EXPORTER NAME", "CARGO", "SB NO DATED", "PKG", "CONT. NO"]
      ];

      const tableBody = containers.map((c, idx) => {
        const exporterName = data.exporter || "-";
        const cargo = data.nature_of_cargo || "-";
        const sbNoDated = data.sb_no ? `SB NO: ${data.sb_no}\nDT: ${formatDate(data.sb_date)}` : "-";
        const pkgCount = c.pkgsStuffed ? `${c.pkgsStuffed} PKGS` : (data.total_no_of_pkgs ? `${data.total_no_of_pkgs} PKGS` : "-");
        const contNo = c.containerNo || c.container_number || "-";
        const contSize = c.containerSize || c.type || "";
        const contDisplay = contSize ? `${contNo} (${contSize})` : contNo;

        return [
          String(idx + 1),
          exporterName,
          cargo,
          sbNoDated,
          pkgCount,
          contDisplay
        ];
      });

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
          minCellHeight: 12,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
          valign: "middle"
        },
        head: tableHeaders,
        body: tableBody,
        columnStyles: {
          0: { width: 15, halign: "center" },
          1: { width: 45 },
          2: { width: 35 },
          3: { width: 35, halign: "center" },
          4: { width: 25, halign: "center" },
          5: { width: 35, halign: "center" },
        }
      });

      yPos = doc.lastAutoTable.finalY + 12;

      // Footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Thanking you,", 14, yPos);
      yPos += 6;
      doc.text("Yours faithfully,", 14, yPos);
      yPos += 10;

      // Signature/Stamp
      if (isGandhidham) {
        doc.setTextColor(22, 54, 147); // Blue color
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`FOR, ${firmName.toUpperCase()}`, 14, yPos);

        let sigY = yPos + 2;
        if (signatureBase64) {
          try {
            doc.addImage(signatureBase64, "PNG", 14, sigY, 40, 16);
          } catch (e) {
            console.warn("Adding signature failed", e);
          }
          yPos += 16;
        }

        yPos += 5;
        doc.setTextColor(22, 54, 147); // Blue color
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("AUTHORIZED SIGNATURE", 14, yPos);
        doc.setTextColor(0, 0, 0); // Reset color
      } else {
        doc.rect(14, yPos, 56, 18);
        doc.setFont("helvetica", "bold");
        doc.text("Sign ___________________ /Stamp", 17, yPos + 10);
      }

      // Preview Blob
      const filename = `BufferContainerGateInToCfs_${data.job_no || "Job"}.pdf`;
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
      console.error("Error generating BUFFER CONTAINER GATE IN TO CFS document:", error);
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
          Buffer Container Gate In To CFS
        </Button>
      )}
    </>
  );
};

export default BufferContainerGateInToCfsGenerator;
