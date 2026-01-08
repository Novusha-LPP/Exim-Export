import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { MenuItem } from "@mui/material";
import thatLogo from "../../../../assets/images/that-logo.png";

const ForwardingNoteTharGenerator = ({ jobNo, children }) => {
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            if (typeof dateString === 'string' && /^\d{1,2}-\d{1,2}-\d{4}/.test(dateString)) {
                return dateString;
            }
            return dateString;
        }
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).replace(/\//g, '.');
    };

    const generatePDF = async (e) => {
        if (e) e.stopPropagation();
        const encodedJobNo = encodeURIComponent(jobNo);
        try {
            const response = await axios.get(
                `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
            );
            const data = response.data;
            const invoice = data.invoices?.[0] || {};
            const booking = data.operations?.[0]?.bookingDetails?.[0] || {};
            const containers = data.containers || [];
            const products = invoice.products || [];

            const doc = new jsPDF({ unit: "mm", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 10;
            const contentWidth = pageWidth - 2 * margin;

            // ========== HEADER RIGHT BOX (HPCSL USE) ==========
            const boxX = pageWidth - margin - 70;
            const boxY = 8;
            const boxW = 70;
            const boxH = 30;
            doc.setDrawColor(0);
            doc.setLineWidth(0.4);
            doc.rect(boxX, boxY, boxW, boxH);

            // Internal lines
            doc.line(boxX, boxY + 7, boxX + boxW, boxY + 7);
            doc.line(boxX, boxY + 12, boxX + boxW, boxY + 12);
            doc.line(boxX, boxY + 17, boxX + boxW, boxY + 17);
            doc.line(boxX, boxY + 22, boxX + boxW, boxY + 22);
            doc.line(boxX + 22, boxY + 22, boxX + 22, boxY + boxH);

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("HPCSL USE", boxX + boxW / 2, boxY + 5, { align: "center" });

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text("CCN No. & Date :", boxX + 1, boxY + 10.5);
            doc.text("To :", boxX + 1, boxY + 15.5);
            doc.text("Rail Operator (Please Specify)", boxX + boxW / 2, boxY + 20.5, { align: "center" });

            doc.setFont("helvetica", "bold");
            doc.text("HPCSL", boxX + 11, boxY + 27, { align: "center" });
            doc.text(".", boxX + 24, boxY + 27);

            // ========== LOGO ==========
            try {
                doc.addImage(thatLogo, "PNG", margin, 8, 55, 22);
            } catch (err) {
                console.warn("Logo add failed", err);
            }

            // ========== TITLE ==========
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            const title = "HPCSL CONSIGNMENT NOTE";
            doc.text(title, pageWidth / 2, 45, { align: "center" });
            const titleW = doc.getTextWidth(title);
            doc.line(pageWidth / 2 - titleW / 2, 46, pageWidth / 2 + titleW / 2, 46);

            doc.setFontSize(11);
            doc.text("Mode By : RAIL", pageWidth / 2, 51, { align: "center" });

            const invoiceNoText = `INVOICE NO:- ${data.invoices?.map(inv => inv.invoiceNumber).join(", ") || ""}`;
            doc.setFontSize(10);
            doc.text(invoiceNoText, pageWidth / 2, 56, { align: "center" });

            let yPos = 60;

            // ========== TO SECTION ==========
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("To,", margin, yPos);
            doc.text("The Terminal Manager,", margin, yPos + 5);
            doc.text("HPCSL, The Thar Dry Port, ICD-Sanand", margin, yPos + 10);

            doc.text("Cargo : Non Hazardous", pageWidth - margin, yPos + 10, { align: "right" });

            yPos += 16;

            // ========== DISCLAIMER ==========
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            const disclaimer = "Please receive the under mentioned container stuffes at ICD/Factory. We accept the all Transportation and/or provision of Containers of business incidental there to have been under taken by HPSCL-THE THAR DRY PORT on the basis of their standard terms and conditions which have been read by us and understood. No servant or agent of the company has any authority to vary or waive conditions or any part there of.";
            const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
            doc.text(splitDisclaimer, margin, yPos);
            yPos += splitDisclaimer.length * 3.5 + 4;

            // ================= FORM GRID (DYNAMIC HEIGHTS) =================
            const col1W = 80;
            const col2W = (contentWidth - col1W) * 0.6;
            const col3W = (contentWidth - col1W) * 0.4;

            const getRowH = (texts, widths, fontSize, minH = 10) => {
                doc.setFontSize(fontSize);
                let maxH = minH;
                texts.forEach((text, i) => {
                    const split = doc.splitTextToSize(String(text || ""), widths[i] - 4);
                    const h = (split.length * (fontSize * 0.45)) + 4;
                    if (h > maxH) maxH = h;
                });
                return maxH;
            };

            doc.setLineWidth(0.4);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");

            // Row 1: Consignor / Booking No / Vessel
            const r1H = getRowH(
                [
                    `Name of Consignor (S/Line):- ${booking.shippingLineName || ""}`,
                    `Booking No:- ${booking.bookingNo || ""}`,
                    `VESSEL NAME:- ${booking.vesselName || ""} VOY. NO: ${booking.voyageNo || ""}`
                ],
                [contentWidth * 0.3, contentWidth * 0.2, contentWidth * 0.5],
                9,
                11
            );
            doc.rect(margin, yPos, contentWidth * 0.3, r1H);
            doc.rect(margin + contentWidth * 0.3, yPos, contentWidth * 0.2, r1H);
            doc.rect(margin + contentWidth * 0.5, yPos, contentWidth * 0.5, r1H);

            doc.text(`Name of Consignor (S/Line):- ${booking.shippingLineName || ""}`, margin + 1, yPos + 5, { maxWidth: contentWidth * 0.3 - 2 });
            doc.text(`Booking No:- ${booking.bookingNo || ""}`, margin + contentWidth * 0.3 + 1, yPos + 5, { maxWidth: contentWidth * 0.2 - 2 });
            doc.text(`VESSEL NAME:- ${booking.vesselName || ""} VOY. NO: ${booking.voyageNo || ""}`, margin + contentWidth * 0.5 + 1, yPos + 5, { maxWidth: contentWidth * 0.5 - 2 });
            yPos += r1H;

            // Row 2: Agent/CHA / Cut Off / Country
            const agentText = `Agent/CHA : SURAJ FORWARDERS \& SHIPPING AGENCIES`;
            const r2H = getRowH(
                [agentText, `CUT OFF : ${formatDate(booking.validity) || ""}`, `Country ${data.destination_country || ""}`],
                [col1W, col2W, col3W],
                9,
                11
            );
            doc.rect(margin, yPos, col1W, r2H);
            doc.rect(margin + col1W, yPos, col2W, r2H);
            doc.rect(margin + col1W + col2W, yPos, col3W, r2H);

            doc.text(agentText, margin + 1, yPos + 5, { maxWidth: col1W - 2 });
            doc.text(`CUT OFF : ${formatDate(booking.validity) || ""}`, margin + col1W + 1, yPos + 5);
            doc.text("Country", margin + col1W + col2W + 1, yPos + 4);
            doc.text(data.destination_country || "", margin + col1W + col2W + 1, yPos + 8);
            yPos += r2H;

            // Row 3: Exporter / Gateway
            const exporterText = `Name and Address of Exporter : ${data.exporter || ""}`;
            const r3H = getRowH(
                [exporterText, `Gateway Port:- ${data.gateway_port || ""}`],
                [contentWidth * 0.6, contentWidth * 0.4],
                9,
                11
            );
            doc.rect(margin, yPos, contentWidth * 0.6, r3H);
            doc.rect(margin + contentWidth * 0.6, yPos, contentWidth * 0.4, r3H);
            doc.text(`Name and Address of Exporter :`, margin + 1, yPos + 4);
            doc.text(data.exporter || "", margin + 1, yPos + 8, { maxWidth: contentWidth * 0.6 - 2 });
            doc.text(`Gateway Port:- ${data.gateway_port || ""}`, margin + contentWidth * 0.6 + 1, yPos + 5);
            yPos += r3H;

            // Row 4: SB No / Port of Discharge
            const r4H = getRowH(
                [`Shipping Bill No \& Date: ${data.sb_no || ""} / ${formatDate(data.sb_date)}`, `Port of Discharge:- ${data.port_of_discharge || ""}`],
                [contentWidth * 0.4, contentWidth * 0.6],
                9,
                11
            );
            doc.rect(margin, yPos, contentWidth * 0.4, r4H);
            doc.rect(margin + contentWidth * 0.4, yPos, contentWidth * 0.6, r4H);
            doc.text(`Shipping Bill No \& Date: ${data.sb_no || ""} / ${formatDate(data.sb_date)}`, margin + 1, yPos + r4H / 2 + 1, { baseline: 'middle', maxWidth: contentWidth * 0.4 - 2 });
            doc.text(`Port of Discharge:- ${data.port_of_discharge || ""}`, margin + contentWidth * 0.4 + 1, yPos + r4H / 2 + 1, { baseline: 'middle', maxWidth: contentWidth * 0.6 - 2 });
            yPos += r4H;

            // Row 5: Stuffing / FOB
            const totalFobVal = (data.invoices || []).reduce((sum, inv) => {
                const val = inv.freightInsuranceCharges?.fobValue?.amount || inv.productValue || 0;
                return sum + (Number(val) || 0);
            }, 0);

            const r5H = getRowH(
                [
                    `Stuffing (Please Tick):- ${data.goods_stuffed_at === "Factory" ? "FACTORY STUFFING" : "ICD STUFFING"}`,
                    `F.O.B./C.I.F. Value (Rs.)`,
                    totalFobVal.toFixed(2)
                ],
                [contentWidth * 0.5, contentWidth * 0.22, contentWidth * 0.28],
                9,
                11
            );
            doc.rect(margin, yPos, contentWidth * 0.5, r5H);
            doc.rect(margin + contentWidth * 0.5, yPos, contentWidth * 0.22, r5H);
            doc.rect(margin + contentWidth * 0.72, yPos, contentWidth * 0.28, r5H);

            doc.text(`Stuffing (Please Tick):- ${data.goods_stuffed_at === "Factory" ? "FACTORY STUFFING" : "ICD STUFFING"}`, margin + 1, yPos + r5H / 2 + 1, { baseline: 'middle', maxWidth: contentWidth * 0.5 - 2 });
            doc.text(`F.O.B./C.I.F. Value (Rs.)`, margin + contentWidth * 0.5 + 1, yPos + r5H / 2 + 1, { baseline: 'middle', maxWidth: contentWidth * 0.22 - 2 });
            doc.text(totalFobVal.toFixed(2), margin + contentWidth * 0.72 + 1, yPos + r5H / 2 + 1, { baseline: 'middle', maxWidth: contentWidth * 0.28 - 2 });
            yPos += r5H;

            // Row 6: Factory Shifting
            const shiftVal = `Factory shifting arranged by: HPCSL / SHIPPER    Type: LCL/FCL/ODC: Yes/No.    Payment Type: PAID / TO PAY`;
            const r6H = getRowH([shiftVal], [contentWidth], 8, 8);
            doc.rect(margin, yPos, contentWidth, r6H);
            doc.setFontSize(8);
            doc.text(shiftVal, margin + 1, yPos + r6H / 2 + 1, { baseline: 'middle', maxWidth: contentWidth - 2 });
            yPos += r6H;

            // ========== CONTAINER TABLE ==========
            const tableHead = [
                ["Sr\nNo", "Container No", "Size", "No &\nType\nof\nPkgs.", "Description of Goods\n& H.S CODE", "Cargo\nWeight\n(kgs)", "Customs Seal\nNo.", "Shipping Line Seal\nNo.", "SB NO.:", "SB DATE"]
            ];

            let totalPkgs = 0;
            let totalWeight = 0;

            const tableBody = containers.map((c, idx) => {
                const pkgs = Number(c.pkgsStuffed) || 0;
                const weight = Number(c.grossWeight) || 0;
                totalPkgs += pkgs;
                totalWeight += weight;

                const desc = products[0]?.description || "";
                const ritc = products[0]?.ritc || "";

                return [
                    idx + 1,
                    c.containerNo || "",
                    c.type?.match(/\d+/)?.[0] || "20",
                    pkgs || "",
                    `${desc}\n${ritc}`,
                    weight || "",
                    c.sealNo || "",
                    booking.shippingLineSealNo || "",
                    data.sb_no || "",
                    formatDate(data.sb_date)
                ];
            });

            tableBody.push([
                "", "", "", totalPkgs || "", "", totalWeight || "", "", "", "", ""
            ]);

            doc.autoTable({
                startY: yPos,
                margin: { left: margin, right: margin },
                head: tableHead,
                body: tableBody,
                theme: "grid",
                styles: {
                    fontSize: 8.5,
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
                didParseCell: function (info) {
                    if (info.row.index === tableBody.length - 1) {
                        info.cell.styles.fillColor = [255, 255, 255];
                    }
                }
            });

            yPos = doc.lastAutoTable.finalY + 3;

            // ========== DECLARATIONS ==========
            const decals = [
                "1  I do hereby certify that I have satisfied by self description, marks, quantity, measurement and weight of goods consigned by me have been correctly entered in the note.",
                "2  I hereby certify that the goods described above are in goods order and condition at the time of dispatch.",
                "3  I hereby certify that goods are not classified as dangerous in Indian Railway. Road Tariff of my IMO regulations.",
                "4  It is certify that rated tonnage of the commitment (5) has been exceeded.",
                "5  IF THE CONTAINER WEIGHT, IS NOT SPECIFIED THEIR TARE WEIGHT, IT WILL BE TAKEN AS 2.3 TONS FOR 20' \& 4.6 TONS FOR 40'",
                "6  I understand that the principal terms and conditions applying to the carriage of above containers are subject to the conditions and liabilities as specified in the Indian Railway Act 1989, as amended from time to time."
            ];

            doc.setFontSize(8.5);
            doc.setFont("helvetica", "bold");
            doc.setLineWidth(0.4);

            decals.forEach((text, i) => {
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

            if (yPos + 45 > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                yPos = margin + 5;
            }

            // ========== REMARKS ==========
            const remarksY = yPos;
            const remarksBoxH = 12;
            doc.rect(margin, remarksY, contentWidth, remarksBoxH);
            doc.setFontSize(9);
            doc.text("Remarks, if any (PDA A/C/Cheque No):", margin + 1, remarksY + 5);
            doc.text(`PDA/PDC OF ${booking.shippingLineName || ""}`, pageWidth - margin - 1, remarksY + 5, { align: "right" });
            yPos += remarksBoxH + 10;

            // ========== FOOTER (Signatures) ==========
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(booking.shippingLineName || "", margin, yPos);

            doc.setFontSize(9);
            doc.text("STAMP AND SIGNATURE", pageWidth - margin, yPos, { align: "right" });
            doc.text("OF SHIPPER OR AGENT (CHA)", pageWidth - margin, yPos + 4, { align: "right" });

            yPos += 12;
            doc.text(`DATE : ${formatDate(new Date())}`, margin, yPos);

            yPos += 8;
            doc.setLineWidth(0.4);
            const bottomBoxH = 12;
            doc.rect(margin, yPos, contentWidth, bottomBoxH);
            doc.setFontSize(9);
            doc.text("(HPCSL USE ONLY)", margin + 1, yPos + 5);
            doc.text("DATE \& TIME OF BOOKING OR (EA) :", margin + 1, yPos + 10);

            // ========== OPEN PDF ==========
            const filename = `HPCSL_ConsignmentNote_${data.job_no?.replace(/\//g, "_") || "Draft"}.pdf`;
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
            </body>
          </html>`
                );
                setTimeout(() => { URL.revokeObjectURL(blobUrl); }, 300000);
            }
        } catch (err) {
            console.error("Error generating HPCSL Consignment Note:", err);
            alert("Failed to generate HPCSL Consignment Note");
        }
    };

    return children ? (
        React.cloneElement(children, { onClick: generatePDF })
    ) : (
        <MenuItem onClick={generatePDF}>Forwarding Note (THAR)</MenuItem>
    );
};

export default ForwardingNoteTharGenerator;