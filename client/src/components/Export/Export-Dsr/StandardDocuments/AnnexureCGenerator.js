import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";

const AnnexureCGenerator = ({ jobNo, children }) => {
  // ==================== CONSTANTS ====================
  const PAGE_CONFIG = {
    width: 595.28, // A4 width in pts
    height: 841.89, // A4 height in pts
    margins: {
      left: 40,
      right: 40,
      top: 40,
      bottom: 40,
    },
  };

  const FONT_SIZES = {
    title: 14,
    subtitle: 10,
    body: 10,
    tableHeader: 10,
  };

  // ==================== HELPER FUNCTIONS ====================
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const generatePDF = async (e) => {
    if (e) e.stopPropagation();

    const encodedJobNo = encodeURIComponent(jobNo);

    try {
      // 1. Fetch Data
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );

      const exportJob = response.data;

      // 2. Map Data
      // Check multiple possible locations for containers
      let rawContainers = exportJob.containers || [];
      if (
        rawContainers.length === 0 &&
        exportJob.operations &&
        exportJob.operations.length > 0
      ) {
        rawContainers = exportJob.operations[0].containerDetails || [];
      }

      const data = {
        job_no: exportJob.job_no || jobNo,
        sb_no: exportJob.sb_no || "",
        sb_date: exportJob.sb_date || formatDate(exportJob.sb_date),
        total_no_of_pkgs: exportJob.total_no_of_pkgs || "",
        package_unit: exportJob.package_unit || "",
        marks_nos: exportJob.marks_nos || exportJob.marks_and_numbers || "",
        gross_weight_kg: exportJob.gross_weight_kg || "",
        net_weight_kg: exportJob.net_weight_kg || "",
        cha: exportJob.cha || exportJob.cha_name || "",
        custom_house: exportJob.custom_house || "",
        containers: rawContainers,
      };

      // 3. Initialize jsPDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const { width, margins } = PAGE_CONFIG;
      const centerX = width / 2;
      const rightX = width - margins.right;
      const leftX = margins.left;
      let yPos = margins.top;

      // --- Header Section ---

      // ANNEXURE - C
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(FONT_SIZES.title);
      pdf.text("ANNEXURE - C", centerX, yPos, { align: "center" });

      // S/S - ICD
      pdf.setFontSize(FONT_SIZES.subtitle);
      pdf.text("S/S - ICD", rightX, yPos, { align: "right" });

      yPos += 20;

      // Instruction Text
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(FONT_SIZES.subtitle);
      pdf.text(
        "Data to be entered by Examing Officers when export goods are brought for examination:",
        centerX,
        yPos,
        { align: "center" }
      );

      yPos += 30;

      // --- Data Fields Helper ---
      // Draws Number, Label, and Underline. Value starts right after Label.
      const drawLineField = (label, value, number) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.body);

        const labelText = `${number} ${label} :`;
        const labelWidth = pdf.getTextWidth(labelText);

        // Draw Label
        pdf.text(labelText, leftX, yPos);

        // Draw Value (Bold, Centered on Line)
        pdf.setFont("helvetica", "bold");
        const valueX = leftX + labelWidth + 5;
        const lineLength = rightX - valueX;
        const dateCenterX = valueX + lineLength / 2;

        pdf.text(String(value || ""), dateCenterX, yPos, { align: "center" });

        // Draw Underline starting exactly after the label
        pdf.setLineWidth(0.5);
        pdf.line(valueX, yPos + 2, rightX, yPos + 2);

        yPos += 25; // Standard Spacing
      };

      // 1. S/B No
      const sbDateFormatted = data.sb_date;
      const sbText = `${data.sb_no || ""} dated ${sbDateFormatted}`;
      drawLineField("S/B No", sbText, "1");

      // 2. Total No of packages
      drawLineField("Total No of packages", data.total_no_of_pkgs || "", "2");

      // 3. Type of packages
      drawLineField("Type of packages", data.package_unit || "", "3");

      // 4. Numbers marked on the packages
      drawLineField(
        "Numbers marked on the packages",
        data.marks_nos || "",
        "4"
      );

      // 5. Gross Weight
      const grossWeight = `${data.gross_weight_kg || ""} KGS`;
      drawLineField("Gross Weight", grossWeight, "5");

      // 6. Net Weight
      const netWeight = `${data.net_weight_kg || ""} KGS`;
      drawLineField("Net Weight", netWeight, "6");

      yPos += 10; // Extra spacing before field 7

      // 7. Seal and name of the seal agency (With Underline)
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(FONT_SIZES.body);
      const label7 = "7 Seal and name of the seal agency";
      const label7Width = pdf.getTextWidth(label7);

      pdf.text(label7, leftX, yPos);
      pdf.setLineWidth(0.5);

      yPos += 30;

      // --- Declaration & CHA ---
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(FONT_SIZES.body);
      pdf.text(
        "I/We declare that the particulars given herein are true and correct",
        leftX,
        yPos
      );

      pdf.text("Signature of the CB:", rightX, yPos, { align: "right" });

      yPos += 25;

      pdf.setFont("helvetica", "bold");
      const chaName = (data.cha_name || "").toUpperCase();
      pdf.text(chaName, rightX, yPos, { align: "right" });

      yPos += 25;

      // --- Date & ID ---
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(FONT_SIZES.body);
      pdf.text("DATE :", leftX, yPos);

      // ID CARD NO. aligned to right, with margin
      pdf.text("ID CARD NO.", rightX, yPos, { align: "right" });
      // Line for ID Card No.
      const idLabelWidth = pdf.getTextWidth("ID CARD NO.");
      pdf.setLineWidth(0.5);
      pdf.line(rightX - idLabelWidth - 80, yPos + 2, rightX, yPos + 2);

      yPos += 25;

      // --- Officer Section ---
      pdf.setFont("helvetica", "normal");
      const officerText1 =
        "Goods arrived, verified the numbers of packages and";
      pdf.text(officerText1, leftX, yPos);

      pdf.setFont("helvetica", "bold");
      pdf.text("INSPECTOR OF CUSTOMS", rightX, yPos, { align: "right" });

      yPos += 20;

      pdf.setFont("helvetica", "normal");
      const officerText2 =
        "marks and numbers thereon and found to be a declared";
      pdf.text(officerText2, leftX, yPos);

      // ICD Station aligned to Right
      const customHouse = (data.custom_house || "").toUpperCase();
      pdf.text(customHouse, rightX, yPos, { align: "right" });

      yPos += 25;

      // --- Sample Ref ---
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "Sample Ref/Test : PTM/PTR _______________________________________________________",
        leftX,
        yPos
      );

      yPos += 20;

      // --- Table ---
      const tableHeaders = [
        "Sr No",
        "Container No",
        "Size",
        "RFID Seal\nNo & date",
        "Customs Seal\nNo & Date",
      ];

      const tableData = [];
      const containers = data.containers || [];

      for (let i = 0; i < 10; i++) {
        const container = containers[i];
        let srNo = (i + 1).toString();
        let containerNo = "";
        let size = "";
        let rfidSeal = "";
        let customsSeal = "";

        if (container) {
          containerNo = container.containerNo || "";
          const sizeMatch = (container.type || "").match(/^(\d+)/);
          size = sizeMatch ? sizeMatch[1] : container.type || "";
          rfidSeal =
            container.sealType &&
            container.sealType.toUpperCase().includes("RFID")
              ? container.sealNo || ""
              : "";
          customsSeal =
            !container.sealType ||
            !container.sealType.toUpperCase().includes("RFID")
              ? container.sealNo || ""
              : "";
        }

        tableData.push([srNo, containerNo, size, rfidSeal, customsSeal]);
      }

      pdf.autoTable({
        startY: yPos,
        head: [tableHeaders],
        body: tableData,
        theme: "grid",
        styles: {
          fontSize: 10,
          font: "helvetica",
          cellPadding: 4,
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 40 },
          1: { halign: "center" },
          2: { halign: "center", cellWidth: 40 },
          3: { halign: "center" },
          4: { halign: "center" },
        },
        margin: { left: leftX, right: margins.right },
        tableWidth: width - (margins.left + margins.right),
      });

      // --- Footer ---
      yPos = pdf.lastAutoTable.finalY + 15;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(FONT_SIZES.body);

      // Align all footer text strictly to the Right Margin (rightX)
      // This ensures it doesn't cut off on the right side and looks official.

      pdf.text("PRINT ALLOWED", rightX, yPos, { align: "right" });

      yPos += 12;
      pdf.text("INSPECTOR OF CUSTOMS", rightX, yPos, { align: "right" });

      yPos += 12;
      // Split ICD name only if it's excessively long, otherwise print right-aligned
      const icdName = customHouse;
      const icdSplit = pdf.splitTextToSize(
        icdName,
        width - margins.right - leftX
      );

      // If multiple lines, align right.
      // Note: splitTextToSize returns an array of strings.
      pdf.text(icdSplit, rightX, yPos, { align: "right" });

      // Save PDF
      const fileName = `Annexure_C_${data.job_no || "Job"}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("Error generating Annexure C:", err);
    }
  };

  return children
    ? React.cloneElement(children, { onClick: generatePDF })
    : null;
};

export default AnnexureCGenerator;
