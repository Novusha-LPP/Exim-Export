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
            const boxX = pageWidth - margin - 60;
            const boxY = 5;
            doc.setDrawColor(0);
            doc.setLineWidth(0.3);
            doc.rect(boxX, boxY, 60, 28);
            // Internal lines
            doc.line(boxX, boxY + 7, boxX + 60, boxY + 7);
            doc.line(boxX, boxY + 14, boxX + 60, boxY + 14);
            doc.line(boxX, boxY + 21, boxX + 60, boxY + 21);

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("HPCSL USE", boxX + 2, boxY + 5);
            doc.setFont("helvetica", "normal");
            doc.text("CCN No. & Date :", boxX + 2, boxY + 12);
            doc.text("To :", boxX + 2, boxY + 19);
            doc.text("Rail Operator (Please Specify)", boxX + 2, boxY + 26);

            // ========== LOGO ==========
            try {
                doc.addImage(thatLogo, "PNG", margin, 5, 50, 20);
            } catch (err) {
                console.warn("Logo add failed", err);
            }

            // ========== TITLE ==========
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("HPCSL CONSIGNMENT NOTE", pageWidth / 2, 45, { align: "center" });

            doc.setFontSize(10);
            doc.text("Mode By : RAIL", pageWidth / 2, 50, { align: "center" });

            let yPos = 54;

            // ========== TO SECTION ==========
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text("To,", margin, yPos);
            doc.text("The Terminal Manager,", margin, yPos + 5);
            doc.text("HPCSL, The Thar Dry Port, ICD-Sanand", margin, yPos + 10);

            // Invoice on right side - aligned with To section
            const invoiceNos = data.invoices?.map(inv => inv.invoiceNumber).join(", ") || "";
            doc.setFont("helvetica", "bold");
            doc.text(`INVOICE NO:- ${invoiceNos}`, pageWidth - margin, yPos, { align: "right" });

            yPos += 18;

            // ========== DISCLAIMER ==========
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            const disclaimer = "Please receive the under mentioned container stuffed at ICD/Factory. We accept the all Transportation and/or provision of Containers of business incidental there to have been under taken by HPSCL-THE THAR DRY PORT on the basis of their standard terms and conditions which have been read by us and understood. No servant or agent of the company has any authority to vary or waive conditions or any part there of.";
            const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
            doc.text(splitDisclaimer, margin, yPos);
            yPos += splitDisclaimer.length * 2.5 + 3;

            // ========== FORM GRID ==========
            doc.setFontSize(9);
            doc.setLineWidth(0.3);
            const col1W = contentWidth * 0.5;
            const col2W = contentWidth * 0.5;

            // Row 1: Consignor / Vessel
            doc.rect(margin, yPos, col1W, 14);
            doc.rect(margin + col1W, yPos, col2W, 14);
            doc.setFont("helvetica", "bold");
            doc.text("Name of Consignor (S/Line):", margin + 2, yPos + 5);
            doc.text("VESSEL NAME / VOY. NO:", margin + col1W + 2, yPos + 5);
            doc.text(booking.shippingLineName || "", margin + 2, yPos + 10);
            doc.text(`${booking.vesselName || ""} / ${booking.voyageNo || ""}`, margin + col1W + 2, yPos + 10);
            yPos += 14;

            // Row 2: Agent/CHA / Cut Off & Country
            doc.rect(margin, yPos, col1W, 14);
            doc.rect(margin + col1W, yPos, col2W * 0.6, 14);
            doc.rect(margin + col1W + col2W * 0.6, yPos, col2W * 0.4, 14);
            doc.setFont("helvetica", "bold");
            doc.text("Agent/CHA:", margin + 2, yPos + 5);
            doc.text("CUT OFF:", margin + col1W + 2, yPos + 5);
            doc.text("Country:", margin + col1W + col2W * 0.6 + 2, yPos + 5);
            doc.text("SURAJ FORWARDERS & SHIPPING AGENCIES", margin + 2, yPos + 10);
            doc.text(booking.validity ? formatDate(booking.validity) : "", margin + col1W + 2, yPos + 10);
            doc.text(data.destination_country || data.discharge_country || "", margin + col1W + col2W * 0.6 + 2, yPos + 10);
            yPos += 14;

            // Row 3: Exporter / Gateway Port
            doc.rect(margin, yPos, col1W, 14);
            doc.rect(margin + col1W, yPos, col2W, 14);
            doc.setFont("helvetica", "bold");
            doc.text("Name and Address of Exporter:", margin + 2, yPos + 5);
            doc.text("Gateway Port:", margin + col1W + 2, yPos + 5);
            doc.text(data.exporter || "", margin + 2, yPos + 10);
            doc.text(data.gateway_port || booking.portOfLoading || "", margin + col1W + 2, yPos + 10);
            yPos += 14;

            // Row 4: SB No & Date / Port of Discharge
            doc.rect(margin, yPos, col1W, 10);
            doc.rect(margin + col1W, yPos, col2W, 10);
            doc.setFont("helvetica", "bold");
            doc.text("Shipping Bill No & Date:", margin + 2, yPos + 6);
            doc.text("Port of Discharge:", margin + col1W + 2, yPos + 6);
            doc.text(`${data.sb_no || ""} / ${formatDate(data.sb_date)}`, margin + 50, yPos + 6);
            doc.text(data.port_of_discharge || "", margin + col1W + 35, yPos + 6);
            yPos += 10;

            // Row 5: Stuffing / FOB Value
            doc.rect(margin, yPos, col1W, 10);
            doc.rect(margin + col1W, yPos, col2W, 10);
            doc.setFont("helvetica", "bold");
            doc.text("Stuffing (Please Tick):", margin + 2, yPos + 6);
            doc.text("F.O.B./C.I.F. Value (Rs.):", margin + col1W + 2, yPos + 6);
            doc.text(data.goods_stuffed_at === "Factory" ? "FACTORY STUFFING" : "ICD STUFFING", margin + 40, yPos + 6);
            const fobValue = invoice.freightInsuranceCharges?.fobValue?.amount || invoice.productValue || "";
            doc.text(String(fobValue), margin + col1W + 45, yPos + 6);
            yPos += 10;

            // Row 6: Factory shifting info
            doc.rect(margin, yPos, contentWidth, 8);
            doc.setFont("helvetica", "normal");
            doc.text("Factory shifting arranged by: HPCSL / SHIPPER    Type: LCL/FCL/ODC: Yes/No    Payment Type: PAID / TO PAY", margin + 2, yPos + 5);
            yPos += 12;

            // ========== CONTAINER TABLE ==========
            const containerHead = [
                ["Sr No", "Container No", "Size", "No & Type\nof Pkgs.", "Description of Goods\n& H.S CODE", "Cargo Weight\n(kgs)", "Customs\nSeal No.", "Shipping Line\nSeal No.", "SB NO.", "SB DATE"]
            ];

            const containerBody = containers.map((c, idx) => {
                const desc = products[0]?.description || "";
                const ritc = products[0]?.ritc || "";
                return [
                    idx + 1,
                    c.containerNo || "",
                    c.type?.match(/\d+/)?.[0] || "20",
                    `${c.pkgsStuffed || data.total_no_of_pkgs || ""}`,
                    `${desc.substring(0, 30)} ${ritc}`,
                    c.grossWeight || "",
                    c.sealNo || "",
                    booking.shippingLineSealNo || "",
                    data.sb_no || "",
                    formatDate(data.sb_date)
                ];
            });

            if (containerBody.length === 0) {
                containerBody.push([1, "", "20", "", "", "", "", "", "", ""]);
            }

            // Add totals row
            const totalPkgs = containers.reduce((sum, c) => sum + (Number(c.pkgsStuffed) || 0), 0) || data.total_no_of_pkgs || "";
            const totalWeight = containers.reduce((sum, c) => sum + (Number(c.grossWeight) || 0), 0) || data.gross_weight_kg || "";
            containerBody.push(["", "", "", totalPkgs, "", totalWeight, "", "", "", ""]);

            doc.autoTable({
                startY: yPos,
                margin: { left: margin, right: margin },
                head: containerHead,
                body: containerBody,
                theme: "grid",
                pageBreak: "auto",
                showHead: "everyPage",
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    fontStyle: "bold",
                    fontSize: 7,
                    halign: "center",
                    valign: "middle",
                    lineWidth: 0.3,
                },
                styles: {
                    fontSize: 7,
                    fontStyle: "bold",
                    halign: "center",
                    valign: "middle",
                    lineWidth: 0.3,
                    cellPadding: 1.5,
                    overflow: 'linebreak',
                },
                columnStyles: {
                    0: { cellWidth: 10 },  // Sr No
                    1: { cellWidth: 24 },  // Container No
                    2: { cellWidth: 12 },  // Size
                    3: { cellWidth: 16 },  // No & Type of Pkgs
                    4: { cellWidth: 34, halign: "left" },  // Description
                    5: { cellWidth: 18 },  // Cargo Weight
                    6: { cellWidth: 18 },  // Customs Seal No
                    7: { cellWidth: 20 },  // Shipping Line Seal No
                    8: { cellWidth: 18 },  // SB NO
                    9: { cellWidth: 20 },  // SB DATE
                },
            });

            yPos = doc.lastAutoTable.finalY + 5;

            // Check if we need a new page for footer content
            const pageHeight = doc.internal.pageSize.getHeight();
            const footerContentHeight = 70; // Approximate height needed for declarations + remarks + signatures
            if (yPos + footerContentHeight > pageHeight - margin) {
                doc.addPage();
                yPos = margin + 10;
            }

            // ========== DECLARATIONS ==========
            const declarations = [
                "1. I do hereby certify that I have satisfied by self description, marks, quantity, measurement and weight of goods consigned by me have been correctly entered in the note.",
                "2. I hereby certify that the goods described above are in goods order and condition at the time of dispatch.",
                "3. I hereby certify that goods are not classified as dangerous in Indian Railway. Road Tariff of my IMO regulations.",
                "4. It is certify that rated tonnage of the commitment (5) has been exceeded.",
                "5. IF THE CONTAINER WEIGHT, IS NOT SPECIFIED THEIR TARE WEIGHT, IT WILL BE TAKEN AS 2.3 TONS FOR 20' & 4.6 TONS FOR 40'",
                "6. I understand that the principal terms and conditions applying to the carriage of above containers are subject to the conditions and liabilities as specified in the Indian Railway Act 1989, as amended from time to time."
            ];

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            declarations.forEach((d) => {
                const lines = doc.splitTextToSize(d, contentWidth);
                doc.text(lines, margin, yPos);
                yPos += lines.length * 3;
            });


            yPos += 3;

            // ========== REMARKS ==========
            doc.setLineWidth(0.5);
            doc.rect(margin, yPos, contentWidth, 12);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("Remarks, if any (PDA A/C/Cheque No):", margin + 2, yPos + 5);
            doc.text(`PDA/PDC OF ${booking.shippingLineName || "SHIPPING LINE"}`, pageWidth - margin - 50, yPos + 8);
            yPos += 17;

            // ========== SIGNATURES ==========
            doc.setFont("helvetica", "bold");
            doc.text(booking.shippingLineName || "SHIPPING LINE", margin, yPos);
            doc.text("STAMP AND SIGNATURE", pageWidth - margin - 40, yPos);
            yPos += 6;
            doc.text(`DATE : ${formatDate(new Date())}`, margin, yPos);
            doc.text("OF SHIPPER OR AGENT (CHA)", pageWidth - margin - 45, yPos);

            yPos += 10;
            // HPCSL USE ONLY
            doc.rect(margin, yPos, contentWidth, 10);
            doc.text("(HPCSL USE ONLY)", margin + 2, yPos + 5);
            doc.text("DATE & TIME OF BOOKING OR (EA) :", margin + 2, yPos + 9);

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
