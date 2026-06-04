import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { MenuItem, Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import DocumentEditorDialog from "./DocumentEditorDialog";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Import the logo properly for Vite
import concorLogo from "../../../../assets/images/concor.png";
import { imageToBase64 } from "../../../../utils/imageUtils";

const ConcorForwardingNotePDFGenerator = ({ jobNo, children }) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [jobData, setJobData] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const handleAction = async (e) => {
    if (e) e.stopPropagation();
    const encodedJobNo = encodeURIComponent(jobNo);

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );
      const exportJob = response.data;
      setJobData(exportJob);

      // Pre-load logo as base64
      let logoBase64 = concorLogo;
      try {
        logoBase64 = await imageToBase64(concorLogo);
      } catch (err) {
        console.warn("Failed to convert concorLogo to base64", err);
      }

      // Generate HTML for the editor
      const template = generateHTML(exportJob, logoBase64);
      setHtmlContent(template);
      setChoiceOpen(true);
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Error fetching job data");
    }
  };

  const generateHTML = (exportJob, logoSrc = concorLogo) => {
    const containers = exportJob.containers || [];
    const operations = exportJob.operations?.[0] || {};
    const invoice = exportJob.invoices?.[0] || {};
    const product = invoice.products?.[0] || {};
    const statusDetails = operations.statusDetails?.[0] || {};

    const totalPackages = containers.reduce((sum, cnt) => sum + (Number(cnt.pkgsStuffed) || 0), 0);
    const totalCargoWeight = containers.reduce((sum, cnt) => sum + parseFloat(cnt.grossWeight || 0) / 1000, 0);

    let containerRows = "";
    containers.forEach((cnt, i) => {
      const sizeMatch = (cnt.type || "").match(/^(\d+)/);
      const size = sizeMatch ? sizeMatch[1] : "";
      containerRows += `
        <tr>
          <td style="text-align: center; vertical-align: middle; border: 1px solid black; padding: 1px 2px 3px 2px; font-size: 10px;">${i + 1}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${cnt.containerNo || ""}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${cnt.sealType || "RFID"}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${size}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${cnt.tareWeightKgs || ""}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${cnt.pkgsStuffed || ""}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; vertical-align: middle; font-size: 10px;">${product.description || ""}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${product.ritc || ""}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${(parseFloat(cnt.grossWeight || 0) / 1000).toFixed(1)}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${cnt.grWtPlusTrWt ? (parseFloat(cnt.grWtPlusTrWt) / 1000).toFixed(1) : ""}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">NO</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${invoice.invoiceValue || ""}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${formatDate(statusDetails.leoDate)}</td>
          <td style="border: 1px solid black; padding: 1px 2px 3px 2px; text-align: center; vertical-align: middle; font-size: 10px;">${cnt.sealNo || ""}</td>
        </tr>
      `;
    });

    return `
      <div style="width: 1140px; margin: 5px auto; font-family: Helvetica, Arial, sans-serif; color: black; background: white;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px; table-layout: fixed;">
          <tr>
            <td style="width: 70px; text-align: left; vertical-align: middle; border: none; padding: 0;"><img src="${logoSrc}" style="height: 50px; width: auto;"/></td>
            <td style="text-align: center; vertical-align: middle; border: none; padding: 0;">
              <div style="font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">CONTAINER CORPORATION OF INDIA LIMITED (CONCOR)</div>
              <div style="font-size: 8px; margin-top: 1px;">FORWARDING NOTE FOR GENERAL AND DANGEROUS MERCHANDISE</div>
              <div style="font-size: 7px;">(FOR CONCOR USE ONLY)</div>
              <div style="margin-top: 6px; font-size: 14px; font-weight: bold;">
                <span style="display: inline-block; width: 45%; text-align: right; padding-right: 20px; margin-bottom: 10px;">JOB  ${exportJob.job_no || ""}</span>
                <span style="display: inline-block; width: 45%; text-align: left; padding-left: 20px; margin-bottom: 10px;">INV  ${invoice.invoiceNumber || ""}</span>
              </div>
            </td>
            <td style="width: 70px; text-align: right; vertical-align: middle; border: none; padding: 0;"><img src="${logoSrc}" style="height: 50px; width: auto;"/></td>
          </tr>
        </table>

        <table style="width: 100%; border: 1px solid black; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <td style="border: 1px solid black; width: 14%; text-align: center; vertical-align: middle; font-weight: bold; padding: 1px 2px 4px 2px; font-size: 10px;">SEGMENT</td>
            <td style="border: 1px solid black; width: 14%; text-align: center; vertical-align: middle; font-weight: bold; padding: 1px 2px 4px 2px; font-size: 10px;">EXIM</td>
            <td style="border: 1px solid black; width: 72%; vertical-align: middle; padding: 1px 2px 4px 10px; font-size: 11px; font-weight: bold;">MODE (TICK ONE):&nbsp;&nbsp;&nbsp;&nbsp;BY&nbsp;&nbsp;&nbsp;&nbsp;RAIL /ROAD</td>
          </tr>
          <tr>
            <td colspan="2" style="border: 1px solid black; text-align: center; vertical-align: middle; font-weight: bold; padding: 1px 2px 4px 2px; font-size: 10px;">FROM</td>
            <td style="border: 1px solid black; text-align: center; vertical-align: middle; font-weight: bold; padding: 1px 2px 4px 2px; font-size: 10px;">TO</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; font-size: 9px; text-align: center; vertical-align: middle; padding: 1px 2px 3px 2px;">TERMINAL</td>
            <td style="border: 1px solid black; font-size: 9px; text-align: center; vertical-align: middle; padding: 1px 2px 3px 2px;">GATEWAY PORT</td>
            <td style="border: 1px solid black; padding: 0;">
              <table style="width: 100%; border-collapse: collapse; height: 100%;">
                <tr>
                  <td style="border: none; border-right: 1px solid black; width: 35%; font-size: 9px; text-align: center; vertical-align: middle; padding: 1px 2px 3px 2px;">SHIPPING LINE</td>
                  <td style="border: none; border-right: 1px solid black; width: 35%; font-size: 9px; text-align: center; vertical-align: middle; padding: 1px 2px 3px 2px;">PORT OF DISCHARGE</td>
                  <td style="border: none; width: 30%; font-size: 9px; text-align: center; vertical-align: middle; padding: 1px 2px 3px 2px;">COUNTRY</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid black; text-align: center; vertical-align: middle; font-weight: bold; padding: 2px 2px 4px 2px; font-size: 12px;">${exportJob.branchCode || "KHDB"}</td>
            <td style="border: 1px solid black; text-align: center; vertical-align: middle; font-weight: bold; padding: 2px 2px 4px 2px; font-size: 12px;">${exportJob.gateway_port || exportJob.port_of_loading || ""}</td>
            <td style="border: 1px solid black; padding: 0;">
               <table style="width: 100%; border-collapse: collapse; height: 100%;">
                <tr>
                  <td style="border: none; border-right: 1px solid black; width: 35%; text-align: center; vertical-align: middle; font-weight: bold; padding: 2px 2px 4px 2px; font-size: 12px;">${exportJob.shipping_line_airline || ""}</td>
                  <td style="border: none; border-right: 1px solid black; width: 35%; text-align: center; vertical-align: middle; font-weight: bold; padding: 2px 2px 4px 2px; font-size: 12px;">${exportJob.port_of_discharge || ""}</td>
                  <td style="border: none; width: 30%; text-align: center; vertical-align: middle; font-weight: bold; padding: 2px 2px 4px 2px; font-size: 12px;">${exportJob.discharge_country || ""}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid black; font-size: 10px; vertical-align: middle; padding: 1px 5px 4px 5px;">
              CUSTOMER TYPE: (TICK ONE) EXPORTER | IMPORTER | ASSOCIATE PARTNER | CORPORATE CUSTOMER
            </td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid black; vertical-align: middle; padding: 1px 5px 4px 5px; font-weight: bold; font-size: 13px;">
              CHA NAME &amp; CODE:  SURAJ FORWARDERS AND SHIPPING AGENCIES
            </td>
          </tr>
          <tr>
             <td colspan="3" style="border: 1px solid black; font-size: 9px; vertical-align: middle; padding: 0px 5px 2px 5px;">
              TRANSPORTED BY: SELF TPT | CONCOR
            </td>
          </tr>
          <tr>
             <td colspan="3" style="border: 1px solid black; font-size: 8px; vertical-align: middle; padding: 0px 5px 2px 5px;">
              <i>In case of CONCOR service, Kindly provide</i>
            </td>
          </tr>
          <tr>
             <td colspan="3" style="border: 1px solid black; font-size: 9px; vertical-align: middle; padding: 0px 5px 2px 5px;">
              PICK UP POINT/KM: ${exportJob.factory_address || ""}
            </td>
          </tr>
          <tr>
             <td colspan="3" style="border: 1px solid black; font-size: 9px; vertical-align: middle; padding: 0px 5px 2px 5px;">
              DELIVER POINT/KM:
            </td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid black; vertical-align: middle; padding: 2px 5px 5px 5px; font-weight: bold; font-size: 14px;">
              SHIPPING BILL NO.${exportJob.sb_no || ""} DATE ${formatDate(exportJob.sb_date)}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="border: 1px solid black; font-size: 10px; vertical-align: middle; padding: 1px 5px 4px 5px;">
              STUFFING TYPE: ${exportJob.goods_stuffed_at === "Factory" ? "FCL" : "ICD"}
            </td>
            <td style="border: 1px solid black; font-size: 10px; vertical-align: middle; padding: 1px 5px 4px 5px;">
              GST IN INVOICE NAME: ${exportJob.exporter || ""}
            </td>
          </tr>
           <tr>
            <td colspan="3" style="border: 1px solid black; font-size: 9px; vertical-align: middle; padding: 1px 5px 4px 5px;">
              PAYMENT MODE (PDA) &amp; NO.: SURAJ FORWARDERS PVT. LTD.
            </td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid black; vertical-align: middle; padding: 2px 5px 5px 5px; font-weight: bold; font-size: 14px;">
              EXPORTER NAME : ${exportJob.exporter || ""}
            </td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid black; vertical-align: middle; padding: 1px 5px 4px 5px; font-size: 12px;">
              NAME IN INVOICE GSTIN NO : ${exportJob.gstin || ""}
            </td>
          </tr>
        </table>

        <table style="width: 100%; border: 1px solid black; border-collapse: collapse; font-size: 10px; table-layout: fixed; margin-top: -1px;">
          <thead style="background: white;">
            <tr>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 3%; vertical-align: middle; text-align: center; font-size: 10px;">Sr.<br/>No.</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 8.5%; vertical-align: middle; text-align: center; font-size: 10px;">CONTAINER NO.</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 4%; vertical-align: middle; text-align: center; font-size: 10px;">TYPE</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 4%; vertical-align: middle; text-align: center; font-size: 10px;">SIZE</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 6%; vertical-align: middle; text-align: center; font-size: 10px;">TARE WT.</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 6%; vertical-align: middle; text-align: center; font-size: 10px;">NO. OF<br/>PACKAGE<br/>S</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 18%; vertical-align: middle; text-align: left; font-size: 10px;">COMMODITY NAME</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 7%; vertical-align: middle; text-align: center; font-size: 9px;">COMMODIT<br/>Y<br/>HSN CODE</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 6%; vertical-align: middle; text-align: center; font-size: 10px;">CARGO WT<br/>(In MTS)</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 6%; vertical-align: middle; text-align: center; font-size: 10px;">VGM</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 7%; vertical-align: middle; text-align: center; font-size: 10px;">HAZARDOUS</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 8%; vertical-align: middle; text-align: center; font-size: 10px;">VALUE/FOB</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 7%; vertical-align: middle; text-align: center; font-size: 10px;">LEO DT</th>
              <th style="border: 1px solid black; padding: 1px 2px 4px 2px; width: 9%; vertical-align: middle; text-align: center; font-size: 10px;">SEAL NO.</th>
            </tr>
          </thead>
          <tbody>
            ${containerRows}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold;">
              <td colspan="5" style="border: 1px solid black; text-align: right; vertical-align: middle; padding: 1px 4px 4px 4px; font-size: 10px;">Total:</td>
              <td style="border: 1px solid black; text-align: center; vertical-align: middle; padding: 1px 2px 4px 2px; font-size: 10px;">${totalPackages}</td>
              <td colspan="2" style="border: 1px solid black; padding: 1px 2px 4px 2px;"></td>
              <td style="border: 1px solid black; text-align: center; vertical-align: middle; padding: 1px 2px 4px 2px; font-size: 10px;">${totalCargoWeight.toFixed(1)}</td>
              <td colspan="5" style="border: 1px solid black; padding: 1px 2px 4px 2px;"></td>
            </tr>
          </tfoot>
        </table>


        <div style="margin-top: 4px; font-size: 9px; line-height: 1.4;">
          <div>(Accepted on said to contain Basis)</div>
          <div>1. I declare that each consignment is of value Rs._________________ and engage**/do not engage** to pay percentage charge on excess value for the increased risk as required by CONCOR...</div>
          <div>&nbsp;&nbsp;&nbsp;Alternative CONCOR risk and Owner's risk being available, I elect to pay ________________ rates.</div>
          <div>2. Please declare whether above container/contains high value cargo YES/NO</div>
          <div>3. I do hereby certify that I have satisfied myself that the description, marks &amp; weights or quantity of goods consigned by me have been correctly entered in the Forwarding Note...</div>
          
          <div style="margin-top: 4px;">Tick the appropriate option shown above.</div>
          
          <div style="float: right; text-align: right; width: 240px; font-size: 10px;">
            <b>Signature &amp; Seal of the Customer</b><br/>
            DATE: ${formatDate(new Date())}
          </div>
          <div style="clear: both;"></div>
        </div>

        <div style="margin-top: 10px; text-align: center; font-size: 13px; font-weight: bold;">TERMS AND CONDITIONS</div>
        <div style="font-size: 9px; margin-top: 4px; line-height: 1.3;">
          <div>1. Unless the consignor declares in clause(1) overleaf the value of any consignment &amp; pays percentage charge on excess value as required by CONCOR, the maximum limit of liability shall not exceed Rs. 50 per kg.</div>
          <div>2. When alternative 'CONCOR Risk' and 'Owner Risk' rates are quoted, the latter will apply unless sender elects 'CONCOR Risk'.</div>
          <div>3. I accept responsibility for any consequences to the property of CONCOR or others caused by this consignment Note - Attention is invited to terms for dangerous goods in I.R.C.A Red Tariff and IMDG.</div>
        </div>
        
        <div style="margin-top: 8px; border: 1px solid black; padding: 5px 8px; font-size: 10px; font-weight: bold; min-height: 25px;">
          Additional declarations for Dangerous Goods (I.R.C.A / IMDG)
        </div>
        
        <div style="margin-top: -1px; border: 1px solid black; padding: 5px 8px; font-size: 11px; font-weight: bold; min-height: 35px;">
          FOR OFFICE USE
        </div>
      </div>
    `;
  };

  const downloadDirectly = async () => {
    setChoiceOpen(false);
    const exportJob = jobData;
    if (!exportJob) return;

    try {
      const containers = exportJob.containers || [];
      const operations = exportJob.operations?.[0] || {};
      const invoice = exportJob.invoices?.[0] || {};
      const product = invoice.products?.[0] || {};
      const statusDetails = operations.statusDetails?.[0] || {};

      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const leftMargin = 5;
      const rightMargin = 5;
      const topMargin = 5;
      const bottomMargin = 2;
      const contentWidth = pageWidth - leftMargin - rightMargin;

      const containerCount = containers.length;
      const isCompact = containerCount > 6;
      const headerScale = isCompact ? 1.1 : 1.25; // Further increased scale
      const rowScale = isCompact ? 1.05 : 1.2;

      let yPos = topMargin;

      const drawContentBox = (startY, columns, minHeight) => {
        let maxLines = 1;
        const processedCols = columns.map((col) => {
          const fontSize = col.fontSize || 8 * rowScale;
          doc.setFontSize(fontSize);
          doc.setFont(col.font || "helvetica", col.style || "normal");
          const padding = 1.0;
          const availableWidth = col.width - padding * 2;
          const text = String(col.text || "");
          const textLines = doc.splitTextToSize(text, availableWidth);
          if (textLines.length > maxLines) maxLines = textLines.length;
          return { ...col, textLines, fontSize };
        });

        const refFontSize = processedCols[0]?.fontSize || 8 * rowScale;
        const lineHeightMm = refFontSize * 0.3527 * 1.1;
        const dynamicHeight = Math.max(minHeight, maxLines * lineHeightMm + 1.0);

        let currentX = leftMargin;
        processedCols.forEach((col) => {
          doc.rect(currentX, startY, col.width, dynamicHeight);
          doc.setFontSize(col.fontSize);
          doc.setFont(col.font || "helvetica", col.style || "normal");
          const textX = col.align === "center" ? currentX + col.width / 2 : currentX + 2;
          const colLineHeight = col.fontSize * 0.3527 * 1.1;
          const textBlockHeight = col.textLines.length * colLineHeight;
          const textY = startY + (dynamicHeight - textBlockHeight) / 2;
          doc.text(col.textLines, textX, textY, { align: col.align || "left", baseline: "top" });
          currentX += col.width;
        });
        return dynamicHeight;
      };

      const headerHeight = 12 * headerScale;
      const logoSize = 10 * headerScale;

      try {
        // Pre-load logo for addImage
        const logoBase64 = await imageToBase64(concorLogo);
        doc.addImage(logoBase64, "PNG", leftMargin + 1, yPos + 0.5, logoSize, logoSize);
        doc.addImage(logoBase64, "PNG", pageWidth - rightMargin - logoSize - 1, yPos + 1, logoSize, logoSize);
      } catch (err) {
        console.warn("Failed to pre-load logo for addImage, trying direct URL", err);
        try {
          doc.addImage(concorLogo, "PNG", leftMargin + 1, yPos + 0.5, logoSize, logoSize);
          doc.addImage(concorLogo, "PNG", pageWidth - rightMargin - logoSize - 1, yPos + 1, logoSize, logoSize);
        } catch (innerErr) {
          console.error("Critical logo loading failure", innerErr);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11 * headerScale);
      doc.text("CONTAINER CORPORATION OF INDIA LIMITED (CONCOR)", pageWidth / 2, yPos + 4, { align: "center" });
      doc.setFontSize(5 * headerScale);
      doc.text("FORWARDING NOTE FOR GENERAL AND DANGEROUS MERCHANDISE", pageWidth / 2, yPos + 7, { align: "center" });
      doc.setFontSize(4 * headerScale);
      doc.text("(FOR CONCOR USE ONLY)", pageWidth / 2, yPos + 10, { align: "center" });

      yPos += headerHeight;
      doc.setFontSize(9 * headerScale);
      doc.text(`JOB  ${exportJob.job_no || ""}`, pageWidth / 2 - 40, yPos);
      doc.text(`INV  ${invoice.invoiceNumber || ""}`, pageWidth / 2 + 20, yPos);

      yPos += 3 * headerScale;
      let boxY = yPos;
      const rowH = 4.5 * rowScale;
      const smallRowH = 2.5 * rowScale;
      doc.setLineWidth(0.2);

      doc.rect(leftMargin, boxY, 30, rowH);
      doc.rect(leftMargin + 30, boxY, 30, rowH);
      doc.rect(leftMargin + 60, boxY, contentWidth - 60, rowH);
      doc.setFontSize(6 * rowScale);
      doc.text("SEGMENT", leftMargin + 15, boxY + rowH * 0.7, { align: "center" });
      doc.text("EXIM", leftMargin + 45, boxY + rowH * 0.7, { align: "center" });
      doc.setFontSize(7 * rowScale);
      doc.text("MODE (TICK ONE):    BY    RAIL /ROAD", leftMargin + 65, boxY + rowH * 0.7);

      boxY += rowH;
      const fromWidth = contentWidth * 0.35;
      const toWidth = contentWidth * 0.65;
      doc.rect(leftMargin, boxY, fromWidth, rowH);
      doc.rect(leftMargin + fromWidth, boxY, toWidth, rowH);
      doc.text("FROM", leftMargin + fromWidth / 2, boxY + rowH * 0.7, { align: "center" });
      doc.text("TO", leftMargin + fromWidth + toWidth / 2, boxY + rowH * 0.7, { align: "center" });

      boxY += rowH;
      const col1 = fromWidth / 2, col2 = fromWidth / 2, col3 = toWidth * 0.35, col4 = toWidth * 0.35, col5 = toWidth * 0.3;
      doc.rect(leftMargin, boxY, col1, rowH);
      doc.rect(leftMargin + col1, boxY, col2, rowH);
      doc.rect(leftMargin + fromWidth, boxY, col3, rowH);
      doc.rect(leftMargin + fromWidth + col3, boxY, col4, rowH);
      doc.rect(leftMargin + fromWidth + col3 + col4, boxY, col5, rowH);
      doc.setFontSize(5.5 * rowScale);
      doc.text("TERMINAL", leftMargin + col1 / 2, boxY + rowH * 0.7, { align: "center" });
      doc.text("GATEWAY PORT", leftMargin + col1 + col2 / 2, boxY + rowH * 0.7, { align: "center" });
      doc.text("SHIPPING LINE", leftMargin + fromWidth + col3 / 2, boxY + rowH * 0.7, { align: "center" });
      doc.text("PORT OF DISCHARGE", leftMargin + fromWidth + col3 + col4 / 2, boxY + rowH * 0.7, { align: "center" });
      doc.text("COUNTRY", leftMargin + fromWidth + col3 + col4 + col5 / 2, boxY + rowH * 0.7, { align: "center" });

      boxY += rowH;
      const valuesHeight = drawContentBox(boxY, [
        { width: col1, text: exportJob.branchCode || "KHDB", align: "center", style: "bold" },
        { width: col2, text: exportJob.gateway_port || exportJob.port_of_loading || "", align: "center", style: "bold" },
        { width: col3, text: exportJob.shipping_line_airline || "", align: "center", style: "bold" },
        { width: col4, text: exportJob.port_of_discharge || "", align: "center", style: "bold" },
        { width: col5, text: exportJob.discharge_country || "", align: "center", style: "bold" },
      ], rowH);
      boxY += valuesHeight;

      doc.rect(leftMargin, boxY, contentWidth, rowH);
      doc.setFontSize(6 * rowScale);
      doc.text("CUSTOMER TYPE: (TICK ONE) EXPORTER | IMPORTER | ASSOCIATE PARTNER | CORPORATE CUSTOMER", leftMargin + 3, boxY + rowH * 0.7);
      boxY += rowH;

      doc.rect(leftMargin, boxY, contentWidth, rowH + 1);
      doc.setFontSize(9 * rowScale);
      doc.text("CHA NAME & CODE:  SURAJ FORWARDERS AND SHIPPING AGENCIES", leftMargin + 3, boxY + (rowH + 1) * 0.7);
      boxY += rowH + 1;

      doc.rect(leftMargin, boxY, contentWidth, smallRowH);
      doc.setFontSize(5.5 * rowScale);
      doc.text("TRANSPORTED BY: SELF TPT | CONCOR", leftMargin + 3, boxY + smallRowH * 0.75);
      boxY += smallRowH;

      doc.rect(leftMargin, boxY, contentWidth, smallRowH);
      doc.setFontSize(5 * rowScale);
      doc.text("In case of CONCOR service, Kindly provide", leftMargin + 3, boxY + smallRowH * 0.75);
      boxY += smallRowH;

      boxY += drawContentBox(boxY, [{ width: contentWidth, text: `PICK UP POINT/KM:    ${exportJob.factory_address || ""}`, fontSize: 6 * rowScale }], smallRowH);
      doc.rect(leftMargin, boxY, contentWidth, smallRowH);
      doc.text("DELIVER POINT/KM:", leftMargin + 3, boxY + smallRowH * 0.75);
      boxY += smallRowH;

      boxY += drawContentBox(boxY, [{ width: contentWidth, text: `SHIPPING BILL NO.${exportJob.sb_no || ""} DATE ${formatDate(exportJob.sb_date)}`, fontSize: 10 * rowScale, style: "bold" }], rowH + 1);
      boxY += drawContentBox(boxY, [
        { width: contentWidth / 2, text: `STUFFING TYPE: ${exportJob.goods_stuffed_at === "Factory" ? "FCL" : "ICD"}`, fontSize: 6 * rowScale },
        { width: contentWidth / 2, text: `GST IN INVOICE NAME: ${exportJob.exporter || ""}`, fontSize: 6 * rowScale },
      ], rowH);

      doc.rect(leftMargin, boxY, contentWidth, rowH);
      doc.text("PAYMENT MODE (PDA) & NO.: SURAJ FORWARDERS PVT. LTD.", leftMargin + 3, boxY + rowH * 0.7);
      boxY += rowH;

      boxY += drawContentBox(boxY, [{ width: contentWidth, text: `EXPORTER NAME : ${exportJob.exporter || ""}`, fontSize: 10 * rowScale, style: "bold" }], rowH + 1);
      boxY += drawContentBox(boxY, [{ width: contentWidth, text: `NAME IN INVOICE GSTIN NO : ${exportJob.gstin || ""}`, fontSize: 8 * rowScale }], rowH);
      boxY += 2;

      const tableHeaders = ["Sr.\nNo.", "CONTAINER NO.", "TYPE", "SIZE", "TARE WT.", "NO. OF\nPACKAGES", "COMMODITY NAME", "COMMODITY\nHSN CODE", "CARGO WT\n(In MTS)", "VGM", "HAZARDOUS", "VALUE/FOB", "LEO DT", "SEAL NO."];
      const tableBody = containers.map((cnt, i) => [
        i + 1, cnt.containerNo || "", (cnt.sealType || ""), (cnt.type || "").match(/^(\d+)/)?.[1] || "", cnt.tareWeightKgs || "", cnt.pkgsStuffed || "", product.description || "", product.ritc || "", (parseFloat(cnt.grossWeight || 0) / 1000).toFixed(1), cnt.grWtPlusTrWt ? (parseFloat(cnt.grWtPlusTrWt) / 1000).toFixed(1) : "", "NO", invoice.invoiceValue || "", formatDate(statusDetails.leoDate), cnt.sealNo || ""
      ]);

      const totalPackages = containers.reduce((sum, cnt) => sum + (Number(cnt.pkgsStuffed) || 0), 0);
      const totalCargoWeight = containers.reduce((sum, cnt) => sum + parseFloat(cnt.grossWeight || 0) / 1000, 0);
      tableBody.push([
        { content: "Total:", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
        { content: String(totalPackages || ""), styles: { fontStyle: "bold" } },
        "",
        "",
        { content: totalCargoWeight.toFixed(1), styles: { fontStyle: "bold" } },
        "", "", "", "", ""
      ]);

      const totalWidth = contentWidth;
      const colWidths = {
        0: { cellWidth: totalWidth * 0.03 },
        1: { cellWidth: totalWidth * 0.09 },
        2: { cellWidth: totalWidth * 0.04 },
        3: { cellWidth: totalWidth * 0.04 },
        4: { cellWidth: totalWidth * 0.06 },
        5: { cellWidth: totalWidth * 0.05 },
        6: { cellWidth: totalWidth * 0.20 },
        7: { cellWidth: totalWidth * 0.06 },
        8: { cellWidth: totalWidth * 0.06 },
        9: { cellWidth: totalWidth * 0.06 },
        10: { cellWidth: totalWidth * 0.07 },
        11: { cellWidth: totalWidth * 0.08 },
        12: { cellWidth: totalWidth * 0.07 },
        13: { cellWidth: totalWidth * 0.09 },
      };

      doc.autoTable({
        startY: boxY, head: [tableHeaders], body: tableBody, theme: "grid",
        styles: { fontSize: (isCompact ? 7.5 : 8.5), cellPadding: (isCompact ? 0.5 : 0.7), lineColor: [0, 0, 0], lineWidth: 0.1, halign: "center", font: "helvetica" },
        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold" },
        margin: { left: leftMargin, right: rightMargin }, tableWidth: contentWidth,
        columnStyles: colWidths
      });

      yPos = doc.lastAutoTable.finalY + 3;
      doc.setFontSize(7); doc.setFont("helvetica", "normal");
      doc.text("(Accepted on said to contain Basis)", leftMargin, yPos);
      yPos += 3;
      const declarations = [
        "1. I declare that each consignment is of value Rs._________________ and engage**/do not engage** to pay percentage charge on excess value for the increased risk as required by CONCOR...",
        "   Alternative CONCOR risk and Owner's risk being available, I elect to pay ________________ rates.",
        "2. Please declare whether above container/contains high value cargo YES/NO",
        "3. I do hereby certify that I have satisfied myself that the description,marks & weights or quantity of goods consigned by me have been correctly entered in the Forwarding Note..."
      ];
      declarations.forEach(line => { doc.text(line, leftMargin, yPos); yPos += 3.5; });
      yPos += 2; doc.text("Tick the appropriate option shown above.", leftMargin, yPos);
      doc.setFont("helvetica", "bold");
      doc.text("Signature & Seal of the Customer", pageWidth - rightMargin - 65, yPos);
      doc.text(`DATE: ${formatDate(new Date())}`, pageWidth - rightMargin - 65, yPos + 5);

      yPos += 12;
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text("TERMS AND CONDITIONS", pageWidth / 2, yPos, { align: "center" });
      yPos += 5; doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      const terms = [
        "1. Unless the consignor declares in clause(1) overleaf the value of any consignment & pays percentage charge on excess value as required by CONCOR, the maximum limit of liability shall not exceed Rs. 50 per kg.",
        "2. When alternative 'CONCOR Risk' and 'Owner Risk' rates are quoted, the latter will apply unless sender elects 'CONCOR Risk'.",
        "3. I accept responsibility for any consequences to the property of CONCOR or others caused by this consignment Note - Attention is invited to terms for dangerous goods in I.R.C.A Red Tariff and IMDG."
      ];
      terms.forEach(line => { doc.text(line, leftMargin, yPos); yPos += 3; });
      yPos += 2; doc.rect(leftMargin, yPos, contentWidth, 10);
      doc.setFont("helvetica", "bold"); doc.text("Additional declarations for Dangerous Goods (I.R.C.A / IMDG)", leftMargin + 3, yPos + 5);
      yPos += 12; doc.rect(leftMargin, yPos, contentWidth, 12);
      doc.setFontSize(9); doc.text("FOR OFFICE USE", leftMargin + 3, yPos + 6);

      window.open(doc.output("bloburl"), "_blank");
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Error: " + err.message);
    }
  };

  const handleDownloadExcel = async () => {
    setChoiceOpen(false);
    if (!jobData) {
      alert("No job data loaded.");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("CONCOR Note");

      // Column Widths for 14 columns
      worksheet.columns = [
        { width: 5 },   // A: Sr No
        { width: 18 },  // B: Container No
        { width: 10 },  // C: Type
        { width: 8 },   // D: Size
        { width: 12 },  // E: Tare Wt
        { width: 12 },  // F: No of Packages
        { width: 35 },  // G: Commodity Name
        { width: 14 },  // H: HSN Code
        { width: 12 },  // I: Cargo Wt (MT)
        { width: 12 },  // J: VGM
        { width: 12 },  // K: Hazardous
        { width: 14 },  // L: Value/FOB
        { width: 14 },  // M: LEO Dt
        { width: 16 }   // N: Seal No
      ];

      // Defaults
      for (let r = 1; r <= 100; r++) {
        worksheet.getRow(r).height = 20;
      }

      // Helper to draw outer borders for unmerged cell ranges (prevents image stretching in Google Sheets/Excel)
      const setOuterBorder = (ws, startRow, startCol, endRow, endCol) => {
        const borderStyle = { style: 'thin', color: { argb: 'FF000000' } };
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const cell = ws.getCell(r, c);
            const border = {};
            if (r === startRow) border.top = borderStyle;
            if (r === endRow) border.bottom = borderStyle;
            if (c === startCol) border.left = borderStyle;
            if (c === endCol) border.right = borderStyle;
            cell.border = border;
          }
        }
      };

      // Add logo images
      try {
        const base64Logo = await imageToBase64(concorLogo);
        if (base64Logo && base64Logo.startsWith("data:image")) {
          const base64Data = base64Logo.split(",")[1];
          const extension = base64Logo.match(/image\/(\w+)/)?.[1] || "png";
          const imageId1 = workbook.addImage({ base64: base64Data, extension });
          const imageId2 = workbook.addImage({ base64: base64Data, extension });
          
          worksheet.addImage(imageId1, {
            tl: { col: 0.3, row: 0.3 },
            ext: { width: 44, height: 50 },
            editAs: 'oneCell'
          });
          worksheet.addImage(imageId2, {
            tl: { col: 12.3, row: 0.3 },
            ext: { width: 44, height: 50 },
            editAs: 'oneCell'
          });
        }
      } catch (err) {
        console.warn("Failed to add logos to CONCOR Excel", err);
      }

      setOuterBorder(worksheet, 1, 1, 3, 2); // Left logo box
      setOuterBorder(worksheet, 1, 13, 3, 14); // Right logo box
      worksheet.mergeCells("C1:L1"); // Company name
      worksheet.mergeCells("C2:L2"); // Subtitle
      worksheet.mergeCells("C3:L3"); // CONCOR USE
      worksheet.mergeCells("C4:G4"); // JOB
      worksheet.mergeCells("H4:L4"); // INV

      worksheet.getCell("C1").value = "CONTAINER CORPORATION OF INDIA LIMITED (CONCOR)";
      worksheet.getCell("C1").font = { name: "Arial", bold: true, size: 14 };
      worksheet.getCell("C1").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell("C2").value = "FORWARDING NOTE FOR GENERAL AND DANGEROUS MERCHANDISE";
      worksheet.getCell("C2").font = { name: "Arial", size: 8 };
      worksheet.getCell("C2").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell("C3").value = "(FOR CONCOR USE ONLY)";
      worksheet.getCell("C3").font = { name: "Arial", size: 7.5 };
      worksheet.getCell("C3").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell("C4").value = `JOB: ${jobData.job_no || ""}`;
      worksheet.getCell("C4").font = { name: "Arial", bold: true, size: 11 };
      worksheet.getCell("C4").alignment = { vertical: "middle", horizontal: "right" };

      const invoice = jobData.invoices?.[0] || {};
      worksheet.getCell("H4").value = `INV: ${invoice.invoiceNumber || ""}`;
      worksheet.getCell("H4").font = { name: "Arial", bold: true, size: 11 };
      worksheet.getCell("H4").alignment = { vertical: "middle", horizontal: "left" };

      // Segment Details
      worksheet.mergeCells("A5:B5");
      worksheet.mergeCells("C5:D5");
      worksheet.mergeCells("E5:N5");
      worksheet.getCell("A5").value = "SEGMENT";
      worksheet.getCell("A5").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("A5").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell("C5").value = "EXIM";
      worksheet.getCell("C5").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("C5").alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell("E5").value = "MODE (TICK ONE):    BY    RAIL /ROAD";
      worksheet.getCell("E5").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("E5").alignment = { vertical: "middle", horizontal: "left" };

      // FROM / TO
      worksheet.mergeCells("A6:G6");
      worksheet.mergeCells("H6:N6");
      worksheet.getCell("A6").value = "FROM";
      worksheet.getCell("A6").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("A6").alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getCell("H6").value = "TO";
      worksheet.getCell("H6").font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell("H6").alignment = { vertical: "middle", horizontal: "center" };

      // Header Detail Subtitles
      worksheet.mergeCells("A7:C7");
      worksheet.mergeCells("D7:G7");
      worksheet.mergeCells("H7:J7");
      worksheet.mergeCells("K7:L7");
      worksheet.mergeCells("M7:N7");
      worksheet.getCell("A7").value = "TERMINAL";
      worksheet.getCell("D7").value = "GATEWAY PORT";
      worksheet.getCell("H7").value = "SHIPPING LINE";
      worksheet.getCell("K7").value = "PORT OF DISCHARGE";
      worksheet.getCell("M7").value = "COUNTRY";
      ["A7", "D7", "H7", "K7", "M7"].forEach(cellId => {
        worksheet.getCell(cellId).font = { name: "Arial", size: 8 };
        worksheet.getCell(cellId).alignment = { vertical: "middle", horizontal: "center" };
      });

      // Values
      worksheet.mergeCells("A8:C8");
      worksheet.mergeCells("D8:G8");
      worksheet.mergeCells("H8:J8");
      worksheet.mergeCells("K8:L8");
      worksheet.mergeCells("M8:N8");
      worksheet.getCell("A8").value = jobData.branchCode || "KHDB";
      worksheet.getCell("D8").value = jobData.gateway_port || jobData.port_of_loading || "";
      worksheet.getCell("H8").value = jobData.shipping_line_airline || "";
      worksheet.getCell("K8").value = jobData.port_of_discharge || "";
      worksheet.getCell("M8").value = jobData.discharge_country || "";
      ["A8", "D8", "H8", "K8", "M8"].forEach(cellId => {
        worksheet.getCell(cellId).font = { name: "Arial", bold: true, size: 10 };
        worksheet.getCell(cellId).alignment = { vertical: "middle", horizontal: "center" };
      });

      // Customer Type
      worksheet.mergeCells("A9:N9");
      worksheet.getCell("A9").value = "CUSTOMER TYPE: (TICK ONE) EXPORTER | IMPORTER | ASSOCIATE PARTNER | CORPORATE CUSTOMER";
      worksheet.getCell("A9").font = { name: "Arial", size: 9 };
      worksheet.getCell("A9").alignment = { vertical: "middle", horizontal: "left" };

      // CHA Name
      worksheet.mergeCells("A10:N10");
      worksheet.getCell("A10").value = "CHA NAME & CODE:  SURAJ FORWARDERS AND SHIPPING AGENCIES";
      worksheet.getCell("A10").font = { name: "Arial", bold: true, size: 11 };
      worksheet.getCell("A10").alignment = { vertical: "middle", horizontal: "left" };

      // Transported by
      worksheet.mergeCells("A11:N11");
      worksheet.getCell("A11").value = "TRANSPORTED BY: SELF TPT | CONCOR";
      worksheet.getCell("A11").font = { name: "Arial", size: 8.5 };
      worksheet.getCell("A11").alignment = { vertical: "middle", horizontal: "left" };

      // Transported disclaimer
      worksheet.mergeCells("A12:N12");
      worksheet.getCell("A12").value = "In case of CONCOR service, Kindly provide";
      worksheet.getCell("A12").font = { name: "Arial", size: 7.5, italic: true };
      worksheet.getCell("A12").alignment = { vertical: "middle", horizontal: "left" };

      // Pick up point
      worksheet.mergeCells("A13:N13");
      worksheet.getCell("A13").value = `PICK UP POINT/KM:    ${jobData.factory_address || ""}`;
      worksheet.getCell("A13").font = { name: "Arial", size: 8.5 };
      worksheet.getCell("A13").alignment = { vertical: "middle", horizontal: "left" };

      // Deliver point
      worksheet.mergeCells("A14:N14");
      worksheet.getCell("A14").value = "DELIVER POINT/KM:";
      worksheet.getCell("A14").font = { name: "Arial", size: 8.5 };
      worksheet.getCell("A14").alignment = { vertical: "middle", horizontal: "left" };

      // Shipping Bill
      worksheet.mergeCells("A15:N15");
      worksheet.getCell("A15").value = {
        richText: [
          { text: "SHIPPING BILL NO. ", font: { name: "Arial", size: 9 } },
          { text: jobData.sb_no || "", font: { name: "Arial", bold: true, size: 12 } },
          { text: "   DATE ", font: { name: "Arial", size: 9 } },
          { text: formatDate(jobData.sb_date), font: { name: "Arial", bold: true, size: 12 } }
        ]
      };
      worksheet.getCell("A15").alignment = { vertical: "middle", horizontal: "left" };
      worksheet.getRow(15).height = 24;

      // Stuffing Type & GST
      worksheet.mergeCells("A16:G16");
      worksheet.mergeCells("H16:N16");
      worksheet.getCell("A16").value = `STUFFING TYPE: ${jobData.goods_stuffed_at === "Factory" ? "FCL" : "ICD"}`;
      worksheet.getCell("A16").font = { name: "Arial", size: 9 };
      worksheet.getCell("A16").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getCell("H16").value = `GST IN INVOICE NAME: ${jobData.exporter || ""}`;
      worksheet.getCell("H16").font = { name: "Arial", size: 9 };
      worksheet.getCell("H16").alignment = { vertical: "middle", horizontal: "left" };

      // Payment Mode
      worksheet.mergeCells("A17:N17");
      worksheet.getCell("A17").value = "PAYMENT MODE (PDA) & NO.: SURAJ FORWARDERS PVT. LTD.";
      worksheet.getCell("A17").font = { name: "Arial", size: 9 };
      worksheet.getCell("A17").alignment = { vertical: "middle", horizontal: "left" };

      // Exporter Name
      worksheet.mergeCells("A18:N18");
      worksheet.getCell("A18").value = {
        richText: [
          { text: "EXPORTER NAME : ", font: { name: "Arial", size: 9 } },
          { text: jobData.exporter || "", font: { name: "Arial", bold: true, size: 11 } }
        ]
      };
      worksheet.getCell("A18").alignment = { vertical: "middle", horizontal: "left" };

      // GSTIN No
      worksheet.mergeCells("A19:N19");
      worksheet.getCell("A19").value = `NAME IN INVOICE GSTIN NO : ${jobData.gstin || ""}`;
      worksheet.getCell("A19").font = { name: "Arial", size: 9 };
      worksheet.getCell("A19").alignment = { vertical: "middle", horizontal: "left" };

      // Container Headers
      const tableHeaders = ["Sr. No.", "CONTAINER NO.", "TYPE", "SIZE", "TARE WT.", "NO. OF PACKAGES", "COMMODITY NAME", "COMMODITY HSN CODE", "CARGO WT (In MTS)", "VGM", "HAZARDOUS", "VALUE/FOB", "LEO DT", "SEAL NO."];
      worksheet.getRow(20).height = 28;
      tableHeaders.forEach((h, cidx) => {
        const cell = worksheet.getCell(20, cidx + 1);
        cell.value = h;
        cell.font = { name: "Arial", bold: true, size: 9 };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      });

      // Containers Rows
      let currentRow = 21;
      let totalPackages = 0;
      let totalCargoWeight = 0;

      const containers = jobData.containers || [];
      const operations = jobData.operations?.[0] || {};
      const product = invoice.products?.[0] || {};
      const statusDetails = operations.statusDetails?.[0] || {};

      containers.forEach((cnt, i) => {
        worksheet.getRow(currentRow).height = 45;
        const pkgs = Number(cnt.pkgsStuffed) || 0;
        const weight = Number(cnt.grossWeight) || 0;
        const cargoWeightMT = weight / 1000;
        const tareWeight = Number(cnt.tareWeightKgs) || 0;
        const sizeMatch = (cnt.type || "").match(/^(\d+)/);
        const size = sizeMatch ? sizeMatch[1] : "";

        totalPackages += pkgs;
        totalCargoWeight += cargoWeightMT;

        worksheet.getCell(currentRow, 1).value = i + 1;
        worksheet.getCell(currentRow, 2).value = cnt.containerNo || "";
        worksheet.getCell(currentRow, 3).value = cnt.sealType || "RFID";
        worksheet.getCell(currentRow, 4).value = size;
        worksheet.getCell(currentRow, 5).value = tareWeight || "";
        worksheet.getCell(currentRow, 5).numFormat = '#,##0';
        worksheet.getCell(currentRow, 6).value = pkgs || "";
        worksheet.getCell(currentRow, 6).numFormat = '#,##0';
        worksheet.getCell(currentRow, 7).value = product.description || "";
        worksheet.getCell(currentRow, 8).value = product.ritc || "";
        worksheet.getCell(currentRow, 9).value = cargoWeightMT || "";
        worksheet.getCell(currentRow, 9).numFormat = '#,##0.0';
        worksheet.getCell(currentRow, 10).value = cnt.grWtPlusTrWt ? Number(cnt.grWtPlusTrWt) / 1000 : "";
        worksheet.getCell(currentRow, 10).numFormat = '#,##0.0';
        worksheet.getCell(currentRow, 11).value = "NO";
        worksheet.getCell(currentRow, 12).value = invoice.invoiceValue ? Number(invoice.invoiceValue) : "";
        worksheet.getCell(currentRow, 12).numFormat = '#,##0.00';
        worksheet.getCell(currentRow, 13).value = formatDate(statusDetails.leoDate);
        worksheet.getCell(currentRow, 14).value = cnt.sealNo || "";

        // Alignments
        worksheet.getRow(currentRow).eachCell((cell, colNum) => {
          cell.font = cell.font || { name: "Arial", size: 9 };
          if (colNum === 2) cell.font.bold = true;
          cell.alignment = { vertical: "middle", horizontal: colNum === 7 ? "left" : "center", wrapText: true };
        });

        currentRow++;
      });

      // Total Row
      worksheet.getRow(currentRow).height = 24;
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "Total:";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "right" };

      worksheet.getCell(`F${currentRow}`).value = totalPackages || "";
      worksheet.getCell(`F${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`F${currentRow}`).numFormat = '#,##0';
      worksheet.getCell(`F${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell(`I${currentRow}`).value = totalCargoWeight || "";
      worksheet.getCell(`I${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`I${currentRow}`).numFormat = '#,##0.0';
      worksheet.getCell(`I${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells(`J${currentRow}:N${currentRow}`);

      currentRow++;

      // Declarations and Acceptances
      worksheet.getRow(currentRow).height = 18;
      worksheet.mergeCells(`A${currentRow}:N${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "(Accepted on said to contain Basis)";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", size: 8, italic: true };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "left" };
      currentRow++;

      const declarations = [
        "1. I declare that each consignment is of value Rs._________________ and engage**/do not engage** to pay percentage charge on excess value for the increased risk as required by CONCOR...",
        "   Alternative CONCOR risk and Owner's risk being available, I elect to pay ________________ rates.",
        "2. Please declare whether above container/contains high value cargo YES/NO",
        "3. I do hereby certify that I have satisfied myself that the description, marks & weights or quantity of goods consigned by me have been correctly entered in the Forwarding Note..."
      ];
      declarations.forEach(line => {
        worksheet.getRow(currentRow).height = 18;
        worksheet.mergeCells(`A${currentRow}:N${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = line;
        worksheet.getCell(`A${currentRow}`).font = { name: "Arial", size: 8 };
        worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "left" };
        currentRow++;
      });

      worksheet.getRow(currentRow).height = 32;
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "Tick the appropriate option shown above.";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", size: 8 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "top", horizontal: "left" };

      worksheet.mergeCells(`H${currentRow}:N${currentRow}`);
      worksheet.getCell(`H${currentRow}`).value = `Signature & Seal of the Customer\nDATE: ${formatDate(new Date())}`;
      worksheet.getCell(`H${currentRow}`).font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell(`H${currentRow}`).alignment = { vertical: "top", horizontal: "right", wrapText: true };
      currentRow++;

      // Terms and Conditions
      worksheet.getRow(currentRow).height = 20;
      worksheet.mergeCells(`A${currentRow}:N${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "TERMS AND CONDITIONS";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };
      currentRow++;

      const terms = [
        "1. Unless the consignor declares in clause(1) overleaf the value of any consignment & pays percentage charge on excess value as required by CONCOR, the maximum limit of liability shall not exceed Rs. 50 per kg.",
        "2. When alternative 'CONCOR Risk' and 'Owner Risk' rates are quoted, the latter will apply unless sender elects 'CONCOR Risk'.",
        "3. I accept responsibility for any consequences to the property of CONCOR or others caused by this consignment Note - Attention is invited to terms for dangerous goods in I.R.C.A Red Tariff and IMDG."
      ];
      terms.forEach(line => {
        worksheet.getRow(currentRow).height = 18;
        worksheet.mergeCells(`A${currentRow}:N${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = line;
        worksheet.getCell(`A${currentRow}`).font = { name: "Arial", size: 8 };
        worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "left" };
        currentRow++;
      });

      // Additional declarations
      worksheet.getRow(currentRow).height = 24;
      worksheet.mergeCells(`A${currentRow}:N${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "Additional declarations for Dangerous Goods (I.R.C.A / IMDG)";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 9 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "left" };
      currentRow++;

      // Office use
      worksheet.getRow(currentRow).height = 36;
      worksheet.mergeCells(`A${currentRow}:N${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "FOR OFFICE USE ONLY";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "top", horizontal: "left" };
      currentRow++;

      // Borders
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      for (let r = 4; r < currentRow; r++) {
        const rowObj = worksheet.getRow(r);
        for (let c = 1; c <= 14; c++) {
          rowObj.getCell(c).border = borderStyle;
        }
      }

      // Write buffer and save
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `CONCOR_Forwarding_Note_${jobNo}.xlsx`);
    } catch (error) {
      console.error("Error generating CONCOR Excel:", error);
      alert("Failed to generate CONCOR Excel file.");
    }
  };

  const handleDownloadFNTable = async () => {
    setChoiceOpen(false);
    if (!jobData) {
      alert("No job data loaded.");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("FN Table");

      // Column Widths for 14 columns
      worksheet.columns = [
        { width: 5 },   // A: Sr No
        { width: 18 },  // B: Container No
        { width: 10 },  // C: Type
        { width: 8 },   // D: Size
        { width: 12 },  // E: Tare Wt
        { width: 12 },  // F: No of Packages
        { width: 35 },  // G: Commodity Name
        { width: 14 },  // H: HSN Code
        { width: 12 },  // I: Cargo Wt (MT)
        { width: 12 },  // J: VGM
        { width: 12 },  // K: Hazardous
        { width: 14 },  // L: Value/FOB
        { width: 14 },  // M: LEO Dt
        { width: 16 }   // N: Seal No
      ];

      // Headers
      const tableHeaders = ["Sr. No.", "CONTAINER NO.", "TYPE", "SIZE", "TARE WT.", "NO. OF PACKAGES", "COMMODITY NAME", "COMMODITY HSN CODE", "CARGO WT (In MTS)", "VGM", "HAZARDOUS", "VALUE/FOB", "LEO DT", "SEAL NO."];
      worksheet.getRow(1).height = 28;
      tableHeaders.forEach((h, cidx) => {
        const cell = worksheet.getCell(1, cidx + 1);
        cell.value = h;
        cell.font = { name: "Arial", bold: true, size: 9 };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
      });

      // Containers Rows
      let currentRow = 2;
      let totalPackages = 0;
      let totalCargoWeight = 0;

      const containers = jobData.containers || [];
      const invoice = jobData.invoices?.[0] || {};
      const product = invoice.products?.[0] || {};
      const statusDetails = (jobData.operations?.[0]?.statusDetails?.[0]) || {};

      containers.forEach((cnt, i) => {
        worksheet.getRow(currentRow).height = 45;
        const pkgs = Number(cnt.pkgsStuffed) || 0;
        const weight = Number(cnt.grossWeight) || 0;
        const cargoWeightMT = weight / 1000;
        const tareWeight = Number(cnt.tareWeightKgs) || 0;
        const sizeMatch = (cnt.type || "").match(/^(\d+)/);
        const size = sizeMatch ? sizeMatch[1] : "";

        totalPackages += pkgs;
        totalCargoWeight += cargoWeightMT;

        worksheet.getCell(currentRow, 1).value = i + 1;
        worksheet.getCell(currentRow, 2).value = cnt.containerNo || "";
        worksheet.getCell(currentRow, 3).value = cnt.sealType || "RFID";
        worksheet.getCell(currentRow, 4).value = size;
        worksheet.getCell(currentRow, 5).value = tareWeight || "";
        worksheet.getCell(currentRow, 5).numFormat = '#,##0';
        worksheet.getCell(currentRow, 6).value = pkgs || "";
        worksheet.getCell(currentRow, 6).numFormat = '#,##0';
        worksheet.getCell(currentRow, 7).value = product.description || "";
        worksheet.getCell(currentRow, 8).value = product.ritc || "";
        worksheet.getCell(currentRow, 9).value = cargoWeightMT || "";
        worksheet.getCell(currentRow, 9).numFormat = '#,##0.0';
        worksheet.getCell(currentRow, 10).value = cnt.grWtPlusTrWt ? Number(cnt.grWtPlusTrWt) / 1000 : "";
        worksheet.getCell(currentRow, 10).numFormat = '#,##0.0';
        worksheet.getCell(currentRow, 11).value = "NO";
        worksheet.getCell(currentRow, 12).value = invoice.invoiceValue ? Number(invoice.invoiceValue) : "";
        worksheet.getCell(currentRow, 12).numFormat = '#,##0.00';
        worksheet.getCell(currentRow, 13).value = formatDate(statusDetails.leoDate);
        worksheet.getCell(currentRow, 14).value = cnt.sealNo || "";

        // Alignments
        worksheet.getRow(currentRow).eachCell((cell, colNum) => {
          cell.font = cell.font || { name: "Arial", size: 9 };
          if (colNum === 2) cell.font.bold = true;
          cell.alignment = { vertical: "middle", horizontal: colNum === 7 ? "left" : "center", wrapText: true };
        });

        currentRow++;
      });

      // Total Row
      worksheet.getRow(currentRow).height = 24;
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = "Total:";
      worksheet.getCell(`A${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "right" };

      worksheet.getCell(`F${currentRow}`).value = totalPackages || "";
      worksheet.getCell(`F${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`F${currentRow}`).numFormat = '#,##0';
      worksheet.getCell(`F${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.getCell(`I${currentRow}`).value = totalCargoWeight || "";
      worksheet.getCell(`I${currentRow}`).font = { name: "Arial", bold: true, size: 10 };
      worksheet.getCell(`I${currentRow}`).numFormat = '#,##0.0';
      worksheet.getCell(`I${currentRow}`).alignment = { vertical: "middle", horizontal: "center" };

      worksheet.mergeCells(`J${currentRow}:N${currentRow}`);

      currentRow++;

      // Apply borders
      const borderStyle = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      for (let r = 1; r < currentRow; r++) {
        const rowObj = worksheet.getRow(r);
        for (let c = 1; c <= 14; c++) {
          rowObj.getCell(c).border = borderStyle;
        }
      }

      // Write buffer and save
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `FN_Table_${jobNo}.xlsx`);
    } catch (error) {
      console.error("Error generating CONCOR FN Table Excel:", error);
      alert("Failed to generate FN Table Excel file.");
    }
  };

  const handleEdit = () => {
    setChoiceOpen(false);
    setEditorOpen(true);
  };

  const saveEditedPdf = async (editedHtmlContent) => {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const leftMargin = 5;
    const rightMargin = 5;
    const contentWidth = pageWidth - leftMargin - rightMargin; // 287mm

    await doc.html(editedHtmlContent, {
      callback: function (doc) {
        window.open(doc.output("bloburl"), "_blank");
      },
      x: leftMargin,
      y: 5,
      width: contentWidth,
      windowWidth: 1150,
      autoPaging: "slice",
    });
  };

  return (
    <>
      {children ? (
        React.cloneElement(children, {
          onClick: (e) => {
            e.stopPropagation();
            if (children.props.onClick) children.props.onClick(e);
            handleAction(e);
          }
        })
      ) : (
        <MenuItem onClick={handleAction}>Concor Forwarding Note (PDF)</MenuItem>
      )}

      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)}>
        <DialogTitle>Document Action</DialogTitle>
        <DialogContent>
          <div>Do you want to edit the CONCOR document inline, download PDF, or download Excel?</div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChoiceOpen(false)}>Cancel</Button>
          <Button onClick={handleEdit} color="primary" variant="outlined">Edit</Button>
          <Button onClick={downloadDirectly} color="primary" variant="contained">Download PDF</Button>
          <Button onClick={handleDownloadExcel} color="success" variant="contained">Download Excel</Button>
          <Button onClick={handleDownloadFNTable} color="warning" variant="contained">Download FN Table</Button>
        </DialogActions>
      </Dialog>

      <DocumentEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initialContent={htmlContent}
        title={`Concor Forwarding Note - ${jobNo}`}
        customSave={saveEditedPdf}
      />
    </>
  );
};

export default ConcorForwardingNotePDFGenerator;