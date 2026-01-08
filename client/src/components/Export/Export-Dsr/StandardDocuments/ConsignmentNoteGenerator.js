import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { MenuItem } from "@mui/material";

const ConsignmentNoteGenerator = ({ jobNo, children }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

      // Calculate/Extract values
      // Calculate/Extract values
      const invoice = exportJob.invoices?.[0] || {};
      const productValues = invoice.products || exportJob.products || [];
      const containerDetails = exportJob.containers || [];
      const operations = exportJob.operations?.[0] || {};
      const transporter = operations.transporterDetails?.[0] || {};
      const booking = operations.bookingDetails?.[0] || {};
      const consignee = exportJob.consignees?.[0] || {};
      const statusDetails = operations.statusDetails?.[0] || {};

      // Calculate Total Invoice Value (FOB/CIF)
      // Calculate Total Invoice Value (FOB/CIF)
      const totalInvoiceValue = (exportJob.invoices || []).reduce(
        (sum, inv) => {
          const val = parseFloat(inv.invoiceValue) || 0;
          return sum + val;
        },
        0
      );

      // Helper to get total pkgs if not in container
      const totalPkgs = exportJob.total_no_of_pkgs || 0;
      const pkgUnit = exportJob.package_unit || "PKG";

      // Prepare Data Object
      const data = {
        consignorName:
          exportJob.duties_taxes_payable_by === "Exporter"
            ? exportJob.exporter
            : exportJob.consignor_name || exportJob.exporter,
        exporterNameAddress: `${exportJob.exporter || ""}\n${exportJob.exporter_address || ""
          }`,
        consigneeNameAddress: `${consignee.consignee_name || ""}\n${consignee.consignee_address || ""
          }`,
        agentCha: exportJob.cha || exportJob.cha_name || "",
        finalDestination:
          exportJob.final_destination || exportJob.destination_port || "",
        finalDestCountry:
          exportJob.destination_country ||
          exportJob.country_of_destination ||
          "",
        gatewayPort: exportJob.gateway_port || "",
        shippingBillNo: exportJob.sb_no || "",
        shippingBillDate: formatDate(exportJob.sb_date),
        portOfDischarge: exportJob.port_of_discharge || "",
        stuffingType:
          exportJob.stuffing_type ||
          (exportJob.goods_stuffed_at === "Factory"
            ? "FACTORY (FS)"
            : "ICD(CFS)"),
        fobValue: totalInvoiceValue || "",
        leoDate: formatDate(statusDetails.leoDate || exportJob.leo_date),
        vesselNameVoyage: `${exportJob.vessel_name || ""} ${exportJob.voyage_no ? "/" + exportJob.voyage_no : ""
          }`,
        cutOffDate: formatDate(exportJob.cut_off_date),
        specialInstructions: exportJob.remarks || "",

        // --- Extra Mapped Fields ---
        transportMode:
          exportJob.transportMode || exportJob.transport_mode || "",
        ccnNo: exportJob.ccn_no || "",
        railOperator: transporter.transporterName || transporter.name || "",
        paymentType:
          exportJob.payment_type || exportJob.otherInfo?.natureOfPayment || "",
        hpcslShipper: exportJob.hpcsl_shipper || "",
        stuffingArrangedBy: exportJob.stuffing_arranged_by || "",
        remarks: exportJob.remarks || "",
        bookingTime: formatDate(exportJob.job_date),

        goods: containerDetails.map((cnt, i) => ({
          sNo: i + 1,
          containerNo: cnt.containerNo || "",
          size: cnt.size || cnt.type?.match(/\d+/)?.[0] || "",
          pkgs: `${exportJob.total_no_of_pkgs || ""} ${exportJob.package_unit || "PKG"
            }`,
          description: cnt.type || "",
          tareWt: cnt.tareWeightKgs || cnt.tareWeight || "",
          grossWt: exportJob.gross_weight_kg || "",
          customsSeal: cnt.sealNo || "",
          shipperSeal: booking.shippingLineSealNo || cnt.agentSealNo || "",
        })),

        goodsFallback: [
          {
            sNo: 1,
            containerNo: transporter.containerNo || "See Container List",
            size: exportJob.containers?.[0]?.type?.match(/\d+/)?.[0] || "20/40",
            pkgs: `${totalPkgs} ${pkgUnit}`,
            description: exportJob.containers?.[0]?.type || "Container",
            tareWt: "",
            grossWt: exportJob.gross_weight_kg || exportJob.gross_weight || "",
            customsSeal: "",
            shipperSeal: "",
          },
        ],
      };

      const goodsData = data.goods.length > 0 ? data.goods : data.goodsFallback;

      // 2. Initialize jsPDF
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight();
      const leftMargin = 10;
      const rightMargin = 10;
      const contentWidth = pageWidth - leftMargin - rightMargin; // 190mm

      let yPos = 10;

      // ================= HEADER =================
      // DP WORLD
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("DP WORLD", leftMargin, yPos);

      // Company Name
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(
        "CONTINENTAL WAREHOUSING CORPORATION (NHAVA SEVA) PVT. LTD.",
        pageWidth / 2,
        yPos,
        { align: "center" }
      );
      yPos += 5;

      // Address
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const address =
        "Near Nirma Factory, Opposite Jakhwada Railway Station, Village Sachana, Viramgam Taluka, Ahmedabad - 382 150, Gujarat, India.";
      doc.text(address, pageWidth / 2, yPos, { align: "center" });
      yPos += 5;

      // Line
      doc.setLineWidth(0.3);
      doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);
      yPos += 5;

      // ================= TOP BLOCK =================

      // Right Box Dimensions
      const boxWidth = 55;
      const boxX = pageWidth - rightMargin - boxWidth;
      const boxY = yPos - 2;
      const boxH = 22;

      doc.setLineWidth(0.3);
      doc.rect(boxX, boxY, boxWidth, boxH);
      doc.line(boxX, boxY + 5.5, boxX + boxWidth, boxY + 5.5);
      doc.line(boxX, boxY + 11, boxX + boxWidth, boxY + 11);
      doc.line(boxX, boxY + 16.5, boxX + boxWidth, boxY + 16.5);
      doc.line(boxX + 35, boxY + 16.5, boxX + 35, boxY + 22);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CWC (NS) PVT. LTD. USE", boxX + 1, boxY + 3.5);
      doc.setFont("helvetica", "normal");
      doc.text("CCN No. & Date :", boxX + 1, boxY + 9);
      if (data.ccnNo) {
        doc.text(data.ccnNo, boxX + 25, boxY + 9);
      }

      doc.text("To :", boxX + 1, boxY + 14.5);

      doc.setFontSize(7);
      doc.text("Rail Operator", boxX + 1, boxY + 19);
      if (data.railOperator) {
        doc.text(data.railOperator, boxX + 36, boxY + 20);
      }

      // Left Side: Title & Mode
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("CWC CONSIGNMENT NOTE", leftMargin, yPos + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Mode by : RAIL / ROAD", leftMargin, yPos + 10);
      // Highlight Mode if data available
      if (data.transportMode) {
        const mode = data.transportMode.toUpperCase();
        if (mode === "RAIL") {
          const txtW = doc.getTextWidth("Mode by : ");
          const railW = doc.getTextWidth("RAIL");
          // Underline RAIL
          doc.line(
            leftMargin + txtW,
            yPos + 11,
            leftMargin + txtW + railW,
            yPos + 11
          );
        } else if (mode === "ROAD") {
          const txtW = doc.getTextWidth("Mode by : RAIL / ");
          const roadW = doc.getTextWidth("ROAD");
          // Underline ROAD
          doc.line(
            leftMargin + txtW,
            yPos + 11,
            leftMargin + txtW + roadW,
            yPos + 11
          );
        }
      }

      yPos += 14;

      // ================= "TO" SECTION =================
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("To,", leftMargin, yPos + 3);
      doc.text("The Terminal Manager", leftMargin, yPos + 8);
      doc.text("CWC (NS) Pvt. Ltd. Sachana", leftMargin, yPos + 13);
      yPos += 16;

      // Disclaimer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const paraText =
        "Please receive to the under mentioned container stuffed at ICD/Factory. We accept that all Transportation and/or storage and/or provision of Containers and business incidental there to have been undertaken by CWC(NS) Pvt. Ltd. on the basis of their standard terms & conditions which have been read by us and understood. No servant of agent of the company has any authority to vary or waive conditions or any part there of.";
      const splitPara = doc.splitTextToSize(paraText, contentWidth);
      doc.text(splitPara, leftMargin, yPos);
      yPos += splitPara.length * 3 + 3;

      // ================= FORM GRID (DYNAMIC HEIGHTS) =================
      const col1X = leftMargin;
      const col1W = 85;
      const col2X = leftMargin + col1W;
      const col2W = contentWidth - col1W;

      const getRowHeight = (texts, widths, fontSize, minHeight = 11) => {
        doc.setFontSize(fontSize);
        let maxHeight = minHeight;
        texts.forEach((text, i) => {
          const splitText = doc.splitTextToSize(String(text || ""), widths[i] - 2);
          const height = (splitText.length * (fontSize * 0.45)) + 5;
          if (height > maxHeight) maxHeight = height;
        });
        return maxHeight;
      };

      doc.setLineWidth(0.2);

      // --- ROW 1: Consignor / Consignee ---
      const row1H = getRowHeight(
        [data.consignorName, data.consigneeNameAddress],
        [col1W, col2W],
        8,
        13
      );
      doc.rect(col1X, yPos, col1W, row1H);
      doc.rect(col2X, yPos, col2W, row1H);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Name of Consignor (S/Line)", col1X + 1, yPos + 4);
      doc.text("Name and address of consignee (S/Line)", col2X + 1, yPos + 4);

      doc.setFont("helvetica", "normal");
      doc.text(data.consignorName || "", col1X + 1, yPos + 8, { maxWidth: col1W - 2 });
      doc.text(data.consigneeNameAddress || "", col2X + 1, yPos + 8, { maxWidth: col2W - 2 });

      yPos += row1H;

      // --- ROW 2: Agent / Final Destination ---
      const row2H = getRowHeight(
        [data.cha || "Suraj Forwarders", data.finalDestination],
        [col1W - 26, col2W - 65],
        8,
        11
      );
      doc.rect(col1X, yPos, col1W, row2H);
      doc.rect(col2X, yPos, col2W, row2H);

      doc.setFont("helvetica", "bold");
      doc.text("Agent / CHA", col1X + 1, yPos + row2H / 2, { baseline: 'middle' });
      doc.text("Final Destination :", col2X + 1, yPos + row2H / 2, { baseline: 'middle' });

      doc.setFont("helvetica", "normal");
      doc.text(data.cha || "Suraj Forwarders", col1X + 25, yPos + row2H / 2, {
        maxWidth: col1W - 26,
        baseline: 'middle'
      });
      doc.text(data.finalDestination || "", col2X + 28, yPos + row2H / 2, {
        maxWidth: col2W - 65,
        baseline: 'middle'
      });

      doc.setFont("helvetica", "bold");
      doc.text("Country :", col2X + col2W - 35, yPos + row2H / 2, { baseline: 'middle' });
      doc.setFont("helvetica", "normal");
      doc.text(data.finalDestCountry || "", col2X + col2W - 22, yPos + row2H / 2, {
        maxWidth: 20,
        baseline: 'middle'
      });

      yPos += row2H;

      // --- ROW 3: Exporter / Gateway Port ---
      const row3H = getRowHeight(
        [data.exporterNameAddress, data.gatewayPort],
        [col1W, col2W - 28],
        8,
        25
      );
      doc.rect(col1X, yPos, col1W, row3H);
      doc.rect(col2X, yPos, col2W, row3H);

      doc.setFont("helvetica", "bold");
      doc.text("Name & Address of Exporter", col1X + 1, yPos + 4);
      doc.text("Gateway Port :", col2X + 1, yPos + 6);

      doc.setFont("helvetica", "normal");
      doc.text(data.exporterNameAddress || "", col1X + 1, yPos + 8, { maxWidth: col1W - 2 });
      doc.text(data.gatewayPort || "", col2X + 1, yPos + 10, { maxWidth: col2W - 2 });

      yPos += row3H;

      // --- ROW 4: Shipping Bill / Port Discharge ---
      const row4H = getRowHeight(
        [`${data.shippingBillNo} / ${data.shippingBillDate}`, data.portOfDischarge],
        [col1W - 40, col2W - 30],
        8,
        11
      );
      doc.rect(col1X, yPos, col1W, row4H);
      doc.rect(col2X, yPos, col2W, row4H);

      doc.setFont("helvetica", "bold");
      doc.text("Shipping Bill No. & Date :", col1X + 1, yPos + row4H / 2, { baseline: 'middle' });
      doc.text("Port of Discharge :", col2X + 1, yPos + row4H / 2, { baseline: 'middle' });

      doc.setFont("helvetica", "normal");
      doc.text(`${data.shippingBillNo} / ${data.shippingBillDate}`, col1X + 42, yPos + row4H / 2, {
        maxWidth: col1W - 41,
        baseline: 'middle'
      });
      doc.text(data.portOfDischarge || "", col2X + 30, yPos + row4H / 2, {
        maxWidth: col2W - 31,
        baseline: 'middle'
      });

      yPos += row4H;

      // --- ROW 5: Stuffing / FOB-LEO ---
      const row5H = 12;
      doc.rect(col1X, yPos, col1W, row5H);

      doc.setFillColor(220, 220, 220);
      doc.rect(col1X, yPos, 12, row5H, "F");
      doc.setFillColor(255, 255, 255);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("Stuffing", col1X + 1, yPos + 7);

      doc.setFont("helvetica", "normal");
      doc.text("(Please Tick) : FACTORY (FS)/ICD(CFS)", col1X + 14, yPos + 7);

      if (data.stuffingType && data.stuffingType.includes("FACTORY")) {
        doc.setLineWidth(0.5); doc.circle(col1X + 70, yPos + 6, 2);
      } else {
        doc.setLineWidth(0.2); doc.circle(col1X + 70, yPos + 6, 2);
      }

      if (data.stuffingType && data.stuffingType.includes("ICD")) {
        doc.setLineWidth(0.5); doc.circle(col1X + 80, yPos + 6, 2);
      } else {
        doc.setLineWidth(0.2); doc.circle(col1X + 80, yPos + 6, 2);
      }
      doc.setLineWidth(0.2);

      const halfH = row5H / 2;
      doc.rect(col2X, yPos, col2W, halfH);
      doc.rect(col2X, yPos + halfH, col2W, halfH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("F.O.B./C.I.F. Value", col2X + 1, yPos + halfH - 1);
      doc.text("LEO Date :", col2X + 1, yPos + row5H - 1);

      doc.setFont("helvetica", "normal");
      doc.text(String(data.fobValue || ""), col2X + 40, yPos + halfH - 1);
      doc.text(data.leoDate || "", col2X + 40, yPos + row5H - 1);

      yPos += row5H;

      // --- ROW 6: Vessel / CutOff / Special ---
      const w1 = contentWidth * 0.35;
      const w2 = contentWidth * 0.25;
      const w3 = contentWidth * 0.4;
      const x1Value = col1X;
      const x2Value = col1X + w1;
      const x3Value = col1X + w1 + w2;

      const row6H = getRowHeight(
        [data.vesselNameVoyage, data.cutOffDate, data.specialInstructions],
        [w1, w2, w3],
        7,
        11
      );

      doc.rect(x1Value, yPos, w1, row6H);
      doc.rect(x2Value, yPos, w2, row6H);
      doc.rect(x3Value, yPos, w3, row6H);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("VESSEL NAME AND VOYAGE", x1Value + 1, yPos + 3);
      doc.text("CUT OFF DATE & TIME", x2Value + 1, yPos + 3);
      doc.text("SPECIAL INSTRUCTIONS", x3Value + 1, yPos + 3);

      doc.setFont("helvetica", "normal");
      doc.text(data.vesselNameVoyage || "", x1Value + 1, yPos + 8, { maxWidth: w1 - 2 });
      doc.text(data.cutOffDate || "", x2Value + 1, yPos + 8, { maxWidth: w2 - 2 });
      doc.text(data.specialInstructions || "", x3Value + 1, yPos + 8, { maxWidth: w3 - 2 });

      yPos += row6H;

      // ================= PRE-TABLE TEXT =================
      yPos += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("Factory stuffing arranged by", leftMargin, yPos);
      if (data.stuffingArrangedBy) {
        doc.setFont("helvetica", "bold");
        doc.text(data.stuffingArrangedBy, leftMargin, yPos + 4);
        doc.setFont("helvetica", "normal");
      }

      doc.text("HPCSL SHIPPER", leftMargin + 45, yPos);
      if (data.hpcslShipper) {
        doc.text(data.hpcslShipper, leftMargin + 45, yPos + 4);
      }

      doc.text("Type:LCL/FCL/ODC:Yes/No", leftMargin + 85, yPos);
      // Try to mark Type?

      // Payment Type overlap fix: Move label/value apart
      doc.text("Payment Type PD ACCOUNT", leftMargin + 130, yPos);
      if (data.paymentType) {
        doc.setFont("helvetica", "bold");
        doc.text(data.paymentType, leftMargin + 165, yPos);
        doc.setFont("helvetica", "normal");
      }

      yPos += 5;
      doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);
      yPos += 5;

      // ================= GOODS TABLE =================
      doc.autoTable({
        startY: yPos,
        margin: { left: leftMargin, right: rightMargin, top: 10 },
        pageBreak: "auto",
        showHead: "everyPage",
        head: [
          [
            "S.No.",
            "CONTAINER\nNO.",
            "SIZE",
            "NO. & TYPE\nOF\nPKGS.",
            "DESCRIPTION\nOF GOODS",
            "CONTAINER\nTARE\nWT. (MT)",
            "SBILL GROSS\nWEIGHT (MT)",
            "CUSTOMS\nSEAL NO.",
            "SLINE SEAL/\nAGENT SEAL\nNO.",
          ],
        ],
        body: goodsData.map((g) => [
          g.sNo,
          g.containerNo,
          g.size,
          g.pkgs,
          g.description,
          g.tareWt,
          g.grossWt,
          g.customsSeal,
          g.shipperSeal,
        ]),
        theme: "grid",
        styles: {
          fontSize: 7,
          cellPadding: 1,
          valign: "middle",
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          font: "helvetica",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: 0,
          fontStyle: "bold",
          fontSize: 7,
          halign: "center",
          valign: "middle",
          lineWidth: 0.2,
          lineColor: [0, 0, 0],
          cellPadding: 1,
        },
        // BOLD BODY TEXT
        bodyStyles: {
          fontStyle: "bold",
          textColor: 0,
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 32, halign: "center" },
          2: { cellWidth: 10, halign: "center" },
          3: { cellWidth: 15, halign: "center" },
          4: { cellWidth: "auto", halign: "left" },
          5: { cellWidth: 15, halign: "center" },
          6: { cellWidth: 15, halign: "center" },
          7: { cellWidth: 18, halign: "center" },
          8: { cellWidth: 18, halign: "center" },
        },
      });

      yPos = doc.lastAutoTable.finalY + 5;

      // Check for available space for footer (approx 65mm needed)
      if (yPos + 60 > pageHeight - 10) {
        doc.addPage();
        yPos = 15;
      }

      // ================= FOOTER =================
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      const points = [
        "1. I do hereby certify that I have satisfied my self description, marks, quanitiy, measurement and weight of goods consigned by me have been correctly entere in the note.",
        "2. I hereby that the goods described above are in good order & condition at the time of dispatch.",
        "3. I hereby certify that goods are not classified as dangerous in Indian Railway. Road Tariff of by IMO regulations.",
        "4. It is certified that rated tonnage of the commitment (5) has not been exceeded.",
        "5. IF THE CONTAINER WEIGHT IS NOT SPECIFIEF THEIR TARE WEIGHT IT WILL BE TAKEN AS 2.3 TONS FOR 20’ & 4.6 TONS FOR 40’",
        "6. I understand that the principal terms & conditions applying to the carriage of above containers are subject to the conditions & habities as specified in the Indian Railway Act.1989, as a mentioned from time to time.",
      ];

      points.forEach((p) => {
        const lines = doc.splitTextToSize(p, contentWidth);
        const pointHeight = lines.length * 3.5;

        // Check for page break
        if (yPos + pointHeight > pageHeight - 10) {
          doc.addPage();
          yPos = 15;
        }

        doc.text(lines, leftMargin, yPos);
        yPos += pointHeight;
      });

      yPos += 3;

      // Check if there is enough space for remarks and signatures (approx 40mm)
      if (yPos + 40 > pageHeight - 10) {
        doc.addPage();
        yPos = 15;
      }

      // Remarks Box
      doc.setLineWidth(0.2);
      doc.rect(leftMargin, yPos, contentWidth, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Remarks If any, (PDAA/C/Cheque no.)", leftMargin + 1, yPos + 5);
      if (data.remarks) {
        doc.setFont("helvetica", "normal");
        doc.text(data.remarks, leftMargin + 60, yPos + 5, {
          maxWidth: contentWidth - 65,
        });
      }

      yPos += 15;

      // Signatures
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("DATE", leftMargin, yPos);
      doc.line(leftMargin + 10, yPos, leftMargin + 40, yPos);

      doc.line(
        pageWidth - rightMargin - 70,
        yPos,
        pageWidth - rightMargin,
        yPos
      );
      doc.text(
        "STAMP AND SIGNATURE OF SHIPPER OR AGENT (CHA)",
        pageWidth - rightMargin,
        yPos + 5,
        { align: "right" }
      );

      yPos += 12;

      // Bottom Box
      doc.rect(leftMargin, yPos, contentWidth, 10);
      doc.setFont("helvetica", "bold");
      doc.text("CES (NS) PVT. LTD.", leftMargin + 2, yPos + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("DATE & TIME OF BOOKING OR (EA) :", leftMargin + 2, yPos + 8);
      if (data.bookingTime) {
        doc.text(data.bookingTime, leftMargin + 55, yPos + 8);
      }

      // Open PDF with Preview and Download option
      const filename = `ConsignmentNote_${data.shippingBillNo || "Draft"}.pdf`;
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
        }, 300000);
      }
    } catch (err) {
      console.error("Error generating Consignment Note:", err);
    }
  };

  return children ? (
    React.cloneElement(children, { onClick: generatePDF })
  ) : (
    <MenuItem onClick={generatePDF}>Consignment Note</MenuItem>
  );
};

export default ConsignmentNoteGenerator;
