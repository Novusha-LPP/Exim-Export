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
      month: "2-digit",
      year: "numeric",
    }).replace(/\//g, '.');
  };

  const formatDateForApi = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
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
      const data = response.data;

      const invoice = data.invoices?.[0] || {};
      const booking = data.operations?.[0]?.bookingDetails?.[0] || {};
      const containers = data.containers || [];
      const products = invoice.products || [];

      // Fetch Currency Rates
      let exchangeRate = 1;
      try {
        const jobDateFormatted = formatDateForApi(data.job_date || new Date());
        const currencyResponse = await axios.get(`${import.meta.env.VITE_API_STRING}/currency-rates/by-date/${jobDateFormatted}`);
        if (currencyResponse.data.success && currencyResponse.data.data.exchange_rates) {
          const rateObj = currencyResponse.data.data.exchange_rates.find(r => r.currency_code === (invoice.currency || "USD"));
          if (rateObj) {
            exchangeRate = rateObj.export_rate || rateObj.import_rate || 1;
          }
        }
      } catch (err) {
        console.warn("Currency rate fetch failed", err);
      }

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;

      // Shorten description
      const rawDescription = products[0]?.description || "";
      const shortenedDescription = rawDescription.length > 50 ? rawDescription.substring(0, 47) + "..." : rawDescription;

      let yPos = 10;

      // ================= HEADER =================
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("DP WORLD", margin, yPos);

      doc.setFontSize(10);
      doc.text(
        "CONTINENTAL WAREHOUSING CORPORATION (NHAVA SEVA) PVT. LTD.",
        pageWidth / 2,
        yPos,
        { align: "center" }
      );
      yPos += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const address = "Near Nirma Factory, Opposite Jakhwada Railway Station, Village Sachana, Viramgam Taluka, Ahmedabad - 382 150, Gujarat, India.";
      doc.text(address, pageWidth / 2, yPos, { align: "center" });
      yPos += 5;

      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      // ========== HEADER RIGHT BOX (CWC USE) ==========
      const boxW = 85;
      const boxX = pageWidth - margin - boxW;
      const boxY = yPos - 2;
      const boxH = 30;
      doc.setDrawColor(0);
      doc.setLineWidth(0.4);
      doc.rect(boxX, boxY, boxW, boxH);

      doc.line(boxX, boxY + 7, boxX + boxW, boxY + 7);
      doc.line(boxX, boxY + 13, boxX + boxW, boxY + 13);
      doc.line(boxX, boxY + 19, boxX + boxW, boxY + 19);
      doc.line(boxX, boxY + 25, boxX + boxW, boxY + 25);
      doc.line(boxX + 55, boxY + 25, boxX + 55, boxY + boxH);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("CWC (NS) PVT. LTD. USE", boxX + boxW / 2, boxY + 5, { align: "center" });

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("CCN No. & Date :", boxX + 1, boxY + 11);
      doc.text("To :", boxX + 1, boxY + 17);
      doc.text("Rail Operator", boxX + 1, boxY + 23);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("FORWARDING NOTE", margin, yPos + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Mode By : RAIL", margin, yPos + 12);

      const invoiceNoText = `INVOICE NO:- ${data.invoices?.map(inv => inv.invoiceNumber).join(", ") || ""}`;
      doc.text(invoiceNoText, margin, yPos + 18);

      yPos += 24;

      // ========== TO SECTION ==========
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("To,", margin, yPos);
      doc.text("The Terminal Manager,", margin, yPos + 5);
      doc.text("CWC (NS) PVT. LTD. Sachana", margin, yPos + 10);
      doc.text("Cargo : Non Hazardous", pageWidth - margin, yPos + 10, { align: "right" });

      yPos += 16;

      const disclaimer = "Please receive the under mentioned container stuffed at ICD/Factory. We accept the all Transportation and/or provision of Containers of business incidental there to have been under taken by CWC(NS) PVT. LTD. on the basis of their standard terms and conditions which have been read by us and understood. No servant or agent of the company has any authority to vary or waive conditions or any part there of.";
      const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
      doc.setFontSize(8.5);
      doc.text(splitDisclaimer, margin, yPos);
      yPos += splitDisclaimer.length * 3.5 + 4;

      // ================= FORM GRID =================
      const drawCell = (x, y, w, h, label, value) => {
        doc.rect(x, y, w, h);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(label, x + 1, y + 3);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        const splitValue = doc.splitTextToSize(String(value || ""), w - 2);
        doc.text(splitValue, x + 1, y + 7.5);
      };

      doc.setLineWidth(0.4);
      doc.setFont("helvetica", "bold");

      const r1H = 15;
      drawCell(margin, yPos, contentWidth * 0.4, r1H, "Name of Consignor (S/Line)", booking.shippingLineName);
      drawCell(margin + contentWidth * 0.4, yPos, contentWidth * 0.6, r1H, "Name and address of consignee (S/Line)", data.consignees?.[0]?.consignee_name + "\n" + (data.consignees?.[0]?.consignee_address || ""));
      yPos += r1H;

      const r2H = 15;
      drawCell(margin, yPos, contentWidth * 0.4, r2H, "Agent / CHA", data.cha || "SURAJ FORWARDERS & SHIPPING AGENCIES");
      drawCell(margin + contentWidth * 0.4, yPos, contentWidth * 0.35, r2H, "Final Destination", data.destination_port);
      drawCell(margin + contentWidth * 0.75, yPos, contentWidth * 0.25, r2H, "Country", data.destination_country);
      yPos += r2H;

      const r3H = 18;
      drawCell(margin, yPos, contentWidth * 0.4, r3H, "Name & Address of Exporter", (data.exporter || "") + "\n" + (data.exporter_address || ""));
      drawCell(margin + contentWidth * 0.4, yPos, contentWidth * 0.6, r3H, "Gateway Port", data.gateway_port || booking.portOfLoading || "");
      yPos += r3H;

      const r4H = 12;
      drawCell(margin, yPos, contentWidth * 0.4, r4H, "Shipping Bill No. & Date", (data.sb_no || "") + " / " + formatDate(data.sb_date));
      drawCell(margin + contentWidth * 0.4, yPos, contentWidth * 0.6, r4H, "Port of Discharge", data.port_of_discharge || "");
      yPos += r4H;

      const totalFobVal = (data.invoices || []).reduce((sum, inv) => {
        const val = inv.freightInsuranceCharges?.fobValue?.amount || inv.productValue || 0;
        return sum + (Number(val) || 0);
      }, 0);
      const totalInvoiceVal = (data.invoices || []).reduce((sum, inv) => {
        return sum + (Number(inv.invoiceValue) || 0);
      }, 0);

      const fobInInr = (totalFobVal * exchangeRate).toFixed(2);
      const invInInr = (totalInvoiceVal * exchangeRate).toFixed(2);

      const r5H = 15;
      drawCell(margin, yPos, contentWidth * 0.4, r5H, "Stuffing", (data.goods_stuffed_at === "Factory" ? "FACTORY (FS)" : "ICD (CFS)"));

      doc.rect(margin + contentWidth * 0.4, yPos, contentWidth * 0.6, r5H);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("F.O.B./C.I.F. Value", margin + contentWidth * 0.4 + 1, yPos + 3);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(`FOB: ${fobInInr} INR`, margin + contentWidth * 0.4 + 1, yPos + 7.5);
      doc.text(`INVVAL: ${invInInr} INR`, margin + contentWidth * 0.4 + 1, yPos + 11.5);
      yPos += r5H;

      const r6H = 8;
      drawCell(margin, yPos, contentWidth * 0.4, r6H, "VESSEL NAME AND VOYAGE", (booking.vesselName || "") + " " + (booking.voyageNo || ""));
      drawCell(margin + contentWidth * 0.4, yPos, contentWidth * 0.6, r6H, "LEO Date", formatDate(data.statusDetails?.[0]?.leoDate));
      yPos += r6H;

      yPos += 4;

      // ================= PRE-TABLE TEXT =================
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Factory stuffing arranged by: SHIPPER", margin, yPos + 4);
      doc.text("Type: LCL/FCL/ODC: Yes/No.", margin + 60, yPos + 4);
      doc.text("Payment Type: PAID / TO PAY", margin + 120, yPos + 4);
      yPos += 8;

      // ================= GOODS TABLE =================
      const tableHead = [
        ["Sr\nNo", "Container No", "Size", "No &\nType\nof\nPkgs.", "Description of Goods", "Cargo\nWeight\n(MT)", "Customs\nSeal No.", "S.Line/Agent\nSeal No.", "SB NO.:", "SB DATE"]
      ];

      let totalPkgs = 0;
      let totalWeight = 0;

      const tableBody = containers.map((c, idx) => {
        const pkgs = Number(c.pkgsStuffed) || 0;
        const weight = Number(c.grossWeight) || 0;
        const weightMT = (weight / 1000).toFixed(3);
        totalPkgs += pkgs;
        totalWeight += weight;

        return [
          idx + 1,
          c.containerNo || "",
          c.type?.match(/\d+/)?.[0] || "20",
          pkgs || "",
          shortenedDescription,
          weightMT || "",
          c.sealNo || "",
          booking.shippingLineSealNo || "",
          data.sb_no || "",
          formatDate(data.sb_date)
        ];
      });

      tableBody.push([
        "", "TOTAL", "", totalPkgs || "", "", (totalWeight / 1000).toFixed(3), "", "", "", ""
      ]);

      doc.autoTable({
        startY: yPos,
        margin: { left: margin, right: margin },
        head: tableHead,
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: 8,
          fontStyle: "bold",
          textColor: [0, 0, 0],
          halign: "center",
          valign: "middle",
          lineWidth: 0.4,
          cellPadding: 1,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [255, 255, 255],
          lineWidth: 0.4,
        },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 25 },
          2: { cellWidth: 10 },
          3: { cellWidth: 15 },
          4: { cellWidth: 35, halign: "center" },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 },
          7: { cellWidth: 22 },
          8: { cellWidth: 18 },
          9: { cellWidth: 17 },
        },
      });

      yPos = doc.lastAutoTable.finalY + 3;

      // ========== DECLARATIONS ==========
      const points = [
        "1  I do hereby certify that I have satisfied by self description, marks, quantity, measurement and weight of goods consigned by me have been correctly entered in the note.",
        "2  I hereby certify that the goods described above are in goods order and condition at the time of dispatch.",
        "3  I hereby certify that goods are not classified as dangerous in Indian Railway. Road Tariff of my IMO regulations.",
        "4  It is certify that rated tonnage of the commitment (5) has been exceeded.",
        "5  IF THE CONTAINER WEIGHT, IS NOT SPECIFIED THEIR TARE WEIGHT, IT WILL BE TAKEN AS 2.3 TONS FOR 20' & 4.6 TONS FOR 40'",
        "6  I understand that the principal terms and conditions applying to the carriage of above containers are subject to the conditions and liabilities as specified in the Indian Railway Act 1989, as amended from time to time."
      ];

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setLineWidth(0.4);

      points.forEach((text, i) => {
        const lines = doc.splitTextToSize(text, contentWidth - 8);
        const rectH = lines.length * 3.5 + 2;
        const pageHeight = doc.internal.pageSize.getHeight();
        if (yPos + rectH > pageHeight - margin) {
          doc.addPage();
          yPos = margin + 5;
        }
        doc.rect(margin, yPos, 6, rectH);
        doc.text(String(i + 1), margin + 3, yPos + 4, { align: "center" });
        doc.rect(margin + 6, yPos, contentWidth - 6, rectH);
        doc.text(lines, margin + 8, yPos + 4);
        yPos += rectH;
      });

      yPos += 3;
      if (yPos + 55 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPos = margin + 5;
      }

      // ========== REMARKS ==========
      doc.rect(margin, yPos, contentWidth, 12);
      doc.setFontSize(9);
      doc.text("Remarks, if any (PDA A/C/Cheque No):", margin + 1, yPos + 5);
      yPos += 27;

      // ========== FOOTER ==========
      doc.setFontSize(8);
      doc.text("DATE ________________________", margin, yPos);
      doc.text("STAMP AND SIGNATURE OF SHIPPER OR AGENT (CHA)", pageWidth - margin, yPos, { align: "right" });

      yPos += 12;
      doc.rect(margin, yPos, contentWidth, 12);
      doc.setFontSize(9);
      doc.text("CES (NS) PVT. LTD.", margin + 1, yPos + 5);
      doc.text("DATE & TIME OF BOOKING OR (EA) :", margin + 1, yPos + 10);

      // Open PDF
      const filename = `Consignment_Note_${data.job_no?.replace(/\//g, "_") || "Draft"}.pdf`;
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
                .header { background-color: #f5f5f5; padding: 10px 20px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
                .filename { font-weight: bold; color: #333; }
                .download-btn { background-color: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; text-decoration: none; font-size: 14px; }
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
            </body>
          </html>`
        );
        setTimeout(() => { URL.revokeObjectURL(blobUrl); }, 300000);
      }
    } catch (err) {
      console.error("Error generating Consignment Note:", err);
      alert("Failed to generate Consignment Note");
    }
  };

  return children ? (
    React.cloneElement(children, { onClick: generatePDF })
  ) : (
    <MenuItem onClick={generatePDF}>Consignment Note</MenuItem>
  );
};

export default ConsignmentNoteGenerator;
