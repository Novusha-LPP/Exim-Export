import React, { useState } from "react";
import axios from "axios";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import DocumentEditorDialog from "./DocumentEditorDialog";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const CertificateOfOriginGenerator = ({ jobNo, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [jobData, setJobData] = useState(null);

  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-");
  };

  // Fetch job data
  const fetchJobData = async () => {
    const encodedJobNo = encodeURIComponent(jobNo);
    const response = await axios.get(
      `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}?excludeChildJobs=true`
    );
    return response.data;
  };

  // Extract all fields from job data
  const extractFields = (data) => {
    const exporterName = data.exporter || "";
    const exporterAddress = data.exporter_address || "";
    const consigneeName = data.consignees?.[0]?.consignee_name || data.consignee_name || "";
    const consigneeAddress = data.consignees?.[0]?.consignee_address || "";
    const consigneeCountry = data.consignees?.[0]?.consignee_country || data.dischargecountry || "";

    const cleanJobNo = String(jobNo).replace(/[^a-zA-Z0-9]/g, "");
    const referenceNo = `DRAFTCOOAPPLY${cleanJobNo}`;

    const transportMode = data.transportMode || "By Sea";
    const loadingPort = data.port_of_loading || "";
    const dischargePort = data.port_of_discharge || "";
    const destinationPort = data.final_place_of_delivery || data.final_destination || "";

    const totalPkgs = data.total_no_of_pkgs || "";
    const packageUnit = data.package_unit || "";
    const volumeCbm = data.volume_cbm || "";
    const marksNos = data.marks_nos || data.marks_and_numbers || "";
    const grossWeight = data.gross_weight_kg ? `${data.gross_weight_kg}` : "";
    const netWeight = data.net_weight_kg ? `${data.net_weight_kg}` : "";

    const invoices = data.invoices || [];
    const invoiceDetails = invoices.map((inv) => {
      const invNo = inv.invoiceNumber || "";
      const invDate = inv.invoiceDate ? formatDate(inv.invoiceDate) : "";
      return { invNo, invDate };
    });

    const allProducts = invoices.flatMap((inv) => {
      const products = inv.products || [];
      return products.map(p => ({
        ...p,
        invoiceNumber: inv.invoiceNumber || "",
        invoiceDate: inv.invoiceDate || ""
      }));
    });
    const descriptionOfGoods = allProducts.length > 0
      ? allProducts.map((p) => p.description).filter(Boolean).join("\n")
      : data.commodity || "";

    const hsCode = allProducts.length > 0
      ? allProducts.map((p) => p.hscode || p.hs_code || p.hscode_dec).filter(Boolean).join(", ")
      : "";

    const declarationPlace = data.state_of_origin || data.exporter_state || "AHMEDABAD";
    const currentDate = formatDate(new Date());

    return {
      exporterName, exporterAddress, consigneeName, consigneeAddress, consigneeCountry,
      referenceNo, transportMode, loadingPort, dischargePort, destinationPort,
      totalPkgs, packageUnit, volumeCbm, marksNos, grossWeight, netWeight,
      invoiceDetails, descriptionOfGoods, hsCode, declarationPlace, currentDate, allProducts
    };
  };

  // Generate HTML for editor
  const generateHTMLTemplate = (fields) => {
    const {
      exporterName, exporterAddress, consigneeName, consigneeAddress, consigneeCountry,
      referenceNo, transportMode, loadingPort, dischargePort, destinationPort,
      totalPkgs, packageUnit, volumeCbm, marksNos, grossWeight, netWeight,
      invoiceDetails, descriptionOfGoods, hsCode, declarationPlace, currentDate, allProducts
    } = fields;

    const invoiceStr = invoiceDetails.map((inv) => `${inv.invNo}\nDT: ${inv.invDate}`).join("\n\n");
    const fallbackProducts = allProducts && allProducts.length > 0
      ? allProducts
      : [{ description: descriptionOfGoods || "" }];

    return `
      <div style="font-family: 'Times New Roman', Times, serif; padding: 6px; width: 780px; min-width: 780px; max-width: 780px; margin: 0 auto; color: #000; font-size: 11.5px; line-height: 1.25; box-sizing: border-box;">
        <div style="text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">ELECTRONIC</div>
        <table style="width: 768px; border-collapse: collapse; border: 1px solid #000; border-bottom: none; table-layout: fixed;">
          <colgroup>
            <col style="width: 384px;" />
            <col style="width: 384px;" />
          </colgroup>
          <tbody>
            <tr>
              <td style="width: 384px; border: 1px solid #000; padding: 3px 5px; vertical-align: top; height: 95px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">1. Goods consigned from (Exporter's business name, address, country):</div>
                <div style="font-size: 11.5px; line-height: 1.25; font-weight: bold;">${exporterName}<br/><span style="font-weight: normal; white-space: pre-wrap;">${exporterAddress}</span></div>
              </td>
              <td style="width: 384px; border: 1px solid #000; padding: 3px 5px; vertical-align: top; height: 95px; box-sizing: border-box;">
                <div style="font-size: 11.5px; font-weight: bold;">Reference No: <span style="font-weight: normal;">${referenceNo}</span></div>
                <div style="text-align: center; margin-top: 5px;">
                  <strong style="font-size: 14px; display: block; margin-bottom: 2px;">CERTIFICATE OF ORIGIN</strong>
                  <strong style="font-size: 11.5px; display: block; margin-bottom: 2px;">(NON PREFERENTIAL)</strong>
                  <span style="font-size: 10px; display: block; font-style: italic; margin-bottom: 3px;">(Combined declaration and certificate)</span>
                  <div style="font-size: 11.5px; display: inline-block; border-bottom: 1px dotted #000; padding-bottom: 1px; margin-top: 2px;">Issued in <strong>INDIA</strong></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width: 384px; border: 1px solid #000; padding: 3px 5px; vertical-align: top; height: 95px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">2. Goods consigned to (Consignee's name, address, country):</div>
                <div style="font-size: 11.5px; line-height: 1.25; font-weight: bold;">${consigneeName}<br/><span style="font-weight: normal; white-space: pre-wrap;">${consigneeAddress}</span><br/><strong>${consigneeCountry}</strong></div>
              </td>
              <td style="width: 384px; border: 1px solid #000; padding: 3px 5px; vertical-align: top; height: 95px; font-size: 11px; line-height: 1.25; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 11.5px; margin-bottom: 3px; text-transform: uppercase;">AHMEDABAD EXPORT IMPORT DEVELOPMENT ASSOCIATION</div>
                <div style="font-size: 11px; line-height: 1.25;">701 Sirmount Complex, Near Vastrapur Tower/h Iscon Mandir<br/>S.G.Highway, Ahmedabad,, AHMEDABAD<br/>E-mail: CONTACT@AEIDA.ORG<br/>Office Phone: 079-48911993</div>
              </td>
            </tr>
            <tr>
              <td style="width: 384px; border: 1px solid #000; padding: 3px 5px; vertical-align: top; height: 50px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">3. Means of transport and route (as far as known):</div>
                <div style="font-size: 11px;">${transportMode} From ${loadingPort} To ${destinationPort || dischargePort}</div>
              </td>
              <td style="width: 384px; border: 1px solid #000; padding: 3px 5px; vertical-align: top; height: 50px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 11px;">4. For Official Use</div>
              </td>
            </tr>
          </tbody>
        </table>
        <table style="width: 768px; border-collapse: collapse; border: 1px solid #000; border-bottom: none; table-layout: fixed;">
          <colgroup>
            <col style="width: 60px;" />
            <col style="width: 130px;" />
            <col style="width: 308px;" />
            <col style="width: 77px;" />
            <col style="width: 115px;" />
            <col style="width: 78px;" />
          </colgroup>
          <thead>
            <tr style="font-size: 10px; text-align: center; font-weight: bold;">
              <th style="border: 1px solid #000; padding: 3px; height: 30px; vertical-align: top; box-sizing: border-box;">5. Item number</th>
              <th style="border: 1px solid #000; padding: 3px; height: 30px; vertical-align: top; box-sizing: border-box;">6. Marks and numbers of packages</th>
              <th style="border: 1px solid #000; padding: 3px; height: 30px; vertical-align: top; box-sizing: border-box;">7. Number and kind of packages, description of goods</th>
              <th style="border: 1px solid #000; padding: 3px; height: 30px; vertical-align: top; box-sizing: border-box;">8. Origin criterion</th>
              <th style="border: 1px solid #000; padding: 3px; height: 30px; vertical-align: top; box-sizing: border-box;">9. Gross weight or other quantity</th>
              <th style="border: 1px solid #000; padding: 3px; height: 30px; vertical-align: top; box-sizing: border-box;">10. Number and date of invoices</th>
            </tr>
          </thead>
          <tbody>
            ${fallbackProducts.map((product, index) => {
      const hs = product.hscode || product.hs_code || product.hscode_dec || (index === 0 ? hsCode : "");
      const invNo = product.invoiceNumber;
      const invDate = product.invoiceDate ? formatDate(product.invoiceDate) : "";

      return `
                <tr style="font-size: 10.5px; line-height: 1.25; vertical-align: top;">
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; box-sizing: border-box;">${index + 1}</td>
                  <td style="border: 1px solid #000; padding: 6px; white-space: pre-wrap; word-break: break-all; box-sizing: border-box;">${index === 0 ? marksNos : ""}</td>
                  <td style="border: 1px solid #000; padding: 6px; word-break: break-word; box-sizing: border-box;">
                    ${index === 0 ? `<div style="font-weight: bold; margin-bottom: 4px; font-size: 11px;">TOTAL ${totalPkgs} ${packageUnit} ONLY${volumeCbm ? `, CBM ${volumeCbm}` : ''}</div>` : ''}
                    <div style="white-space: pre-wrap; margin-bottom: 4px; font-size: 11px;">${product.description || ""}</div>
                    ${hs ? `<div style="margin-top: 3px;"><strong>HS Code:</strong> ${hs}</div>` : ''}
                  </td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold; box-sizing: border-box;">"INDIAN ORIGIN"</td>
                  <td style="border: 1px solid #000; padding: 6px; white-space: pre-line; box-sizing: border-box;">
                    ${product.quantity ? `<strong>QTY:</strong> ${product.quantity} ${product.uom || ''}<br/>` : ''}
                    ${index === 0 ? `<strong>GR. QTY:</strong> ${grossWeight}${netWeight ? `<br/><strong>NT. QTY:</strong> ${netWeight}` : ''}` : ''}
                  </td>
                  <td style="border: 1px solid #000; padding: 6px; white-space: pre-line; text-align: center; box-sizing: border-box;">
                    ${invNo ? `${invNo}<br/>DT: ${invDate}` : (index === 0 ? invoiceStr : "")}
                  </td>
                </tr>
              `;
    }).join("")}
          </tbody>
        </table>
        <table style="width: 768px; border-collapse: collapse; border: 1px solid #000; border-bottom: none; table-layout: fixed;">
          <colgroup>
            <col style="width: 384px;" />
            <col style="width: 384px;" />
          </colgroup>
          <tbody>
            <tr>
              <td style="width: 384px; border: 1px solid #000; padding: 4px 6px; vertical-align: top; height: 140px; box-sizing: border-box;">
                <strong style="font-size: 10.5px;">11. Certification</strong><br/>
                <div style="margin-top: 3px;">It is hereby certified, on the basis of control carried out that the declaration by the exporter is correct.<br/>To verify this certificate, you may scan the QR code here</div>
                <div style="margin-top: 45px; border-bottom: 1px dotted #000; width: 85%; margin-left: auto; margin-right: auto;"></div>
                <div style="font-size: 9px; margin-top: 2px; text-align: center;">Place and date, signature and Stamp of Certifying authority</div>
              </td>
              <td style="width: 384px; border: 1px solid #000; padding: 4px 6px; vertical-align: top; height: 140px; box-sizing: border-box;">
                <div><strong style="font-size: 10.5px;">12. Declaration by the exporter:</strong><br/>
                  <div style="margin-top: 3px;">The undersigned hereby declare that the above details and statements are correct that all the good(s) were produced in India and that they comply with the origin requirements for export to <strong>${consigneeCountry || "Brazil"}</strong> (Importing Country)</div>
                </div>
                <div style="text-align: center; font-weight: bold; font-size: 11px; margin-top: 20px;">${declarationPlace.toUpperCase()}, ${currentDate}</div>
                <div style="margin-top: 15px;">
                  <div style="border-bottom: 1px solid #000; width: 95%; margin-left: auto; margin-right: auto;"></div>
                  <div style="font-size: 9px; margin-top: 2px; text-align: center;">Place and date, signature & Stamp of the authorized Signatory</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <table style="width: 768px; border-collapse: collapse; border: 1px solid #000; table-layout: fixed;">
          <colgroup>
            <col style="width: 768px;" />
          </colgroup>
          <tbody>
            <tr>
              <td style="width: 768px; padding: 4px 6px; font-size: 10.5px; box-sizing: border-box;">
                <strong>13. Where appropriate please tick:</strong>
                <div style="text-align: center; margin-top: 5px; font-size: 10.5px;">
                  <div style="display: inline-block; margin: 0 10px;"><span style="border: 1px solid #000; width: 9px; height: 9px; display: inline-block; margin-right: 3px; vertical-align: middle;"></span> Third Country Invoicing</div>
                  <div style="display: inline-block; margin: 0 10px;"><span style="border: 1px solid #000; width: 9px; height: 9px; display: inline-block; margin-right: 3px; vertical-align: middle;"></span> Exhibition</div>
                  <div style="display: inline-block; margin: 0 10px;"><span style="border: 1px solid #000; width: 9px; height: 9px; display: inline-block; margin-right: 3px; vertical-align: middle;"></span> ISSUED RETROSPECTIVELY</div>
                  <div style="display: inline-block; margin: 0 10px;"><span style="border: 1px solid #000; width: 9px; height: 9px; display: inline-block; margin-right: 3px; vertical-align: middle;"></span> Cumulation</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style="text-align: right; font-size: 10px; margin-top: 4px; font-weight: bold;">Page: 1/1</div>
      </div>
    `;
  };

  // ─── PDF-LIB COORDINATE-BASED RENDERING ───────────────────────────────────

  const drawPdfWithPdfLib = async (fields) => {
    const {
      exporterName, exporterAddress, consigneeName, consigneeAddress, consigneeCountry,
      referenceNo, transportMode, loadingPort, dischargePort, destinationPort,
      totalPkgs, packageUnit, volumeCbm, marksNos, grossWeight, netWeight,
      invoiceDetails, descriptionOfGoods, hsCode, declarationPlace, currentDate, allProducts
    } = fields;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { height } = page.getSize();
    let currentPage = page;

    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    const black = rgb(0, 0, 0);
    const lineWidth = 0.5;

    // ── LAYOUT CONSTANTS (all in points from top-left) ──
    const LM = 18;  // left margin
    const RM = 18;  // right margin
    const TM = 18;  // top margin
    const pageW = 595.28;
    const contentW = pageW - LM - RM; // ~559.28
    const midX = LM + contentW / 2;   // center divider for 2-col rows

    // Helper: draw text (pdf-lib Y is from bottom)
    const drawText = (text, x, y, options = {}) => {
      const { font = timesRoman, size = 9, color = black, maxWidth } = options;
      if (maxWidth) {
        // Word-wrap
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        const lineHeight = size * 1.2;
        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(testLine, size);
          if (testWidth > maxWidth && line) {
            currentPage.drawText(line, { x, y: currentY, size, font, color });
            line = word;
            currentY -= lineHeight;
          } else {
            line = testLine;
          }
        }
        if (line) {
          currentPage.drawText(line, { x, y: currentY, size, font, color });
          currentY -= lineHeight;
        }
        return currentY;
      } else {
        currentPage.drawText(text, { x, y, size, font, color });
        return y - size * 1.2;
      }
    };

    // Helper: draw multiline text with line breaks
    const drawMultiline = (text, x, y, options = {}) => {
      const { font = timesRoman, size = 9, color = black, maxWidth = 250, lineHeight: lh } = options;
      const lineHeight = lh || size * 1.25;
      const lines = text.split('\n');
      let currentY = y;
      for (const rawLine of lines) {
        if (!rawLine.trim()) {
          currentY -= lineHeight;
          continue;
        }
        // Word-wrap each line
        const words = rawLine.split(' ');
        let line = '';
        for (const word of words) {
          const wordWidth = font.widthOfTextAtSize(word, size);
          if (wordWidth > maxWidth) {
            for (let i = 0; i < word.length; i++) {
              const char = word[i];
              const testLine = line ? `${line}${char}` : char;
              const testWidth = font.widthOfTextAtSize(testLine, size);
              if (testWidth > maxWidth && line) {
                currentPage.drawText(line, { x, y: currentY, size, font, color });
                line = char;
                currentY -= lineHeight;
              } else {
                line = testLine;
              }
            }
          } else {
            const testLine = line ? `${line} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, size);
            if (testWidth > maxWidth && line) {
              currentPage.drawText(line, { x, y: currentY, size, font, color });
              line = word;
              currentY -= lineHeight;
            } else {
              line = testLine;
            }
          }
        }
        if (line) {
          currentPage.drawText(line, { x, y: currentY, size, font, color });
          currentY -= lineHeight;
        }
      }
      return currentY;
    };

    // Helper: count lines for dynamic height calculation
    const getMultilineLinesCount = (text, maxWidth, font, size) => {
      if (!text) return 0;
      const paragraphs = String(text).split('\n');
      let totalLines = 0;
      for (const p of paragraphs) {
        if (!p.trim()) {
          totalLines += 1;
          continue;
        }
        const words = p.split(' ');
        let line = '';
        let pLines = 0;
        for (const word of words) {
          const wordWidth = font.widthOfTextAtSize(word, size);
          if (wordWidth > maxWidth) {
            for (let i = 0; i < word.length; i++) {
              const char = word[i];
              const testLine = line ? `${line}${char}` : char;
              const testWidth = font.widthOfTextAtSize(testLine, size);
              if (testWidth > maxWidth && line) {
                pLines += 1;
                line = char;
              } else {
                line = testLine;
              }
            }
          } else {
            const testLine = line ? `${line} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, size);
            if (testWidth > maxWidth && line) {
              pLines += 1;
              line = word;
            } else {
              line = testLine;
            }
          }
        }
        if (line) pLines += 1;
        totalLines += pLines;
      }
      return totalLines;
    };

    // Helper: draw rectangle border
    const drawRect = (x, y, w, h) => {
      currentPage.drawRectangle({
        x, y: height - y - h, width: w, height: h,
        borderColor: black, borderWidth: lineWidth, color: undefined,
        opacity: 0,
      });
    };

    // Helper: draw horizontal line
    const drawLine = (x1, y1, x2, y2, opts = {}) => {
      currentPage.drawLine({
        start: { x: x1, y: height - y1 },
        end: { x: x2, y: height - y2 },
        thickness: opts.thickness || lineWidth,
        color: opts.color || black,
        dashArray: opts.dashArray,
      });
    };

    // ── TITLE ──
    let curY = TM;
    const electronicW = timesBold.widthOfTextAtSize("ELECTRONIC", 13);
    currentPage.drawText("ELECTRONIC", {
      x: (pageW - electronicW) / 2,
      y: height - curY - 13,
      size: 13, font: timesBold, color: black,
    });
    curY += 20;

    // ── ROWS 1+2: Exporter/Consignee (left) | Reference+Title+AEIDA (right, merged) ──
    const row1H = 90;
    const row2H = 90;
    const mergedH = row1H + row2H; // right column spans both rows

    // Outer border for entire rows 1+2 area
    drawRect(LM, curY, contentW, mergedH);
    // Vertical divider full height
    drawLine(midX, curY, midX, curY + mergedH);
    // Horizontal divider LEFT SIDE ONLY (between box 1 and box 2)
    drawLine(LM, curY + row1H, midX, curY + row1H);

    // Left cell - Box 1 (Exporter)
    let ty = height - curY - 12;
    drawText("1. Goods consigned from (Exporter's business name, address, country):", LM + 4, ty, { font: timesBold, size: 8 });
    ty -= 12;
    drawText(exporterName, LM + 4, ty, { font: timesBold, size: 9 });
    ty -= 11;
    drawMultiline(exporterAddress, LM + 4, ty, { font: timesRoman, size: 9, maxWidth: midX - LM - 10 });

    // Left cell - Box 2 (Consignee)
    ty = height - (curY + row1H) - 12;
    drawText("2. Goods consigned to (Consignee's name, address, country):", LM + 4, ty, { font: timesBold, size: 8 });
    ty -= 12;
    drawText(consigneeName, LM + 4, ty, { font: timesBold, size: 9 });
    ty -= 11;
    ty = drawMultiline(consigneeAddress, LM + 4, ty, { font: timesRoman, size: 9, maxWidth: midX - LM - 10 });
    if (consigneeCountry) {
      drawText(consigneeCountry, LM + 4, ty, { font: timesBold, size: 9 });
    }

    // Right cell (merged) - Reference + Title + AEIDA
    ty = height - curY - 12;
    drawText("Reference No: " + referenceNo, midX + 4, ty, { font: timesBold, size: 9 });
    ty -= 18;
    const cooW = timesBold.widthOfTextAtSize("CERTIFICATE OF ORIGIN", 12);
    currentPage.drawText("CERTIFICATE OF ORIGIN", {
      x: midX + (contentW / 2 - cooW) / 2,
      y: ty, size: 12, font: timesBold, color: black,
    });
    ty -= 14;
    const npW = timesBold.widthOfTextAtSize("(NON PREFERENTIAL)", 9);
    currentPage.drawText("(NON PREFERENTIAL)", {
      x: midX + (contentW / 2 - npW) / 2,
      y: ty, size: 9, font: timesBold, color: black,
    });
    ty -= 11;
    const cdcW = timesItalic.widthOfTextAtSize("(Combined declaration and certificate)", 8);
    currentPage.drawText("(Combined declaration and certificate)", {
      x: midX + (contentW / 2 - cdcW) / 2,
      y: ty, size: 8, font: timesItalic, color: black,
    });
    ty -= 13;
    const issuedText = "Issued in ";
    const issuedW = timesRoman.widthOfTextAtSize(issuedText, 9);
    const indiaW = timesBold.widthOfTextAtSize("INDIA", 9);
    const totalIssuedW = issuedW + indiaW;
    const issuedX = midX + (contentW / 2 - totalIssuedW) / 2;
    currentPage.drawText(issuedText, { x: issuedX, y: ty, size: 9, font: timesRoman, color: black });
    currentPage.drawText("INDIA", { x: issuedX + issuedW, y: ty, size: 9, font: timesBold, color: black });
    // dotted underline
    ty -= 10;
    drawLine(issuedX - 30, curY + row1H - 2, issuedX + totalIssuedW + 30, curY + row1H - 2, { dashArray: [2, 2] });

    // AEIDA info (continues in merged right cell, below dotted line)
    ty -= 6;
    ty = drawMultiline("AHMEDABAD EXPORT IMPORT DEVELOPMENT\nASSOCIATION", midX + 4, ty, { font: timesBold, size: 9, maxWidth: contentW / 2 - 10 });
    ty -= 2;
    ty = drawMultiline(
      "701 Sirmount Complex, Near Vastrapur Tower/h Iscon Mandir\nS.G.Highway, Ahmedabad,, AHMEDABAD\nE-mail:  CONTACT@AEIDA.ORG\nOffice Phone:  079-48911993",
      midX + 4, ty, { font: timesRoman, size: 8.5, maxWidth: contentW / 2 - 10 }
    );

    curY += mergedH;

    // ── ROW 3: Transport (left) | Official Use (right) ──
    const row3H = 48;
    drawRect(LM, curY, contentW, row3H);
    drawLine(midX, curY, midX, curY + row3H);

    ty = height - curY - 12;
    drawText("3. Means of transport and route (as far as known):", LM + 4, ty, { font: timesBold, size: 8 });
    ty -= 12;
    drawMultiline(`${transportMode} From ${loadingPort} To ${destinationPort || dischargePort}`, LM + 4, ty, { font: timesRoman, size: 9, maxWidth: midX - LM - 10 });

    ty = height - curY - 12;
    drawText("4. For Official Use", midX + 4, ty, { font: timesBold, size: 9 });

    curY += row3H;

    // ── ITEMS TABLE HEADER ──
    const colWidths = [45, 95, 188, 75, 80, 66]; // total = 549
    const tableIndent = 5;
    const tableStartColX = LM + tableIndent;
    let startTableY = curY;
    curY += 5; // add 10pt top gap inside page border

    const itemHeaderH = 30;
    const headerLabels = [
      "5. Item\nnumber",
      "6. Marks and\nnumbers of\npackages",
      "7. Number and kind of packages, description of goods",
      "8. Origin\ncriterion",
      "9. Gross weight or\nother quantity",
      "10. Number and\ndate of invoices",
    ];

    let colX = tableStartColX;
    for (let i = 0; i < colWidths.length; i++) {
      drawRect(colX, curY, colWidths[i], itemHeaderH);
      const lines = headerLabels[i].split('\n');
      let textY = height - curY - 10;
      for (const line of lines) {
        const w = timesBold.widthOfTextAtSize(line, 7.5);
        currentPage.drawText(line, {
          x: colX + (colWidths[i] - w) / 2,
          y: textY, size: 7.5, font: timesBold, color: black,
        });
        textY -= 9;
      }
      colX += colWidths[i];
    }
    curY += itemHeaderH;

    // ── ITEMS TABLE DATA ROWS ──
    const fallbackProducts = allProducts && allProducts.length > 0
      ? allProducts
      : [{ description: descriptionOfGoods || "" }];

    for (let idx = 0; idx < fallbackProducts.length; idx++) {
      const product = fallbackProducts[idx];

      // Calculate dynamic heights for each column to prevent overflow
      const marksLines = idx === 0 && marksNos ? getMultilineLinesCount(marksNos, colWidths[1] - 8, timesRoman, 7.5) : 0;
      const marksHeight = marksLines * 9 + 32;

      let descLinesCount = 0;
      if (idx === 0) {
        const totalLine = `TOTAL ${totalPkgs} ${packageUnit} ONLY${volumeCbm ? `, CBM ${volumeCbm}` : ''}`;
        descLinesCount += getMultilineLinesCount(totalLine, colWidths[2] - 8, timesBold, 8);
      }
      descLinesCount += getMultilineLinesCount(product.description || "", colWidths[2] - 8, timesRoman, 8);
      const hsVal = product.hscode || product.hs_code || product.hscode_dec || (idx === 0 ? hsCode : "");
      if (hsVal) {
        descLinesCount += 1;
      }
      const descHeight = descLinesCount * 9.5 + 32;

      let qtyLinesCount = 0;
      if (product.quantity) {
        qtyLinesCount += getMultilineLinesCount(`QTY: ${product.quantity} ${product.uom || ''}`, colWidths[4] - 6, timesRoman, 7);
      }
      if (idx === 0) {
        if (grossWeight) qtyLinesCount += 1;
        if (netWeight) qtyLinesCount += 1;
      }
      const qtyHeight = qtyLinesCount * 8.5 + 32;

      let invHeight = 0;
      if (idx === 0) {
        let invLinesCount = 0;
        const invNoVal = product.invoiceNumber || (invoiceDetails && invoiceDetails[0] && invoiceDetails[0].invNo);
        if (invNoVal) {
          invLinesCount += getMultilineLinesCount(invNoVal, colWidths[5] - 6, timesRoman, 7);
          const invDateVal = product.invoiceDate ? formatDate(product.invoiceDate) : (invoiceDetails && invoiceDetails[0] && invoiceDetails[0].invDate ? invoiceDetails[0].invDate : "");
          if (invDateVal) invLinesCount += 1;
        } else {
          for (const inv of invoiceDetails) {
            if (inv.invNo) invLinesCount += getMultilineLinesCount(inv.invNo, colWidths[5] - 6, timesRoman, 7);
            if (inv.invDate) invLinesCount += 1;
          }
        }
        invHeight = invLinesCount * 8 + 32;
      }

      const rowH = Math.max(48, descHeight, marksHeight, qtyHeight, invHeight);

      // Page break check: if remaining height is not enough for the current row, start a new page!
      if (curY + rowH > 780) {
        // Draw outer borders for the page we are leaving
        drawLine(LM, startTableY, LM, curY);
        drawLine(LM + contentW, startTableY, LM + contentW, curY);

        currentPage = pdfDoc.addPage([595.28, 841.89]);
        curY = TM; // reset to top margin
        startTableY = curY;
        curY += 5; // add 5pt top gap inside page border

        // Draw the items table header again on the new page
        colX = tableStartColX;
        for (let i = 0; i < colWidths.length; i++) {
          drawRect(colX, curY, colWidths[i], itemHeaderH);
          const lines = headerLabels[i].split('\n');
          let textY = height - curY - 10;
          for (const line of lines) {
            const w = timesBold.widthOfTextAtSize(line, 7.5);
            currentPage.drawText(line, {
              x: colX + (colWidths[i] - w) / 2,
              y: textY, size: 7.5, font: timesBold, color: black,
            });
            textY -= 9;
          }
          colX += colWidths[i];
        }
        curY += itemHeaderH;
      }

      // Draw cell borders
      colX = tableStartColX;
      for (let i = 0; i < colWidths.length; i++) {
        drawRect(colX, curY, colWidths[i], rowH);
        colX += colWidths[i];
      }

      // Col 0: Item number
      colX = tableStartColX;
      currentPage.drawText(String(idx + 1), { x: colX + (colWidths[0] / 2) - 3, y: height - curY - (rowH / 2) + 3, size: 8.5, font: timesRoman, color: black });

      // Col 1: Marks
      colX = tableStartColX + colWidths[0];
      if (idx === 0 && marksNos) {
        drawMultiline(marksNos, colX + 4, height - curY - 16, { font: timesRoman, size: 7.5, maxWidth: colWidths[1] - 8, lineHeight: 9 });
      }

      // Col 2: Description
      colX = tableStartColX + colWidths[0] + colWidths[1];
      let descY = height - curY - 16;
      if (idx === 0) {
        const totalLine = `TOTAL ${totalPkgs} ${packageUnit} ONLY${volumeCbm ? `, CBM ${volumeCbm}` : ''}`;
        descY = drawMultiline(totalLine, colX + 4, descY, { font: timesBold, size: 8, maxWidth: colWidths[2] - 8, lineHeight: 9.5 });
      }
      descY = drawMultiline(product.description || "", colX + 4, descY, { font: timesRoman, size: 8, maxWidth: colWidths[2] - 8, lineHeight: 9.5 });
      const hs = product.hscode || product.hs_code || product.hscode_dec || (idx === 0 ? hsCode : "");
      if (hs) {
        drawText(`HS Code: ${hs}`, colX + 4, descY, { font: timesBold, size: 7.5 });
      }

      // Col 3: Origin
      colX = tableStartColX + colWidths[0] + colWidths[1] + colWidths[2];
      const originText = '"INDIAN ORIGIN"';
      const originW = timesBold.widthOfTextAtSize(originText, 7.5);
      currentPage.drawText(originText, {
        x: colX + (colWidths[3] - originW) / 2,
        y: height - curY - (rowH / 2) + 3, size: 7.5, font: timesBold, color: black,
      });

      // Col 4: Qty / Weights
      colX = tableStartColX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
      let gwY = height - curY - 16;
      if (product.quantity) {
        gwY = drawMultiline(`QTY: ${product.quantity} ${product.uom || ''}`, colX + 3, gwY, { font: timesRoman, size: 7, maxWidth: colWidths[4] - 6, lineHeight: 8.5 });
      }
      if (idx === 0) {
        if (grossWeight) {
          gwY = drawMultiline("GR. QTY: " + grossWeight + " KGS,", colX + 3, gwY, { font: timesRoman, size: 7, maxWidth: colWidths[4] - 6, lineHeight: 8.5 });
        }
        if (netWeight) {
          gwY = drawMultiline("NT. QTY: " + netWeight + " KGS", colX + 3, gwY, { font: timesRoman, size: 7, maxWidth: colWidths[4] - 6, lineHeight: 8.5 });
        }
      }

      // Col 5: Invoice details (only print for the first row to avoid duplication)
      if (idx === 0) {
        colX = tableStartColX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4];
        let invY = height - curY - 16;
        const invNo = product.invoiceNumber || (invoiceDetails && invoiceDetails[0] && invoiceDetails[0].invNo);
        const invDate = product.invoiceDate ? formatDate(product.invoiceDate) : (invoiceDetails && invoiceDetails[0] && invoiceDetails[0].invDate ? invoiceDetails[0].invDate : "");
        
        if (invNo) {
          invY = drawMultiline(invNo, colX + 3, invY, { font: timesRoman, size: 7, maxWidth: colWidths[5] - 6, lineHeight: 8 });
          if (invDate) {
            drawMultiline("DT: " + invDate, colX + 3, invY, { font: timesRoman, size: 7, maxWidth: colWidths[5] - 6, lineHeight: 8 });
          }
        } else {
          for (const inv of invoiceDetails) {
            if (inv.invNo) {
              invY = drawMultiline(inv.invNo, colX + 3, invY, { font: timesRoman, size: 7, maxWidth: colWidths[5] - 6, lineHeight: 8 });
            }
            if (inv.invDate) {
              invY = drawMultiline("DT: " + inv.invDate, colX + 3, invY, { font: timesRoman, size: 7, maxWidth: colWidths[5] - 6, lineHeight: 8 });
              invY -= 2;
            }
          }
        }
      }

      curY += rowH;
    }

    // Draw outer page borders (left and right) for the final items table section
    const bottomGap = 5;
    drawLine(LM, startTableY, LM, curY + bottomGap);
    drawLine(LM + contentW, startTableY, LM + contentW, curY + bottomGap);
    curY += bottomGap;

    // ── ROW 4: Certification (left) | Declaration (right) ──
    const row4H = 140;
    const row5H = 32;
    const bottomBoxesH = row4H + row5H + 10;

    // Page break check for bottom boxes
    if (curY + bottomBoxesH > 800) {
      currentPage = pdfDoc.addPage([595.28, 841.89]);
      curY = TM;
    }

    drawRect(LM, curY, contentW, row4H);
    drawLine(midX, curY, midX, curY + row4H);

    // Left - Box 11
    ty = height - curY - 12;
    drawText("11. Certification", LM + 4, ty, { font: timesBold, size: 9 });
    ty -= 12;
    ty = drawMultiline(
      "It is hereby certified, on the basis of control carried out that the\ndeclaration by the exporter is correct.\nTo verify this certificate, you may scan the QR code here",
      LM + 4, ty, { font: timesRoman, size: 8, maxWidth: midX - LM - 10 }
    );

    // Dotted line for signature
    const sig11Y = curY + row4H - 18;
    drawLine(LM + 20, sig11Y, midX - 20, sig11Y, { dashArray: [2, 2] });
    currentPage.drawText("Place and date, signature and Stamp of Certifying authority", {
      x: LM + 20, y: height - sig11Y - 10, size: 7, font: timesRoman, color: black,
    });

    // Right - Box 12
    ty = height - curY - 12;
    drawText("12. Declaration by the exporter :", midX + 4, ty, { font: timesBold, size: 9 });
    ty -= 12;
    ty = drawMultiline(
      `The undersigned hereby declare that the above details and statements are correct that all the good(s) were produced in India and that they comply with the origin requirements for export to ${consigneeCountry || "Brazil"} (Importing Country)`,
      midX + 4, ty, { font: timesRoman, size: 8, maxWidth: contentW / 2 - 10 }
    );

    // Signature area
    const placeDate = `${declarationPlace.toUpperCase()}, ${currentDate}`;
    const pdW = timesBold.widthOfTextAtSize(placeDate, 9);
    const sig12LineY = curY + row4H - 30;
    drawLine(midX + 30, sig12LineY, LM + contentW - 10, sig12LineY);
    currentPage.drawText(placeDate, {
      x: midX + (contentW / 2 - pdW) / 2,
      y: height - sig12LineY + 5, size: 9, font: timesBold, color: black,
    });
    currentPage.drawText("Place and date, signature & Stamp of the authorized Signatory", {
      x: midX + 15, y: height - sig12LineY - 10, size: 7, font: timesRoman, color: black,
    });

    curY += row4H;

    // ── ROW 5: Box 13 - Checkboxes ──
    drawRect(LM, curY, contentW, row5H);

    ty = height - curY - 11;
    drawText("13. Where appropriate please tick:", LM + 4, ty, { font: timesBold, size: 8.5 });

    const checkboxLabels = ["Third Country Invoicing", "Exhibition", "ISSUED RETROSPECTIVELY", "Cumulation"];
    const checkboxStartX = LM + 60;
    const checkboxSpacing = (contentW - 70) / checkboxLabels.length;
    const boxSize = 8;
    const cbY = curY + 18;

    for (let i = 0; i < checkboxLabels.length; i++) {
      const cbx = checkboxStartX + i * checkboxSpacing;
      // Draw checkbox square
      drawRect(cbx, cbY, boxSize, boxSize);
      // Draw label
      currentPage.drawText(checkboxLabels[i], {
        x: cbx + boxSize + 3,
        y: height - cbY - 7, size: 8, font: timesRoman, color: black,
      });
    }

    curY += row5H;

    // ── Dynamic page footer page numbers for all pages ──
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const footerText = `Page: ${i + 1}/${pages.length}`;
      const footerW = timesBold.widthOfTextAtSize(footerText, 8);
      p.drawText(footerText, {
        x: LM + contentW - footerW,
        y: 20, size: 8, font: timesBold, color: black,
      });
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Certificate_of_Origin_${jobNo}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── EVENT HANDLERS ──

  const generateHTML = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (e && e.preventDefault) e.preventDefault();

    try {
      const data = await fetchJobData();
      setJobData(data);
      const fields = extractFields(data);
      const template = generateHTMLTemplate(fields);
      setHtmlContent(template);
      setChoiceOpen(true);
    } catch (err) {
      console.error("Error generating Certificate of Origin:", err);
      alert("Failed to generate Certificate of Origin");
    }
  };

  const handleEdit = () => {
    setChoiceOpen(false);
    setEditorOpen(true);
  };

  const handleDownloadDirectly = async () => {
    setChoiceOpen(false);
    try {
      const data = jobData || (await fetchJobData());
      const fields = extractFields(data);
      await drawPdfWithPdfLib(fields);
    } catch (error) {
      console.error("Error generating PDF:", error);
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
            generateHTML(e);
          },
        })
      ) : (
        <Button onClick={generateHTML} variant="contained">
          Generate Certificate of Origin
        </Button>
      )}

      {/* Choice Dialog */}
      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)}>
        <DialogTitle>Document Action</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: "10px" }}>
            Do you want to edit the Certificate of Origin inline or download it directly?
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChoiceOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleEdit} variant="outlined" color="primary">
            Edit
          </Button>
          <Button onClick={handleDownloadDirectly} variant="contained" color="primary">
            Download Directly
          </Button>
        </DialogActions>
      </Dialog>

      <DocumentEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initialContent={htmlContent}
        title={`Certificate of Origin - ${jobNo}`}
        pdfOptions={{
          x: 15,
          y: 15,
          width: 545,
          windowWidth: 800,
          margin: [20, 15, 20, 15],
          autoPaging: 'slice',
          html2canvas: {
            scale: 2,
            windowWidth: 800,
            scrollX: 0,
            scrollY: 0,
            useCORS: true,
            logging: false,
          }
        }}
      />
    </>
  );
};

export default CertificateOfOriginGenerator;