import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { MenuItem } from "@mui/material";

// Import the logo properly for Vite
import concorLogo from "../../../../assets/images/concor.png";

const ConcorForwardingNotePDFGenerator = ({ jobNo, children }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
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

      // 2. Map Data Objects
      const containers = exportJob.containers || [];
      const operations = exportJob.operations?.[0] || {};
      const booking = operations.bookingDetails?.[0] || {};
      const invoice = exportJob.invoices?.[0] || {};
      const product = invoice.products?.[0] || {};
      const statusDetails = operations.statusDetails?.[0] || {};

      // 3. Initialize jsPDF
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
      const leftMargin = 3;
      const rightMargin = 3;
      const topMargin = 3;
      const bottomMargin = 10;
      const contentWidth = pageWidth - leftMargin - rightMargin;

      // Dynamic scaling based on container count
      const containerCount = Math.max(containers.length, 6);
      const isCompact = containerCount > 6;

      // Scale factors for compact mode
      const headerScale = isCompact ? 0.85 : 1;
      const rowScale = isCompact ? 0.8 : 1;

      let yPos = topMargin;

      // ==========================================
      // HEADER SECTION - White background with logos
      // ==========================================
      const headerHeight = 14 * headerScale;
      const logoSize = 12 * headerScale; // Square logo (equal width and height)

      // Header border (optional - draws a box around header)
      //   doc.setDrawColor(0, 0, 0);
      //   doc.setLineWidth(0.3);
      //   doc.rect(leftMargin, yPos, contentWidth, headerHeight);

      // Left Logo - Square
      try {
        doc.addImage(
          concorLogo,
          "PNG",
          leftMargin + 1,
          yPos + 1,
          logoSize,
          logoSize
        );
      } catch (err) {
        console.warn("Logo not found");
      }

      // Right Logo - Square
      try {
        doc.addImage(
          concorLogo,
          "PNG",
          pageWidth - rightMargin - logoSize - 1,
          yPos + 1,
          logoSize,
          logoSize
        );
      } catch (err) {
        console.warn("Logo not found");
      }

      // Main Title - Black text on white background
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0); // Black color
      doc.setFontSize(12 * headerScale);
      doc.text(
        "CONTAINER CORPORATION OF INDIA LIMITED (CONCOR)",
        pageWidth / 2,
        yPos + 5,
        { align: "center" }
      );

      // Subtitle
      doc.setFontSize(6 * headerScale);
      doc.text(
        "FORWARDING NOTE FOR GENERAL AND DANGEROUS MERCHANDISE",
        pageWidth / 2,
        yPos + 9,
        { align: "center" }
      );

      // For CONCOR Use Only
      doc.setFontSize(5 * headerScale);
      doc.text("(FOR CONCOR USE ONLY)", pageWidth / 2, yPos + 12, {
        align: "center",
      });

      yPos += headerHeight + 2;

      // ==========================================
      // JOB / INV ROW
      // ==========================================
      doc.setFontSize(10 * headerScale);
      doc.setFont("helvetica", "bold");
      doc.text("JOB", pageWidth / 2 - 50, yPos);
      doc.text(exportJob.job_no || "", pageWidth / 2 - 35, yPos);
      doc.text("INV", pageWidth / 2 + 20, yPos);
      doc.text(invoice.invoiceNumber || "", pageWidth / 2 + 30, yPos);

      yPos += 5 * headerScale;

      // ==========================================
      // FORM GRID - Dynamic row height
      // ==========================================
      let boxY = yPos;
      const rowH = 5.5 * rowScale;
      const smallRowH = 3 * rowScale;

      doc.setLineWidth(0.2);

      // SEGMENT / EXIM / MODE ROW
      doc.rect(leftMargin, boxY, 30, rowH);
      doc.rect(leftMargin + 30, boxY, 30, rowH);
      doc.rect(leftMargin + 60, boxY, contentWidth - 60, rowH);

      doc.setFontSize(7 * rowScale);
      doc.setFont("helvetica", "bold");
      doc.text("SEGMENT", leftMargin + 15, boxY + rowH * 0.7, {
        align: "center",
      });
      doc.text("EXIM", leftMargin + 45, boxY + rowH * 0.7, { align: "center" });
      doc.setFontSize(8 * rowScale);
      doc.text(
        "MODE (TICK ONE):    BY    RAIL /ROAD",
        leftMargin + 65,
        boxY + rowH * 0.7
      );

      boxY += rowH;

      // FROM / TO HEADER ROW
      const fromWidth = contentWidth * 0.35;
      const toWidth = contentWidth * 0.65;

      doc.rect(leftMargin, boxY, fromWidth, rowH);
      doc.rect(leftMargin + fromWidth, boxY, toWidth, rowH);

      doc.setFontSize(8 * rowScale);
      doc.text("FROM", leftMargin + fromWidth / 2, boxY + rowH * 0.7, {
        align: "center",
      });
      doc.text("TO", leftMargin + fromWidth + toWidth / 2, boxY + rowH * 0.7, {
        align: "center",
      });

      boxY += rowH;

      // TERMINAL / GATEWAY | SHIPPING LINE / POD / COUNTRY LABELS
      const col1 = fromWidth / 2;
      const col2 = fromWidth / 2;
      const col3 = toWidth * 0.35;
      const col4 = toWidth * 0.35;
      const col5 = toWidth * 0.3;

      doc.rect(leftMargin, boxY, col1, rowH);
      doc.rect(leftMargin + col1, boxY, col2, rowH);
      doc.rect(leftMargin + fromWidth, boxY, col3, rowH);
      doc.rect(leftMargin + fromWidth + col3, boxY, col4, rowH);
      doc.rect(leftMargin + fromWidth + col3 + col4, boxY, col5, rowH);

      doc.setFontSize(5.5 * rowScale);
      doc.text("TERMINAL", leftMargin + col1 / 2, boxY + rowH * 0.7, {
        align: "center",
      });
      doc.text(
        "GATEWAY PORT",
        leftMargin + col1 + col2 / 2,
        boxY + rowH * 0.7,
        { align: "center" }
      );
      doc.text(
        "SHIPPING LINE",
        leftMargin + fromWidth + col3 / 2,
        boxY + rowH * 0.7,
        { align: "center" }
      );
      doc.text(
        "PORT OF DISCHARGE",
        leftMargin + fromWidth + col3 + col4 / 2,
        boxY + rowH * 0.7,
        { align: "center" }
      );
      doc.text(
        "COUNTRY",
        leftMargin + fromWidth + col3 + col4 + col5 / 2,
        boxY + rowH * 0.7,
        { align: "center" }
      );

      boxY += rowH;

      // VALUES ROW
      doc.rect(leftMargin, boxY, col1, rowH);
      doc.rect(leftMargin + col1, boxY, col2, rowH);
      doc.rect(leftMargin + fromWidth, boxY, col3, rowH);
      doc.rect(leftMargin + fromWidth + col3, boxY, col4, rowH);
      doc.rect(leftMargin + fromWidth + col3 + col4, boxY, col5, rowH);

      doc.setFontSize(9 * rowScale);
      doc.setFont("helvetica", "bold");
      doc.text(
        exportJob.branchCode || "KHDB",
        leftMargin + col1 / 2,
        boxY + rowH * 0.75,
        { align: "center" }
      );
      doc.text(
        exportJob.gateway_port || booking.portOfLoading || "",
        leftMargin + col1 + col2 / 2,
        boxY + rowH * 0.75,
        { align: "center" }
      );
      doc.text(
        booking.shippingLineName || "",
        leftMargin + fromWidth + col3 / 2,
        boxY + rowH * 0.75,
        { align: "center" }
      );
      doc.text(
        exportJob.port_of_discharge || "",
        leftMargin + fromWidth + col3 + col4 / 2,
        boxY + rowH * 0.75,
        { align: "center" }
      );
      doc.text(
        exportJob.discharge_country || "",
        leftMargin + fromWidth + col3 + col4 + col5 / 2,
        boxY + rowH * 0.75,
        { align: "center" }
      );

      boxY += rowH;

      // CUSTOMER TYPE ROW
      doc.rect(leftMargin, boxY, contentWidth, rowH);
      doc.setFontSize(6 * rowScale);
      doc.text("CUSTOMER TYPE: (TICK ONE)", leftMargin + 3, boxY + rowH * 0.7);
      doc.text("EXPORTER", leftMargin + 50, boxY + rowH * 0.7);
      doc.text("IMPORTER", leftMargin + 80, boxY + rowH * 0.7);
      doc.text("ASSOCIATE PARTNER", leftMargin + 110, boxY + rowH * 0.7);
      doc.text("CORPORATE CUSTOMER", leftMargin + 155, boxY + rowH * 0.7);

      boxY += rowH;

      // CHA NAME & CODE
      doc.rect(leftMargin, boxY, contentWidth, rowH + 1);
      doc.setFontSize(10 * rowScale);
      doc.text(
        "CHA NAME & CODE:  SURAJ FORWARDERS AND SHIPPING AGENCIES",
        leftMargin + 3,
        boxY + (rowH + 1) * 0.7
      );

      boxY += rowH + 1;

      // TRANSPORTED BY ROW
      doc.rect(leftMargin, boxY, contentWidth, smallRowH);
      doc.setFontSize(5.5 * rowScale);
      doc.text("TRANSPORTED BY:", leftMargin + 3, boxY + smallRowH * 0.75);
      doc.text("SELF TPT", leftMargin + 35, boxY + smallRowH * 0.75);
      doc.text("CONCOR", leftMargin + 60, boxY + smallRowH * 0.75);

      boxY += smallRowH;

      // In case of CONCOR
      doc.rect(leftMargin, boxY, contentWidth, smallRowH);
      doc.setFontSize(5 * rowScale);
      doc.text(
        "In case of CONCOR service, Kindly provide",
        leftMargin + 3,
        boxY + smallRowH * 0.75
      );

      boxY += smallRowH;

      // PICK UP POINT
      doc.rect(leftMargin, boxY, contentWidth, smallRowH);
      doc.text(
        `PICK UP POINT/KM:    ${exportJob.factory_address || ""}`,
        leftMargin + 3,
        boxY + smallRowH * 0.75
      );

      boxY += smallRowH;

      // DELIVER POINT
      doc.rect(leftMargin, boxY, contentWidth, smallRowH);
      doc.text("DELIVER POINT/KM:", leftMargin + 3, boxY + smallRowH * 0.75);

      boxY += smallRowH;

      // SHIPPING BILL NO
      doc.rect(leftMargin, boxY, contentWidth, rowH + 2);
      doc.setFontSize(12 * rowScale);
      doc.setFont("helvetica", "bold");
      doc.text(
        `SHIPPING BILL NO.${exportJob.sb_no || ""} DATE ${formatDate(
          exportJob.sb_date
        )}`,
        leftMargin + 3,
        boxY + (rowH + 2) * 0.7
      );

      boxY += rowH + 2;

      // STUFFING TYPE / GST IN INVOICE NAME
      doc.rect(leftMargin, boxY, contentWidth / 2, rowH);
      doc.rect(leftMargin + contentWidth / 2, boxY, contentWidth / 2, rowH);
      doc.setFontSize(7 * rowScale);
      doc.text(
        `STUFFING TYPE [FACTORY (FS)/ ICD (CFS)]:  ${
          exportJob.goods_stuffed_at === "Factory" ? "FCL" : "ICD"
        }`,
        leftMargin + 3,
        boxY + rowH * 0.7
      );
      doc.text(
        `GST IN INVOICE NAME OF : ${exportJob.exporter || ""}`,
        leftMargin + contentWidth / 2 + 3,
        boxY + rowH * 0.7
      );

      boxY += rowH;

      // PAYMENT MODE
      doc.rect(leftMargin, boxY, contentWidth, rowH);
      doc.setFontSize(7 * rowScale);
      doc.text(
        "PAYMENT MODE (PDA) & NO.: SURAJ FORWARDERS PVT. LTD.",
        leftMargin + 3,
        boxY + rowH * 0.7
      );

      boxY += rowH;

      // EXPORTER NAME
      doc.rect(leftMargin, boxY, contentWidth, rowH + 1);
      doc.setFontSize(12 * rowScale);
      doc.setFont("helvetica", "bold");
      doc.text(
        `EXPORTER NAME : ${exportJob.exporter || ""}`,
        leftMargin + 3,
        boxY + (rowH + 1) * 0.7
      );

      boxY += rowH + 1;

      // NAME IN INVOICE GSTIN NO
      doc.rect(leftMargin, boxY, contentWidth, rowH + 1);
      doc.setFontSize(10 * rowScale);
      doc.text(
        `NAME IN INVOICE  GSTIN  NO : ${exportJob.exporter_gstin || ""}`,
        leftMargin + 3,
        boxY + (rowH + 1) * 0.7
      );

      boxY += rowH + 3;

      // ==========================================
      // CONTAINER TABLE - Dynamic sizing
      // ==========================================

      // Calculate available space for table
      const availableHeight = pageHeight - boxY - bottomMargin - 5; // Leave space for P.T.O.

      // Calculate dynamic font size based on container count
      const tableFontSize = containerCount > 8 ? 5 : containerCount > 6 ? 6 : 7;
      const tableHeaderFontSize =
        containerCount > 8 ? 4.5 : containerCount > 6 ? 5 : 5.5;
      const tableCellPadding = containerCount > 8 ? 0.5 : 1;

      const tableHeaders = [
        "Sr.\nNo.",
        "CONTAINER NO.",
        "TYPE",
        "SIZE",
        "TARE WT.",
        "NO. OF\nPACKAGES",
        "COMMODITY NAME",
        "COMMODITY\nHSN CODE",
        "CARGO WT\n(In MTS)",
        "VERIFIED GROSS\nMASS (VGM)",
        "HAZARDOUS\nCARGO",
        "VALUE OF\nCARGO/FOB",
        "LEO DT",
        "SEAL NO.",
      ];

      // Generate table rows - minimum 6, or actual count
      const rowCount = Math.max(6, containers.length);
      const tableBody = [];

      for (let i = 0; i < rowCount; i++) {
        const cnt = containers[i];
        if (cnt) {
          const sizeMatch = (cnt.type || "").match(/^(\d+)/);
          const size = sizeMatch ? sizeMatch[1] : "";
          tableBody.push([
            i + 1,
            cnt.containerNo || "",
            "ICD",
            size,
            cnt.tareWeightKgs || "",
            cnt.pkgsStuffed || "",
            product.description || "",
            product.ritc || "",
            (parseFloat(cnt.grossWeight || 0) / 1000).toFixed(1),
            cnt.grWtPlusTrWt
              ? (parseFloat(cnt.grWtPlusTrWt) / 1000).toFixed(1)
              : "",
            "NO",
            invoice.invoiceValue || "",
            formatDate(statusDetails.leoDate),
            cnt.sealNo || "",
          ]);
        } else {
          tableBody.push([
            i + 1,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
          ]);
        }
      }

      // Calculate totals for packages and cargo weight
      const totalPackages = containers.reduce(
        (sum, cnt) => sum + (Number(cnt.pkgsStuffed) || 0),
        0
      );
      const totalCargoWeight = containers.reduce(
        (sum, cnt) => sum + parseFloat(cnt.grossWeight || 0) / 1000,
        0
      );

      // Add TOTAL row
      tableBody.push([
        "",
        "",
        "",
        "",
        "",
        totalPackages || "",
        "",
        "",
        totalCargoWeight ? totalCargoWeight.toFixed(1) : "",
        "",
        "",
        "",
        "",
        "",
      ]);

      // Calculate column widths to fit exactly in content width
      const totalWidth = contentWidth;
      const colWidths = {
        0: totalWidth * 0.04, // Sr. No
        1: totalWidth * 0.1, // Container No
        2: totalWidth * 0.05, // Type
        3: totalWidth * 0.04, // Size
        4: totalWidth * 0.06, // Tare Wt
        5: totalWidth * 0.06, // Packages
        6: totalWidth * 0.12, // Commodity
        7: totalWidth * 0.08, // HSN
        8: totalWidth * 0.07, // Cargo Wt
        9: totalWidth * 0.09, // VGM
        10: totalWidth * 0.07, // Hazardous
        11: totalWidth * 0.08, // Value
        12: totalWidth * 0.06, // LEO
        13: totalWidth * 0.08, // Seal
      };

      doc.autoTable({
        startY: boxY,
        head: [tableHeaders],
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: tableFontSize,
          cellPadding: tableCellPadding,
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          textColor: 0,
          valign: "middle",
          halign: "center",
          font: "helvetica",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: 0,
          fontStyle: "bold",
          fontSize: tableHeaderFontSize,
          halign: "center",
          minCellHeight: containerCount > 6 ? 8 : 10,
        },
        bodyStyles: {
          minCellHeight: containerCount > 8 ? 5 : containerCount > 6 ? 6 : 7,
        },
        columnStyles: {
          0: { cellWidth: colWidths[0] },
          1: { cellWidth: colWidths[1] },
          2: { cellWidth: colWidths[2] },
          3: { cellWidth: colWidths[3] },
          4: { cellWidth: colWidths[4] },
          5: { cellWidth: colWidths[5] },
          6: { cellWidth: colWidths[6] },
          7: { cellWidth: colWidths[7] },
          8: { cellWidth: colWidths[8] },
          9: { cellWidth: colWidths[9] },
          10: { cellWidth: colWidths[10] },
          11: { cellWidth: colWidths[11] },
          12: { cellWidth: colWidths[12] },
          13: { cellWidth: colWidths[13] },
        },
        margin: { left: leftMargin, right: rightMargin },
        tableWidth: contentWidth,
      });

      // Get Y position after table - add 10mm margin from table bottom
      yPos = doc.lastAutoTable.finalY + 10;

      // ==========================================
      // DECLARATIONS ON PAGE 1 (after table)
      // ==========================================

      // Check if we need a new page for declarations
      const declarationsHeight = 55; // Approximate height needed for declarations
      if (yPos + declarationsHeight > pageHeight - bottomMargin) {
        doc.addPage();
        yPos = topMargin + 5;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("(Accepted on said to contain Basis)", leftMargin, yPos);
      yPos += 5;

      const declarations = [
        "1. I declare that each consignment is of value Rs._________________ and engage**/do not engage** to pay percentage charge on excess value for the increased",
        "   risk as required by CONCOR (Description and contents in each package & its value should be specifically mentioned).",
        "   Alternative CONCOR risk and Owner's risk being available, I elect to pay ________________ rates.",
        "2. Please declare whether above container/contains high value cargo YES/NO",
        "3. I do hereby certify that I have satisfied myself that the description,marks & weights or quantity of goods consigned by me have been correctly",
        "   entered in the Forwarding Note. I further declare that I hae read and accept the Terms & Conditions mentioned herein and overleaf.",
      ];

      declarations.forEach((line) => {
        doc.text(line, leftMargin, yPos);
        yPos += 4;
      });

      yPos += 3;
      doc.text("Tick the appropriate option shown above.", leftMargin, yPos);

      // Signature and Date on right side
      doc.setFont("helvetica", "bold");
      doc.text(
        "Signature & Seal of the Customer",
        pageWidth - rightMargin - 55,
        yPos
      );
      yPos += 6;
      doc.text(
        `DATE: ${formatDate(new Date())}`,
        pageWidth - rightMargin - 55,
        yPos
      );

      // P.T.O. at bottom right
      doc.setFontSize(10);
      doc.text("P.T.O.", pageWidth - rightMargin - 12, pageHeight - 5);

      // ==========================================
      // PAGE 2: TERMS AND CONDITIONS
      // ==========================================
      doc.addPage();
      let page2Y = topMargin + 5;

      // TERMS AND CONDITIONS Header
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TERMS AND CONDITIONS", pageWidth / 2, page2Y, {
        align: "center",
      });
      page2Y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      const terms = [
        "1. Unless the consignor declares in clause(1) overleaf the value of any consignment & pays percentage charge on excess value as required by CONCOR,",
        "   the maximum limit of amount of monetary lialility of CONCOR for loss, destructin damage,deterioration or non-delivery of the consignment shall not",
        "   exceed Rs. 50 per kg.",
        "",
        "2. When alternative 'CONCOR Risk' and 'Owner Risk' rates are quoted,the latter will apply,unless the sender in Clause (1) overleaf enter the 'CONCOR",
        "   Risk' when he will pay or engage to pay the higher and will reserve a certificate with this effect.",
        "",
        "3. I further declare that I accept responsibility for any consequences to the property of the CONCOR, or to the property of other persons,entrusted or",
        "   to be entrusted to the CONCOR for conveyance, or otherwise which may be caused by the said consignment, and that all risk and responsibility whether",
        "   to the CONCOR, to their servants or to others remains solely and entirely with me.",
        "",
        "Note - The attention of the sender or his agent is invited to the principal terms and conditions applying to the carriage of dangerous goods by CONCOR",
        "       which are set forth in I.R.C.A Red Tariff and International Maritime of Dangerous Goods (IMDG)",
      ];

      terms.forEach((line) => {
        doc.text(line, leftMargin, page2Y);
        page2Y += 4;
      });

      page2Y += 5;

      // Additional Declaration Box
      doc.rect(leftMargin, page2Y, contentWidth, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(
        "Here enter additional declaration which may be required by the Rules laid down in the I.R.C.A Red Tariff and",
        leftMargin + 2,
        page2Y + 6
      );
      doc.text(
        "International Maritime of Dangerous Goods (IMDG).",
        leftMargin + 2,
        page2Y + 11
      );

      page2Y += 28;

      // FOR OFFICE USE Box
      doc.setLineWidth(0.4);
      doc.rect(leftMargin, page2Y, contentWidth, 25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("FOR OFFICE USE", leftMargin + 5, page2Y + 8);

      // Open PDF in new tab
      window.open(doc.output("bloburl"), "_blank");
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Error generating PDF: " + err.message);
    }
  };

  return children ? (
    React.cloneElement(children, { onClick: generatePDF })
  ) : (
    <MenuItem onClick={generatePDF}>Concor Forwarding Note (PDF)</MenuItem>
  );
};

export default ConcorForwardingNotePDFGenerator;
