import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { IconButton, Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { calculateProductFobINR } from "../../../../utils/fobCalculations.js";

const ExportChecklistGenerator = ({
  jobNo,
  renderAsIcon = false,
  children,
}) => {
  // ==================== CONSTANTS ====================
  const PAGE_CONFIG = {
    width: 595.28,
    height: 841.89,
    margins: {
      left: 20,
      right: 20,
      top: 25,
      bottom: 30,
    },
  };
  const safeSplitText = (text, width) => {
    if (!text || typeof text !== "string") return [""];
    return pdf.splitTextToSize(text, width);
  };
  const FONT_SIZES = {
    title: 14,
    sectionHeader: 11,
    fieldLabel: 8,
    fieldValue: 9,
    footer: 8,
    declaration: 10,
    tableHeader: 9,
    tableContent: 8,
  };

  // ==================== HELPER FUNCTIONS ====================

  const formatDate = (dateString) => {
    if (!dateString) return "";

    // Handle DD-MM-YYYY or DD-MM-YYYY HH:mm format
    if (typeof dateString === "string" && dateString.includes("-")) {
      const parts = dateString.split(" ");
      const datePart = parts[0];
      const dateComponents = datePart.split("-");

      if (dateComponents.length === 3) {
        // Check if first component is year or day
        if (dateComponents[0].length === 4) {
          // YYYY-MM-DD
          const d = new Date(dateString);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          }
        } else {
          // DD-MM-YYYY
          const day = parseInt(dateComponents[0], 10);
          const month = parseInt(dateComponents[1], 10) - 1;
          const year = parseInt(dateComponents[2], 10);
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          }
        }
      }
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if still invalid

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };


  const createPDFHelpers = (pdf) => {
    const centerX = PAGE_CONFIG.width / 2;
    const rightX = PAGE_CONFIG.width - PAGE_CONFIG.margins.right;
    const leftX = PAGE_CONFIG.margins.left;

    return {
      drawLine: (x1, y, x2, lineWidth = 0.6) => {
        pdf.setLineWidth(lineWidth);
        pdf.line(x1, y, x2, y);
      },

      drawField: (label, value, x, y, labelWidth = 90, maxWidth = 250) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(`${label}: `, x, y);

        if (value) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(FONT_SIZES.fieldValue);

          const valueStr = value.toString();
          const valueX = x + labelWidth;
          const availableWidth = maxWidth - labelWidth;

          const textLines = pdf.splitTextToSize(valueStr, availableWidth);
          pdf.text(textLines, valueX, y);
          return y + textLines.length * 13;
        }

        return y + 13;
      },

      addHeader: (
        pageNum,
        totalPages,
        customStation,
        aeoRegistrationNo,
        aeoRole,
        currentDate
      ) => {
        let y = PAGE_CONFIG.margins.top;

        // Line 1: Firm Name Center
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(FONT_SIZES.title);
        pdf.text("SURAJ FORWARDERS & SHIPPING AGENCIES", centerX, y, {
          align: "center",
        });

        // Left below firm name, Custom Station
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(`Custom stn: ${customStation || ""} `, leftX, y + 13);

        // Center below firm name, Section Title
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(FONT_SIZES.sectionHeader);
        pdf.text("Checklist for Shipping Bill", centerX, y + 13, {
          align: "center",
        });

        // Right, Page Number
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(`${pageNum}/${totalPages}`, rightX, y + 13, {
          align: "right",
        });

        // --- Next Line: Printed On (Left), AEO Reg. No (Center), AEO Role (Right)
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(`Printed On : ${currentDate || ""}`, leftX, y + 40);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(FONT_SIZES.fieldValue);
        pdf.text(
          `AEO Registration No. ${aeoRegistrationNo || ""}`,
          centerX,
          y + 40,
          { align: "center" }
        );

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(`AEO Role : ${aeoRole || ""}`, rightX, y + 40, {
          align: "right",
        });
      },

      centerX,
      rightX,
      leftX,
    };
  };

  // ==================== PAGE RENDERERS ====================

  const renderPage1 = (pdf, helpers, data) => {
    const { drawLine, drawField, leftX, rightX, centerX } = helpers;
    let yPos = 80;

    const leftColX = leftX;
    const rightColX = centerX + 20;
    const colWidth = 250;

    // First horizontal line
    drawLine(leftX, yPos, rightX);
    yPos += 8;

    // First row: SB No./Date and Party Ref on same line
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.fieldLabel);
    pdf.text("SB No. / Date", leftColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZES.fieldValue);
    pdf.text(`${data.sbNumber} dt ${data.sbDate}`, leftColX + 85, yPos);

    pdf.setFont("helvetica", "bold");
    pdf.text("Party Ref", rightColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.partyRef, rightColX + 60, yPos);

    yPos += 12;

    // Second row: Job No and CONSIGNEE on same line
    pdf.setFont("helvetica", "bold");
    pdf.text("Job No", leftColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.jobNumber, leftColX + 50, yPos);

    yPos += 12;

    // Third row: CHA only on left side
    pdf.setFont("helvetica", "bold");
    pdf.text("CHA", leftColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.chaCode, leftColX + 35, yPos);

    yPos += 15;

    // EXPORTER DETAILS (Left Column) and CONSIGNEE details (Right Column)
    // Left Column: EXPORTER DETAILS
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.fieldLabel);
    pdf.text("EXPORTER DETAILS", leftColX, yPos);

    pdf.setFont("helvetica", "bold");
    pdf.text("CONSIGNEE", rightColX, yPos);
    pdf.setFont("helvetica", "normal");

    let exporterY = yPos + 10;
    const exporterLines = [
      data.exporterGstin,
      data.exporterGstinFull,
      data.exporterPan,
      data.exporterType,
      data.exporterName,
      data.exporterBranch,
      data.exporterAddress1,
      data.exporterAddress2,
      data.exporterAddress3,
    ];

    exporterLines.forEach((line) => {
      if (line) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldValue);
        // Wrap text to fit within left column (max width ~250px)
        const splitLines = pdf.splitTextToSize(line, 250);
        pdf.text(splitLines, leftColX, exporterY);
        exporterY += splitLines.length * 9;
      }
    });

    // Right Column: CONSIGNEE details - start from same Y position as exporter
    let consigneeY = yPos + 10; // Start at same Y as exporter details
    const consigneeLines = [
      data.consigneeName,
      data.consigneeAddress,
      data.consigneeCountry1,
      data.consigneeCountry2,
    ];

    consigneeLines.forEach((line) => {
      if (line) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldValue);
        const splitLines = pdf.splitTextToSize(line, 250);
        pdf.text(splitLines, rightColX, consigneeY);
        consigneeY += splitLines.length * 9;
      }
    });

    // Move yPos to the bottom of whichever column is longer
    yPos = Math.max(exporterY, consigneeY) + 8;

    // Continue with the rest of the code...
    const leftFields = [
      { label: "Port Of Loading", value: data.portOfLoading },
      { label: "Port Of Discharge", value: data.portOfDischarge },
      { label: "Port Of Destination", value: data.portOfDestination },
      { label: "Discharge Country", value: data.dischargeCountry },
      { label: "Country of Dest", value: data.countryOfDest },
      { label: "Master BL No.", value: data.masterBlNo },
      { label: "House BL No.", value: data.houseBlNo },
      { label: "Rotation No/Dt.", value: data.rotationNo },
      { label: "State of Origin", value: data.stateOfOrigin },
      { label: "Ad. Code", value: data.adCode },
      { label: "Forex Bank A/c No", value: data.forexBankAcNo },
      { label: "RBI Waiver No/Dt", value: data.rbiWaiverNo },
      { label: "DBK Bank A/c No", value: data.dbkBankAcNo },
    ];

    const rightFields = [
      { label: "Nature of Cargo", value: data.natureOfCargo },
      { label: "Total Packages", value: data.totalPackages },
      { label: "No Of Cntnrs", value: data.numberOfContainers },
      { label: "Loose pkts.", value: data.loosePackets },
      { label: "Gross Weight", value: data.grossWeight },
      { label: "Net Weight", value: data.netWeight },
      { label: "Total FOB (INR)", value: data.totalFobInr },
      { label: "IGST Taxable Value(INR)", value: data.igstTaxableValue },
      { label: "IGST Amount(INR)", value: data.igstAmount },
      { label: "Comp. Cess (INR)", value: data.compCess },
      { label: data.dbkStrLabel || "DBK (INR)", value: data.dbkStr },
      { label: "Total DBK (INR)", value: data.totalDbk },
      { label: "RODTEP Amount(INR)", value: data.rodtepAmount },
    ];

    let leftY = yPos;
    let rightY = yPos;

    // Draw both columns of main data
    // Draw both columns of main data
    const maxRows = Math.max(leftFields.length, rightFields.length);
    for (let i = 0; i < maxRows; i++) {
      let rowHeight = 12;

      if (leftFields[i]) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(leftFields[i].label, leftColX, leftY);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldValue);
        const val = String(leftFields[i].value || "");
        const splitVal = pdf.splitTextToSize(val, 140);
        pdf.text(splitVal, leftColX + 100, leftY);
        rowHeight = Math.max(rowHeight, splitVal.length * 10 + 2);
      }

      if (rightFields[i]) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(rightFields[i].label, rightColX, rightY);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldValue);
        const val = String(rightFields[i].value || "");
        const splitVal = pdf.splitTextToSize(val, 140);
        pdf.text(splitVal, rightColX + 100, rightY);
        rowHeight = Math.max(rowHeight, splitVal.length * 10 + 2);
      }

      leftY += rowHeight;
      rightY += rowHeight;
    }

    yPos = leftY + 8;

    // Invoice Details section - Loop through ALL invoices
    (data.invoicesDetail || []).forEach((inv, invIdx) => {
      // Check if we need a new page if too many invoices
      if (yPos > 680) {
        pdf.addPage();
        helpers.addHeader(
          pdf.internal.getNumberOfPages(),
          4,
          data.customStation,
          data.aeoRegistrationNo,
          data.aeoRole,
          data.currentDate
        );
        yPos = 80;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(FONT_SIZES.fieldValue);
      pdf.text(
        `Invoice Details: Invoice ${invIdx + 1} / ${data.invoicesDetail.length}`,
        leftColX,
        yPos
      );
      yPos += 12;

      // Invoice fields in two columns
      const invoiceLeftFields = [
        { label: "Inv. No", value: inv.invoiceNo },
        { label: "Inv. Date", value: inv.invoiceDate },
        { label: "Nature of contract", value: inv.natureOfContract },
        { label: "Unit Price Includes", value: inv.unitPriceIncludes },
        { label: "Inv. Currency", value: inv.invoiceCurrency },
      ];

      const invoiceRightFields = [
        { label: "Inv. Value", value: inv.invoiceValue },
        { label: "FOB Value", value: inv.fobValue },
        { label: "Exp Contract No.", value: inv.expContractNo },
        { label: "Exp Contract Date", value: inv.expContractDate },
        { label: "Exch. Rate", value: inv.exchangeRate },
      ];

      let invoiceLeftY = yPos;
      let invoiceRightY = yPos;

      for (let i = 0; i < 5; i++) {
        let rowHeight = 12;

        // Left Side
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(invoiceLeftFields[i].label, leftColX, invoiceLeftY);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldValue);
        const leftVal = String(invoiceLeftFields[i].value || "");
        const leftSplit = pdf.splitTextToSize(leftVal, 160);
        pdf.text(leftSplit, leftColX + 80, invoiceLeftY);
        rowHeight = Math.max(rowHeight, leftSplit.length * 10 + 2);

        // Right Side
        pdf.setFont("helvetica", "bold");
        pdf.text(invoiceRightFields[i].label, rightColX, invoiceRightY);

        pdf.setFont("helvetica", "normal");
        const rightVal = String(invoiceRightFields[i].value || "");
        const rightSplit = pdf.splitTextToSize(rightVal, 160);
        pdf.text(rightSplit, rightColX + 80, invoiceRightY);
        rowHeight = Math.max(rowHeight, rightSplit.length * 10 + 2);

        invoiceLeftY += rowHeight;
        invoiceRightY += rowHeight;
      }

      yPos = invoiceLeftY + 8;

      // Rate table header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(FONT_SIZES.tableHeader);
      pdf.text("Rate", leftColX + 80, yPos);
      pdf.text("Currency", leftColX + 150, yPos);
      pdf.text("Amount", leftColX + 220, yPos);
      yPos += 10;

      const rateItemsData = [
        { label: "Insurance", ...inv.insuranceData },
        { label: "Freight", ...inv.freightData },
        { label: "Discount", ...inv.discountData },
        { label: "Commission", ...inv.commissionData },
        { label: "Other Deduction", ...inv.otherDeductionData },
        { label: "Packing Charges", ...inv.packingChargesData },
      ];

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(FONT_SIZES.tableContent);

      rateItemsData.forEach((item) => {
        pdf.text(item.label, leftColX, yPos);
        const rateText =
          item.rate !== "" && item.rate !== null && item.rate !== undefined
            ? String(item.rate)
            : "";
        const currencyText =
          item.currency !== "" &&
            item.currency !== null &&
            item.currency !== undefined
            ? String(item.currency)
            : "";
        const amountText =
          item.amount !== "" && item.amount !== null && item.amount !== undefined
            ? String(item.amount)
            : "";

        pdf.text(rateText, leftColX + 80, yPos);
        pdf.text(currencyText, leftColX + 150, yPos);
        pdf.text(amountText, leftColX + 220, yPos);
        yPos += 10;
      });

      yPos += 15;
    });


    yPos += 5;
    yPos += 12;

    // Nature Of Payment and Period Of Payment on same line - exactly like first image
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.fieldLabel);
    pdf.text("Nature Of Payment", leftColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZES.fieldValue);
    pdf.text(data.natureOfPayment, leftColX + 100, yPos);

    pdf.setFont("helvetica", "bold");
    pdf.text("Period Of Payment", rightColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.periodOfPayment, rightColX + 90, yPos);

    yPos += 12;

    // Marks & Nos - exactly like first image
    pdf.setFont("helvetica", "bold");
    pdf.text("Marks & Nos", leftColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.marksAndNos, leftColX + 70, yPos);
    yPos += 12;

    yPos += 5;
    yPos += 12;

    // Buyer's Name & Address section - exactly like first image
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.fieldLabel);
    pdf.text("Buyer's Name & Address", leftColX, yPos);
    yPos += 12;

    // Buyer address on left side
    const buyerLines = pdf.splitTextToSize(data.buyerName, colWidth - 20);
    buyerLines.forEach((line) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(FONT_SIZES.fieldValue);
      pdf.text(line, leftColX, yPos);
      yPos += 10;
    });

    // AEO details and Third Party on right side - exactly like first image
    let rightDetailsY = yPos - buyerLines.length * 10 - 5; // Align with buyer details start

    const rightDetails = [
      { label: "AEO Code", value: data.buyerAeoCode },
      { label: "AEO Country", value: data.buyerAeoCountry },
      { label: "AEO Role", value: data.buyerAeoRole },
      {
        label: "Third Party Name & Addr.",
        value: data.thirdPartyDetails,
      },
    ];

    rightDetails.forEach((detail) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(FONT_SIZES.fieldLabel);
      pdf.text(detail.label, rightColX, rightDetailsY);

      if (detail.value) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldValue);
        const valueLines = pdf.splitTextToSize(detail.value, colWidth - 130);
        valueLines.forEach((line, index) => {
          pdf.text(line, rightColX + 120, rightDetailsY + index * 9);
        });
        rightDetailsY += Math.max(valueLines.length * 9, 12);
      } else {
        rightDetailsY += 12;
      }
    });

    yPos = Math.max(yPos, rightDetailsY) + 8;

    // EOU Details - exactly like first image
    pdf.setFont("helvetica", "bold");
    pdf.text("EOU IEC", leftColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.eou, leftColX + 50, yPos);

    pdf.setFont("helvetica", "bold");
    pdf.text("Branch Sno", leftColX + 200, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.branchSno, leftColX + 260, yPos);

    yPos += 12;

    pdf.setFont("helvetica", "bold");
    pdf.text("Factory Address", leftColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.factoryAddress, leftColX + 80, yPos);

    return yPos + 20;
  };

  // ==================== NEW PAGE FOR ITEM DETAILS ====================
  const renderItemDetailsPage = (pdf, helpers, data) => {
    const { drawLine, leftX, rightX } = helpers;
    let yPos = 80;

    // ITEM DETAILS Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("ITEM DETAILS", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 12;

    // Define column positions
    const col1 = leftX + 10; // SI No, Qty, Unit
    const col2 = leftX + 60; // RITC, Exim Scheme, NFEI Catg, Reward Item
    const col3 = leftX + 160; // Description
    const col4 = leftX + 240; // Unit Price/Unit, FOB ValFC
    const col5 = leftX + 320; // FOB ValINR
    const col6 = leftX + 410; // Total ValueFC, IGST Pymt Status
    const col7 = leftX + 500; // PMV/Unit, IGST Taxable Value

    // ITEM DETAILS Table Headers - PROPERLY ALIGNED
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.tableHeader);

    // Column 1: SI No, Qty, Unit
    pdf.text("SI No", col1, yPos);
    pdf.text("Qty", col1, yPos + 10);
    pdf.text("Unit", col1, yPos + 20);

    // Column 2: RITC, Exim Scheme Code description, NFEI Catg, Reward Item
    pdf.text("RITC", col2, yPos);
    pdf.text("Exim Scheme Code description", col2, yPos + 10);
    pdf.text("NFEI Catg", col2, yPos + 20);
    pdf.text("Reward Item", col2, yPos + 30);

    // Column 3: Description (single row spanning height)
    pdf.text("Description", col3, yPos);

    // Column 4: Unit Price/Unit, FOB ValFC
    pdf.text("Unit Price Unit", col3, yPos + 20);
    pdf.text("FOB ValFC", col3, yPos + 30);

    // Column 5: FOB ValINR - single row
    pdf.text("FOB ValINR", col4, yPos + 30);

    // Column 6: Total ValueFC, IGST Pymt Status
    pdf.text("Total ValueFC", col5, yPos + 20);
    pdf.text("IGST Pymt Status", col5, yPos + 30);

    // Column 7: PMV/Unit, IGST Taxable Value
    pdf.text("PMV/Unit", col6, yPos + 20);
    pdf.text("IGST Taxable Value", col6, yPos + 30);

    // Column 8: Total PMV INR, IGST Amount
    pdf.text("Total PMV INR", col7, yPos + 20);
    pdf.text("IGST Amount", col7, yPos + 30);

    yPos += 40; // Increased for multi-row headers
    drawLine(leftX, yPos, rightX);
    yPos += 12;

    // Item Data - 100% SAFE PURE DATABASE DATA ONLY
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZES.tableContent);

    if (data.products && data.products.length > 0) {
      data.products.forEach((product, index) => {
        const itemY = yPos;

        // Column 1: SI No, Qty, Unit - PURE DATA
        pdf.text(product.serialNumber || (index + 1).toString(), col1, itemY);
        pdf.text(product.quantity || "", col1, itemY + 10);
        pdf.text(product.qtyUnit || product.unit || "", col1, itemY + 20);

        // Column 2: RITC, Exim Scheme, NFEI Catg, Reward Item - PURE DATA
        pdf.text(product.ritc || "", col2, itemY);
        pdf.text(product.eximCode || "", col2, itemY + 10);
        pdf.text(product.nfeiCategory || "", col2, itemY + 20);
        pdf.text(product.rewardItem ? "Yes" : "No", col2, itemY + 30);

        // Column 3: Description - PURE DATA
        const description = product.description || "";
        const descriptionLines = pdf.splitTextToSize(description, 90);
        pdf.text(descriptionLines, col3, itemY);

        // Unit Price and FOB ValFC - SAFE (adjust Y based on description height)
        const unitPriceY = itemY + descriptionLines.length * 10;
        pdf.text(
          `${product.unitPrice || ""}/${product.priceUnit || product.qtyUnit || "PCS"}/${product.per || "1"}`,
          col3,
          unitPriceY
        );
        pdf.text(
          product.fobValueFC || product.amount || "",
          col3,
          unitPriceY + 20
        );

        // Column 5: FOB ValINR - PURE DATA
        pdf.text(product.fobValueINR || "", col4, itemY + 20);

        // Column 6: Total ValueFC, IGST Pymt Status - PURE DATA
        pdf.text(product.amount || "", col5, itemY);
        pdf.text(
          product.igstPaymentStatus ||
          product.igstCompensationCess?.igstPaymentStatus ||
          "",
          col5,
          itemY + 20
        );

        // Column 7: PMV/Unit, IGST Taxable Value - PURE DATA
        pdf.text(
          product.pmvPerUnit || product.pmvInfo?.pmvPerUnit || "",
          col6,
          itemY
        );
        pdf.text(
          product.taxableValueINR ||
          product.igstCompensationCess?.taxableValueINR ||
          "",
          col6,
          itemY + 20
        );

        // Column 8: Total PMV INR, IGST Amount - PURE DATA
        pdf.text(
          product.totalPMV || product.pmvInfo?.totalPMV || "",
          col7,
          itemY
        );
        pdf.text(
          product.igstAmountINR ||
          product.igstCompensationCess?.igstAmountINR ||
          "",
          col7,
          itemY + 20
        );

        // Calculate height needed for this item based on description lines
        const itemHeight = Math.max(35, (descriptionLines.length + 3) * 10);
        yPos += itemHeight;

        // Add separator line between items
        if (index < data.products.length - 1) {
          drawLine(leftX, yPos, rightX);
          yPos += 8;
        }
      });
    } else {
      // EMPTY TABLE - No hardcoded default data, just spacing
      yPos += 10;
    }

    // Totals section - PURE DATA
    yPos += 5;
    yPos += 12;
    pdf.setFont("helvetica", "bold");
    drawLine(leftX, yPos + 20, rightX);
    pdf.setFontSize(FONT_SIZES.tableContent);
    yPos += 30;

    // Align totals to the right - PURE DATA
    pdf.text("Total PMV", rightX - 150, yPos);
    pdf.text(data.totalPmv || "", rightX - 50, yPos);
    yPos += 10;
    pdf.text("Total IGST", rightX - 150, yPos);
    pdf.text(data.totalIgst || "", rightX - 50, yPos);
    yPos += 10;
    pdf.text("Total PMV Gross", rightX - 150, yPos);
    pdf.text(data.totalPmvGross || "", rightX - 50, yPos);
    yPos += 10;
    pdf.text("Total IGST Gross", rightX - 150, yPos);
    pdf.text(data.totalIgstGross || "", rightX - 50, yPos);

    return yPos + 20;
  };

  // Update the renderPage2 function to remove ITEM DETAILS and keep only DBK, VESSEL, CONTAINER details
  const renderPage2 = (pdf, helpers, data) => {
    const { drawLine, drawField, leftX, rightX } = helpers;
    let yPos = 80;

    // DBK DETAILS SECTION
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("DBK DETAILS", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    // AutoTable for DBK Details
    const dbkHeaders = [
      "Inv No",
      "Item No",
      "DBK SI No",
      "DBK Rate",
      "DBK Qty / Unit",
      "DBK Amount",
      "DBK SPE",
    ];

    const dbkRows = Array.isArray(data.dbkData) ? data.dbkData : [data.dbkData];

    pdf.autoTable({
      head: [dbkHeaders],
      body: dbkRows.map((row) => [
        row.invNo,
        row.itemNo,
        row.dbkSlNo,
        row.dbkRate,
        row.dbkQtyUnit,
        row.dbkAmount,
        row.dbkSPE,
      ]),
      startY: yPos,
      styles: {
        fontSize: FONT_SIZES.tableContent,
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: 0,
        fontStyle: "bold",
        fontSize: FONT_SIZES.tableHeader,
      },
      margin: { left: leftX },
      tableWidth: rightX - leftX,
    });

    yPos = pdf.lastAutoTable.finalY + 18;

    // ROSCTL DETAILS SECTION (Only if data exists)
    if (data.rosctlData && data.rosctlData.length > 0) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(FONT_SIZES.sectionHeader);
      pdf.text("ROSCTL DETAILS", leftX, yPos);
      yPos += 10;
      drawLine(leftX, yPos, rightX);
      yPos += 17;

      const rosctlHeaders = [
        "Inv No",
        "Item No",
        "Tariff Item",
        "Cat",
        "SL Rate",
        "SL Cap",
        "CTL Rate",
        "CTL Cap",
        "Amount",
      ];

      pdf.autoTable({
        head: [rosctlHeaders],
        body: data.rosctlData.map((row) => [
          row.invNo,
          row.itemNo,
          row.tariffItem,
          row.category,
          row.slRate,
          row.slCap,
          row.ctlRate,
          row.ctlCap,
          row.amount,
        ]),
        startY: yPos,
        styles: {
          fontSize: FONT_SIZES.tableContent,
          cellPadding: 2,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: 0,
          fontStyle: "bold",
          fontSize: FONT_SIZES.tableHeader,
        },
        margin: { left: leftX },
        tableWidth: rightX - leftX,
      });

      yPos = pdf.lastAutoTable.finalY + 18;
    }

    // VESSEL DETAILS
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("VESSEL DETAILS", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    const vesselFields = [
      { label: "Factory Stuffed", value: data.factoryStuffed },
      { label: "Seal Type", value: data.sealType },
      { label: "Sample Acc.", value: data.sampleAcc },
      { label: "Vessel Name", value: data.vesselName },
      { label: "Voyage Number", value: data.voyageNumber },
    ];

    vesselFields.forEach((field) => {
      yPos = drawField(field.label, field.value, leftX, yPos, 160);
      yPos += 9;
    });

    yPos += 9;

    // CONTAINER DETAILS
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("CONTAINER DETAILS", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    const containerHeaders = [
      "Container No",
      "Size",
      "Type",
      "Seal No",
      "Seal Type",
      "Seal Date",
      "Seal Device ID",
    ];

    const containerRows = Array.isArray(data.containers)
      ? data.containers
      : [data.containers];

    pdf.autoTable({
      head: [containerHeaders],
      body: containerRows.map((containers) => [
        containers.containerNo,
        containers.size,
        containers.type,
        containers.sealNo,
        containers.sealType,
        containers.sealDate,
        containers.sealDeviceID,
      ]),
      startY: yPos,
      styles: {
        fontSize: FONT_SIZES.tableContent,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: 0,
        fontStyle: "bold",
      },
      margin: { left: leftX },
      tableWidth: rightX - leftX,
    });

    yPos = pdf.lastAutoTable.finalY + 18;

    // Additional Details Table
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("Additional Details", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    const additionalHeaders = [
      "Inv/Item SLN",
      "SQC Qty/Unit",
      "Origin District",
      "Origin State",
      "Comp. Cess Amount",
      "PTA/FTA",
    ];

    const additionalRows = Array.isArray(data.additionalDetailsRows)
      ? data.additionalDetailsRows
      : [];

    pdf.autoTable({
      head: [additionalHeaders],
      body: additionalRows.map((row) => [
        row.invItemSln,
        row.sqcQtyUnit,
        row.originDistrict,
        row.originState,
        row.compCessAmount,
        row.ptaFta,
      ]),
      startY: yPos,
      styles: {
        fontSize: FONT_SIZES.tableContent,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: 0,
        fontStyle: "bold",
      },
      margin: { left: leftX },
      tableWidth: rightX - leftX,
    });

    yPos = pdf.lastAutoTable.finalY + 18;

    return yPos + 8;
  };

  // Update renderPage3 to start from where Page 2 left off
  const renderPage3 = (pdf, helpers, data) => {
    const { drawLine, drawField, leftX, rightX } = helpers;
    let yPos = 80;



    // END USE INFORMATION
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("END USE INFORMATION", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    const endUseHeaders = ["Inv / Item Sr.No.", "Code"];
    const endUseRows = Array.isArray(data.endUseData)
      ? data.endUseData
      : [data.endUseData];

    pdf.autoTable({
      head: [endUseHeaders],
      body: endUseRows.map((row) => [row.invItemSrNo, row.code]),
      startY: yPos,
      styles: {
        fontSize: FONT_SIZES.tableContent,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: 0,
        fontStyle: "bold",
      },
      margin: { left: leftX },
      tableWidth: 250,
    });

    yPos = pdf.lastAutoTable.finalY + 18;

    // RODTEP Info
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("RODTEP Info", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    const rodtepHeaders = [
      "Inv/Item Sr",
      "Claim Status",
      "Quantity",
      "Rate (in %)",
      "Cap Value",
      "No. of Units",
      "RODTEP Amount (INR)",
    ];

    const rodtepRows = Array.isArray(data.rodtepData)
      ? data.rodtepData
      : [data.rodtepData];

    pdf.autoTable({
      head: [rodtepHeaders],
      body: rodtepRows.map((row) => [
        row.invItemSr,
        row.claimStatus,
        row.quantity,
        row.rate,
        row.capValue,
        row.noOfUnits,
        row.rodtepAmount,
      ]),
      startY: yPos,
      styles: {
        fontSize: FONT_SIZES.tableContent,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: 0,
        fontStyle: "bold",
      },
      margin: { left: leftX },
      tableWidth: rightX - leftX,
    });

    yPos = pdf.lastAutoTable.finalY + 18;

    // DECLARATIONS
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("DECLARATIONS", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    const declarationHeaders = ["Decl. Typ", "Decl. Cod", "Inv / Item Sr.No."];
    const declarationRows = Array.isArray(data.declarationData)
      ? data.declarationData
      : [data.declarationData];

    pdf.autoTable({
      head: [declarationHeaders],
      body: declarationRows.map((decl) => [
        decl.declType,
        decl.declCode,
        decl.invItemSrNo,
      ]),
      startY: yPos,
      styles: {
        fontSize: FONT_SIZES.tableContent,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: 0,
        fontStyle: "bold",
      },
      margin: { left: leftX },
      tableWidth: 200,
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    // Declaration Text
    pdf.setFont("helvetica", "bold");
    pdf.text("Decl. Cod", leftX, yPos);
    pdf.text("Declaration", leftX + 50, yPos);
    yPos += 10;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZES.declaration);
    const declarationLines = pdf.splitTextToSize(
      data.declarationText,
      rightX - leftX - 50
    );
    declarationLines.forEach((line) => {
      pdf.text(line, leftX + 50, yPos);
      yPos += FONT_SIZES.declaration * 1.2;
    });

    return yPos + 8;
  };

  // Update renderPage4 for SUPPORTING DOCUMENTS
  const renderPage4 = (pdf, helpers, data) => {
    const { drawLine, leftX, rightX } = helpers;
    let yPos = 80;
    // INLINE SAFE SPLIT TEXT - No helpers dependency
    const safeSplitText = (text, width = 140) => {
      if (!text || typeof text !== "string") return [""];
      try {
        return pdf.splitTextToSize(text, width);
      } catch (e) {
        return [""];
      }
    };
    // SUPPORTING DOCUMENTS
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("SUPPORTING DOCUMENTS", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    // Define column positions
    const col1 = leftX + 5; // First column
    const col2 = leftX + 80; // Second column
    const col3 = leftX + 180; // Third column
    const col4 = leftX + 280; // Fourth column
    const col5 = leftX + 430; // Fifth column

    const rowHeight = 12;
    const headerSectionHeight = 60;

    // HEADERS SECTION - All headers in one section
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.tableHeader);
    let headerY = yPos;

    // Column 1 Headers
    pdf.text("Inv/Item/SrNo.", col1, headerY);
    headerY += rowHeight;
    pdf.text("Doc Issue Date", col1, headerY);
    headerY += rowHeight;
    pdf.text("Doc Expiry Date", col1, headerY);
    headerY += rowHeight;
    pdf.text("Doc Type Code", col1, headerY);

    // Column 2 Headers
    headerY = yPos;
    pdf.text("Image Ref.No.(IRN)", col2, headerY);
    headerY += rowHeight;
    pdf.text("Doc Ref.No.", col2, headerY);
    headerY += rowHeight;
    pdf.text("Doc Uploaded On", col2, headerY);
    headerY += rowHeight;
    pdf.text("Doc Name", col2, headerY);

    // Column 3 Headers
    headerY = yPos;
    pdf.text("ICEGATE ID", col3, headerY);
    headerY += rowHeight;
    pdf.text("File Type", col3, headerY);
    headerY += rowHeight;
    pdf.text("Place of Issue", col3, headerY);
    headerY += rowHeight;
    pdf.text("Issuing Party Code", col3, headerY);
    headerY += rowHeight;
    pdf.text("Beneficiary Party Code", col3, headerY);

    // Column 4 Headers
    headerY = yPos;
    pdf.text("Issuing Party Name", col4, headerY);
    headerY += rowHeight;
    pdf.text("Issuing Party Add1", col4, headerY);
    headerY += rowHeight;
    pdf.text("Issuing Party Add2", col4, headerY);
    headerY += rowHeight;
    pdf.text("Issuing Party City", col4, headerY);
    headerY += rowHeight;
    pdf.text("Issuing Party Pin Code", col4, headerY);

    // Column 5 Headers
    headerY = yPos;
    pdf.text("Beneficiary Party Name", col5, headerY);
    headerY += rowHeight;
    pdf.text("Beneficiary Party Add1", col5, headerY);
    headerY += rowHeight;
    pdf.text("Beneficiary Party Add2", col5, headerY);
    headerY += rowHeight;
    pdf.text("Beneficiary Party City", col5, headerY);
    headerY += rowHeight;
    pdf.text("Beneficiary Party Pin Code", col5, headerY);

    // Draw line at the end of header section
    yPos += headerSectionHeight;
    drawLine(leftX, yPos, rightX);
    yPos += 8;

    // VALUES SECTION - SAFE RENDERING (FIXES jsPDF.text ERROR)
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZES.tableContent);
    let valueY = yPos;

    // Column 1 Values - SAFE
    pdf.text(data.supportingDocs?.invItemSrNo || "", col1, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docIssueDate || "", col1, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docExpiryDate || "", col1, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docTypeCode || "", col1, valueY);

    // Column 2 Values - SAFE
    valueY = yPos;
    pdf.text(data.supportingDocs?.imageRefNo || "", col2, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docRefNo || "", col2, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docUploadedOn || "", col2, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docName || "", col2, valueY);

    // Column 3 Values - SAFE
    valueY = yPos;
    pdf.text(data.supportingDocs?.icegateId || "", col3, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.fileType || "", col3, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.placeOfIssue || "", col3, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.issuingPartyCode || "", col3, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.beneficiaryPartyCode || "", col3, valueY);

    // Column 4 Values (Issuing Party) - SAFE TEXT WRAPPING
    valueY = yPos;
    const issuingPartyName = data.supportingDocs?.issuingPartyName || "";
    const issuingNameLines = safeSplitText(issuingPartyName, 140);
    pdf.text(issuingNameLines, col4, valueY);
    valueY += issuingNameLines.length * 10;

    const issuingAdd1 = data.supportingDocs?.issuingPartyAdd1 || "";
    const add1Lines = safeSplitText(issuingAdd1, 140);
    pdf.text(add1Lines, col4, valueY);
    valueY += add1Lines.length * 10;

    const issuingAdd2 = data.supportingDocs?.issuingPartyAdd2 || "";
    const add2Lines = safeSplitText(issuingAdd2, 140);
    pdf.text(add2Lines, col4, valueY);
    valueY += add2Lines.length * 10;

    pdf.text(data.supportingDocs?.issuingPartyCity || "", col4, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.issuingPartyPinCode || "", col4, valueY);

    // Column 5 Values (Beneficiary Party) - SAFE TEXT WRAPPING
    valueY = yPos;
    pdf.text(data.supportingDocs?.beneficiaryPartyName || "", col5, valueY);
    valueY += rowHeight;

    const beneficiaryAdd1 = data.supportingDocs?.beneficiaryPartyAdd1 || "";
    const beneficiaryAdd1Lines = safeSplitText(beneficiaryAdd1, 140);
    pdf.text(beneficiaryAdd1Lines, col5, valueY);
    valueY += beneficiaryAdd1Lines.length * 10;

    pdf.text(data.supportingDocs?.beneficiaryPartyAdd2 || "", col5, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.beneficiaryPartyCity || "", col5, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.beneficiaryPartyPinCode || "", col5, valueY);

    // Calculate final Y position
    yPos += 120; // Fixed height for supporting docs section

    // FINAL DECLARATION
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("DECLARATION", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZES.declaration);
    const declarationLines = safeSplitText(
      data.finalDeclaration || "",
      rightX - leftX
    );
    declarationLines.forEach((line) => {
      pdf.text(line, leftX, yPos);
      yPos += FONT_SIZES.declaration * 1.3;
    });

    yPos += 20;
    pdf.setFont("helvetica", "bold");
    pdf.text("Signature of Exporter/CHA with date", leftX, yPos);
    yPos += 8;
    drawLine(leftX, yPos, rightX - 200);

    return yPos + 20;
  };

  // ==================== MAIN GENERATOR ====================
  const generateExportChecklist = async () => {
    try {
      const encodedJobNo = encodeURIComponent(jobNo);
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${encodedJobNo}`
      );

      const exportJob = response.data;
      const currentDate = formatDate(new Date());

      // ==================== CURRENCY RATES (FOR INR + FOREIGN DISPLAY) ====================
      let currencyRates = null;
      const getExportRate = (code) => {
        if (!currencyRates || !code) return null;
        const rateObj = currencyRates.find((r) => r.currency_code === code);
        return rateObj ? rateObj.export_rate : null;
      };

      try {
        const dateRaw =
          exportJob.job_date ||
          exportJob.invoices?.[0]?.invoiceDate ||
          exportJob.sb_date ||
          new Date();
        const dt = new Date(dateRaw);
        const dd = String(dt.getDate()).padStart(2, "0");
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const yyyy = dt.getFullYear();
        const dateStr = `${dd}-${mm}-${yyyy}`;

        const ratesResp = await axios.get(
          `${import.meta.env.VITE_API_STRING}/currency-rates/by-date/${dateStr}`
        );
        currencyRates = ratesResp.data?.data?.exchange_rates || null;
      } catch (err) {
        console.error("Error fetching currency rates for checklist:", err);
      }


      // Flatten products from all invoices for aggregate calculations
      const allProducts = (exportJob.invoices || []).flatMap((inv, invIdx) =>
        (inv.products || []).map((p) => ({
          ...p,
          invoiceIndex: invIdx,
          invoiceCurrency: inv.currency,
          invoiceNo: inv.invoiceNumber,
        }))
      );

      // Prepare comprehensive data object with all fields from PDF
      const data = {
        // Basic Information
        sbNumber: exportJob.sb_no,
        sbDate: formatDate(exportJob.sb_date),
        jobNumber: exportJob.job_no,
        customStation: exportJob.custom_house,
        aeoRegistrationNo: exportJob.otherInfo?.aeoCode || "",
        aeoRole: exportJob.otherInfo?.aeoRole,
        partyRef: exportJob.exporter_ref_no,
        chaCode: exportJob.cha,

        // Exporter Details - BUILD FROM MULTIPLE FIELDS
        exporterGstin: exportJob.exporter_gstin || exportJob.gstin || "",
        exporterGstinFull: exportJob.exporter_gstin
          ? `GSTIN: ${exportJob.exporter_gstin}`
          : "",
        exporterPan: exportJob.exporter_pan
          ? `PAN No: ${exportJob.exporter_pan}`
          : "",
        exporterType: exportJob.exporter_type
          ? `Exporter Type: ${exportJob.exporter_type}`
          : "",
        exporterName: exportJob.exporter || "",
        exporterBranch: exportJob.branch_code
          ? `Branch Ser #${exportJob.branch_code}`
          : "",
        exporterAddress1: exportJob.exporter_address || "",
        exporterAddress2: "", // Parse from exporter_address if multi-line
        exporterAddress3: "", // Parse from exporter_address if multi-line
        // Consignee Details
        consigneeName: exportJob.consignees?.[0]?.consignee_name,
        consigneeAddress: exportJob.consignees?.[0]?.consignee_address,
        consigneeCountry1: exportJob.consignees?.[0]?.consignee_country,
        consigneeCountry2: exportJob.dischargecountry,

        // Shipping Details
        portOfLoading: exportJob.port_of_loading || "",
        portOfDischarge:
          exportJob.port_of_discharge || exportJob.discharge_port || "",
        portOfDestination:
          exportJob.final_destination || exportJob.destination_port || "",
        dischargeCountry: exportJob.discharge_country || "",
        countryOfDest:
          exportJob.destination_country || exportJob.discharge_country || "",
        masterBlNo: exportJob.mbl_no || exportJob.masterblno || "",
        houseBlNo: exportJob.hbl_no || exportJob.houseblno || "",
        rotationNo: exportJob.voyage_no
          ? `${exportJob.voyage_no} dt ${formatDate(exportJob.sailing_date)}`
          : "",
        stateOfOrigin:
          exportJob.state_of_origin || exportJob.exporter_state || "",
        adCode: exportJob.ad_code || exportJob.adCode || "",
        natureOfCargo: exportJob.nature_of_cargo || "",
        totalPackages: exportJob.total_no_of_pkgs || "",
        numberOfContainers: exportJob.no_of_containers || "",
        loosePackets: exportJob.loose_pkgs || "",

        // Weight calculation from products or containers
        grossWeight: exportJob.gross_weight_kg
          ? `${exportJob.gross_weight_kg} ${exportJob.gross_weight_unit || "KGS"
          }`
          : exportJob.containers
            ?.reduce((sum, c) => sum + (parseFloat(c.grossWeight) || 0), 0)
            .toFixed(3) + " KGS" || "0.000 KGS",
        netWeight: exportJob.net_weight_kg
          ? `${exportJob.net_weight_kg} ${exportJob.net_weight_unit || "KGS"}`
          : allProducts
            ?.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0)
            .toFixed(3) + " KGS" || "0.000 KGS",

        // Financial Details - Calculate from products and invoices
        totalFobInr:
          (exportJob.invoices || [])
            .reduce((sum, inv) => {
              const fob = inv.freightInsuranceCharges?.fobValue;
              let fobAmount = 0;
              if (fob) {
                const currency = fob.currency || inv.currency || "INR";
                const amount = parseFloat(fob.amount) || 0;
                if (currency === "INR") {
                  fobAmount = amount;
                } else {
                  const rate =
                    getExportRate(currency) ||
                    parseFloat(exportJob.exchange_rate) ||
                    1;
                  fobAmount = amount * rate;
                }
              } else {
                const currency = inv.currency || "INR";
                const amount =
                  parseFloat(inv.invoiceValue || inv.invoice_value) || 0;
                if (currency === "INR") {
                  fobAmount = amount;
                } else {
                  const rate =
                    getExportRate(currency) ||
                    parseFloat(exportJob.exchange_rate) ||
                    1;
                  fobAmount = amount * rate;
                }
              }
              return sum + fobAmount;
            }, 0)
            .toFixed(2) || "0.00",
        igstTaxableValue:
          allProducts
            ?.reduce((sum, p) => {
              const val =
                parseFloat(p.igstCompensationCess?.taxableValueINR) || 0;
              // If for some reason it's not in INR, we convert it (though field name says INR)
              // Since we don't have a currency field here, we assume it's already converted or in invoice currency
              return sum + val;
            }, 0)
            .toFixed(2) || "0.00",
        igstAmount:
          allProducts
            ?.reduce(
              (sum, p) =>
                sum + (parseFloat(p.igstCompensationCess?.igstAmountINR) || 0),
              0
            )
            .toFixed(2) || "0.00",
        compCess:
          allProducts
            ?.reduce(
              (sum, p) =>
                sum +
                (parseFloat(
                  p.igstCompensationCess?.compensationCessAmountINR
                ) || 0),
              0
            )
            .toFixed(2) || "0.00",
        forexBankAcNo: exportJob.bank_account_number || "",
        // DBK + RODTEP/ROSCTL - Dynamic label based on what's available
        dbkStrLabel: (() => {
          // Check if RODTEP is available
          const hasRodtep = allProducts?.some(p =>
            parseFloat(p.rodtepInfo?.amountINR) > 0
          );

          // Check if ROSCTL is available (you can add this field if needed)
          const hasRosctl = allProducts?.some(p =>
            parseFloat(p.rosctlInfo?.amountINR) > 0
          );

          if (hasRodtep) return "DBK + RODTEP (INR)";
          if (hasRosctl) return "DBK + ROSCTL (INR)";
          return "DBK (INR)";
        })(),
        dbkStr: (() => {
          // Calculate total drawback amount
          const totalDbkAmount = allProducts?.reduce((sum, p) => {
            const productDbk = (p.drawbackDetails || []).reduce(
              (dbkSum, d) => dbkSum + (parseFloat(d.dbkAmount) || 0),
              0
            );
            return sum + productDbk;
          }, 0) || 0;

          // Calculate total RODTEP amount
          const totalRodtepAmount = allProducts?.reduce(
            (sum, p) => sum + (parseFloat(p.rodtepInfo?.amountINR) || 0),
            0
          ) || 0;

          // Calculate total ROSCTL amount (if available)
          const totalRosctlAmount = allProducts?.reduce(
            (sum, p) => sum + (parseFloat(p.rosctlInfo?.amountINR) || 0),
            0
          ) || 0;

          // DBK + RODTEP or DBK + ROSCTL (only one can be present)
          return (totalDbkAmount + totalRodtepAmount + totalRosctlAmount).toFixed(2);
        })(),
        rbiWaiverNo: exportJob.rbi_waiver_no || "",
        dbkBankAcNo: "", // Not found in data structure
        totalDbk:
          allProducts
            ?.reduce((sum, p) => {
              const productDbk = (p.drawbackDetails || []).reduce(
                (dbkSum, d) => dbkSum + (parseFloat(d.dbkAmount) || 0),
                0
              );
              return sum + productDbk;
            }, 0)
            .toFixed(2) || "0.00",
        rodtepAmount:
          allProducts
            ?.reduce(
              (sum, p) => sum + (parseFloat(p.rodtepInfo?.amountINR) || 0),
              0
            )
            .toFixed(2) || "0.00",

        invoicesDetail: (exportJob.invoices || []).map((inv) => {
          const baseValue = inv.productValue || inv.invoiceValue || 0;
          const freightInsurance = inv.freightInsuranceCharges;

          return {
            invoiceNo: inv.invoiceNumber || "",
            invoiceDate: formatDate(inv.invoiceDate) || "",
            invoiceCurrency: inv.currency || "",
            natureOfContract: inv.termsOfInvoice || "",
            unitPriceIncludes: inv.priceIncludes || "",
            exchangeRate: exportJob.exchange_rate || "",
            expContractNo: exportJob.otherInfo?.exportContractNo || "",
            expContractDate: formatDate(exportJob.otherInfo?.exportContractDate) || "",

            invoiceValue: (() => {
              const baseCurrency = inv.currency;
              const rawAmount = inv.invoiceValue ?? inv.invoice_value;
              if (rawAmount === null || rawAmount === undefined || rawAmount === "")
                return "";
              const amountNum = parseFloat(rawAmount) || 0;
              const basePart = `${baseCurrency} ${amountNum.toFixed(2)}`;
              const rateFromApi = getExportRate(baseCurrency);
              const rate = rateFromApi || exportJob.exchange_rate;
              if (!rate) return basePart;
              const inrAmount = (amountNum * rate).toFixed(2);
              return `${basePart} / INR ${inrAmount}`;
            })(),

            fobValue: (() => {
              const fob = inv.freightInsuranceCharges?.fobValue;
              if (!fob || !fob.amount) return "";
              const currency = fob.currency || inv.currency || "USD";
              const amount = parseFloat(fob.amount);
              const rateFromApi = getExportRate(currency);
              const rate = rateFromApi || parseFloat(exportJob.exchange_rate) || 1;
              const inrAmount = (amount * rate).toFixed(2);
              return `${currency} ${amount.toFixed(2)} / INR ${inrAmount}`;
            })(),

            insuranceData: (() => {
              const rate = freightInsurance?.insurance?.rate || 0;
              const amount = freightInsurance?.insurance?.amount;
              const currency = freightInsurance?.insurance?.currency || "";
              const calculatedAmount =
                amount !== undefined && amount !== null && amount !== ""
                  ? amount
                  : rate
                    ? ((baseValue * rate) / 100).toFixed(2)
                    : "";
              return {
                rate: rate !== 0 ? rate : "",
                currency: currency,
                amount: calculatedAmount,
              };
            })(),

            freightData: (() => {
              const rate = freightInsurance?.freight?.rate || 0;
              const amount = freightInsurance?.freight?.amount;
              const currency = freightInsurance?.freight?.currency || "";
              const calculatedAmount =
                amount !== undefined && amount !== null && amount !== ""
                  ? amount
                  : rate
                    ? ((baseValue * rate) / 100).toFixed(2)
                    : "";
              return {
                rate: rate !== 0 ? rate : "",
                currency: currency,
                amount: calculatedAmount,
              };
            })(),

            discountData: (() => {
              const rate = freightInsurance?.discount?.rate || 0;
              const amount = freightInsurance?.discount?.amount;
              const currency = freightInsurance?.discount?.currency || "";
              const calculatedAmount =
                amount !== undefined && amount !== null && amount !== ""
                  ? amount
                  : rate
                    ? ((baseValue * rate) / 100).toFixed(2)
                    : "";
              return {
                rate: rate !== 0 ? rate : "",
                currency: currency,
                amount: calculatedAmount,
              };
            })(),

            commissionData: (() => {
              const rate = freightInsurance?.commission?.rate || 0;
              const amount = freightInsurance?.commission?.amount;
              const currency = freightInsurance?.commission?.currency || "";
              const calculatedAmount =
                amount !== undefined && amount !== null && amount !== ""
                  ? amount
                  : rate
                    ? ((baseValue * rate) / 100).toFixed(2)
                    : "";
              return {
                rate: rate !== 0 ? rate : "",
                currency: currency,
                amount: calculatedAmount,
              };
            })(),

            otherDeductionData: (() => {
              const rate = freightInsurance?.otherDeduction?.rate || 0;
              const amount = freightInsurance?.otherDeduction?.amount;
              const currency = freightInsurance?.otherDeduction?.currency || "";
              const calculatedAmount =
                amount !== undefined && amount !== null && amount !== ""
                  ? amount
                  : rate
                    ? ((baseValue * rate) / 100).toFixed(2)
                    : "";
              return {
                rate: rate !== 0 ? rate : "",
                currency: currency,
                amount: calculatedAmount,
              };
            })(),

            packingChargesData: {
              rate: "",
              currency: "",
              amount: inv.packing_fob || inv.packingFOB || "",
            },
          };
        }),

        // Add today's date to data for use in headers during page breaks
        currentDate: currentDate,


        // Payment & Buyer Details
        natureOfPayment: exportJob.otherInfo?.natureOfPayment || "",
        periodOfPayment: exportJob.otherInfo?.paymentPeriod
          ? `${exportJob.otherInfo.paymentPeriod} days`
          : "",
        // Buyer info - should show actual buyer, not third party
        buyerName: (() => {
          const buyer = exportJob.buyerThirdPartyInfo?.buyer;
          if (buyer?.name) {
            return `${buyer.name}\n${buyer.addressLine1 || ""}\n${buyer.country || ""}`;
          }
          return "";
        })(),
        buyerAddress: exportJob.buyerThirdPartyInfo?.buyer?.addressLine1 || "",
        buyerAeoCode: exportJob.otherInfo?.aeoCode || "",
        buyerAeoCountry: exportJob.otherInfo?.aeoCountry || "",
        buyerAeoRole: exportJob.otherInfo?.aeoRole || "",
        // Third party details - show whenever third party name exists
        thirdPartyDetails: (() => {
          const thirdParty = exportJob.buyerThirdPartyInfo?.thirdParty;
          if (thirdParty?.name) {
            const parts = [thirdParty.name];
            if (thirdParty.address) parts.push(thirdParty.address);
            if (thirdParty.country) parts.push(thirdParty.country);
            return parts.join("\n");
          }
          return "";
        })(),

        // EOU Details
        eou: exportJob.ie_code_of_eou || exportJob.annexC1Details?.ieCodeOfEOU || "",
        iec: exportJob.ieCode || "",
        branchSno:
          exportJob.branch_sr_no ||
          exportJob.branchSrNo ||
          exportJob.annexC1Details?.branchSerialNo ||
          "0",
        factoryAddress: exportJob.factory_address || "",


        // Marks & Nos
        marksAndNos: exportJob.marks_nos,

        // Item Details - Map products array
        products:
          allProducts?.map((product, index) => {
            const currency = product.invoiceCurrency || "INR";
            const amount = parseFloat(product.amount) || 0;
            const rate =
              getExportRate(currency) ||
              parseFloat(exportJob.exchange_rate) ||
              1;
            // Calculate proper FOB using the utility function
            const invoice = exportJob.invoices?.find(inv =>
              inv.products?.some(p => p.serialNumber === product.serialNumber)
            ) || exportJob.invoices?.[0];

            const fobINR = calculateProductFobINR(
              product,
              invoice,
              rate
            );

            const fobFC = fobINR / rate;

            return {
              serialNumber: product.serialNumber,
              ritc: product.ritc,
              description: product.description,
              quantity: product.quantity,
              qtyUnit: product.qtyUnit,
              per: product.per,
              unitPrice: product.unitPrice,
              priceUnit: product.priceUnit || product.amountUnit,
              amount: product.amount,
              pmvPerUnit: product.pmvInfo?.pmvPerUnit,
              totalPMV: product.pmvInfo?.totalPMV,
              eximCode: product.eximCode,
              nfeiCategory: product.nfeiCategory,
              rewardItem: product.rewardItem,
              fobValueFC: fobFC.toFixed(2),
              fobValueINR: fobINR.toFixed(2),
              igstPaymentStatus:
                product.igstCompensationCess?.igstPaymentStatus,
              taxableValueINR: product.igstCompensationCess?.taxableValueINR,
              igstAmountINR: product.igstCompensationCess?.igstAmountINR,
            };
          }) || [],

        // Totals from products
        totalPmv: allProducts
          ?.reduce((sum, p) => sum + (parseFloat(p.pmvInfo?.totalPMV) || 0), 0)
          .toFixed(2),
        totalIgst: allProducts
          ?.reduce(
            (sum, p) =>
              sum + (parseFloat(p.igstCompensationCess?.igstAmountINR) || 0),
            0
          )
          .toFixed(2),
        totalPmvGross: allProducts
          ?.reduce((sum, p) => sum + (parseFloat(p.pmvInfo?.totalPMV) || 0), 0)
          .toFixed(2),
        totalIgstGross: allProducts
          ?.reduce(
            (sum, p) =>
              sum + (parseFloat(p.igstCompensationCess?.igstAmountINR) || 0),
            0
          )
          .toFixed(2),

        // DBK Details - Extract from all products drawbackDetails
        dbkData: (() => {
          const dbkRows = [];
          allProducts?.forEach((product, productIndex) => {
            const invoice = exportJob.invoices?.find(inv =>
              inv.products?.some(p => p.serialNumber === product.serialNumber)
            ) || exportJob.invoices?.[0];
            const invNo = invoice?.invoiceNumber || "1";

            product.drawbackDetails?.forEach((dbk, dbkIndex) => {
              dbkRows.push({
                invNo: invNo,
                itemNo: product.serialNumber || (productIndex + 1).toString(),
                dbkSlNo: dbk.dbkSrNo || "",
                dbkRate: dbk.dbkRate?.toString() || "",
                dbkQtyUnit: `${dbk.quantity || ""} / ${dbk.unit || ""}`,
                dbkAmount: dbk.dbkAmount?.toFixed(2) || "0.00",
                dbkSPE: (dbk.dbkCap || 0).toFixed(1),
              });
            });
          });
          return dbkRows;
        })(),

        // ROSCTL Details - Extract from all products drawbackDetails
        rosctlData: (() => {
          const rosctlRows = [];
          allProducts?.forEach((product, productIndex) => {
            const invoice =
              exportJob.invoices?.find((inv) =>
                inv.products?.some((p) => p.serialNumber === product.serialNumber)
              ) || exportJob.invoices?.[0];
            const invNo = invoice?.invoiceNumber || "1";

            product.drawbackDetails?.forEach((dbk) => {
              if (dbk.showRosctl) {
                rosctlRows.push({
                  invNo: invNo,
                  itemNo: product.serialNumber || (productIndex + 1).toString(),
                  tariffItem: dbk.dbkSrNo || "",
                  category: dbk.rosctlCategory || "",
                  slRate: dbk.slRate || "0",
                  slCap: dbk.slCap || "0",
                  ctlRate: dbk.ctlRate || "0",
                  ctlCap: dbk.ctlCap || "0",
                  amount: dbk.rosctlAmount || "0.00",
                });
              }
            });
          });
          return rosctlRows;
        })(),

        // Vessel & Container Details
        factoryStuffed: exportJob.goods_stuffed_at === "Factory" ? "Yes" : "No",
        sealType: exportJob.stuffing_seal_type || "",
        sampleAcc: exportJob.sample_accompanied ? "Yes" : "No",
        vesselName: exportJob.vessel_name || "",
        voyageNumber: exportJob.voyage_no || "",

        containers:
          exportJob.containers?.map((container) => ({
            containerNo: container.containerNo || "",
            size: container.type?.match(/\d+/)?.[0] || "", // Extract number from type like "20GP"
            type: container.type?.replace(/\d+/, "") || "", // Extract letters from type
            sealNo: container.sealNo || "",
            sealType: container.sealType || exportJob.stuffing_seal_type || "",
            sealDate: formatDate(container.sealDate) || "",
            sealDeviceID: container.sealDeviceId || container.rfid || "",
          })) || [],

        // Additional Details Rows
        additionalDetailsRows: (() => {
          const rows = [];
          exportJob.invoices?.forEach((invoice, invIdx) => {
            invoice.products?.forEach((product, prodIdx) => {
              rows.push({
                invItemSln: `${invIdx + 1}/${prodIdx + 1}`,
                sqcQtyUnit: product.socQuantity
                  ? `${product.socQuantity} ${product.socunit}`
                  : "",
                originDistrict:
                  product.originDistrict || product.district || "",
                originState: product.originState || "",
                compCessAmount:
                  product.igstCompensationCess?.compensationCessAmountINR ||
                  "0.00",
                ptaFta:
                  product.ptaFtaInfo ||
                  product.ptaFta ||
                  product.pta ||
                  product.fta ||
                  "",
              });
            });
          });
          return rows;
        })(),


        // End Use Information - One row per invoice × product
        endUseData: (() => {
          const endUseRows = [];
          exportJob.invoices?.forEach((invoice, invIndex) => {
            invoice.products?.forEach((product, prodIndex) => {
              if (product.endUse) {
                endUseRows.push({
                  invItemSrNo: `${invIndex + 1}/${prodIndex + 1}`,
                  code: product.endUse || "",
                });
              }
            });
          });
          return endUseRows.length > 0 ? endUseRows : [{ invItemSrNo: "", code: "" }];
        })(),

        // RODTEP Data - One row per invoice × product
        rodtepData: (() => {
          const rodtepRows = [];
          exportJob.invoices?.forEach((invoice, invIndex) => {
            invoice.products?.forEach((product, prodIndex) => {
              rodtepRows.push({
                invItemSr: `${invIndex + 1}/${prodIndex + 1}`,
                claimStatus: product.rodtepInfo?.claim === "Yes" ? "RODTEPY" : "",
                quantity: product.rodtepInfo?.quantity || "",
                rate: product.rodtepInfo?.ratePercent || "",
                capValue: product.rodtepInfo?.capValue || "",
                noOfUnits: "1",
                rodtepAmount: product.rodtepInfo?.amountINR || "",
              });
            });
          });
          return rodtepRows;
        })(),

        // Declaration Data - One row per invoice × product
        declarationData: (() => {
          const declRows = [];
          exportJob.invoices?.forEach((invoice, invIndex) => {
            invoice.products?.forEach((product, prodIndex) => {
              if (product.rodtepInfo?.claim === "Yes") {
                declRows.push({
                  declType: "DEC",
                  declCode: "RD001", // Standard RODTEP declaration
                  invItemSrNo: `${invIndex + 1}/${prodIndex + 1}`,
                });
              }
            });
          });
          return declRows.length > 0 ? declRows : [{ declType: "", declCode: "", invItemSrNo: "" }];
        })(),

        declarationText: `I/We, in regard to my/our claim under RoDTEP scheme made in this Shipping Bill or Bill of Export, hereby declare that:

1. I/ We undertake to abide by the provisions, including conditions, restrictions, exclusions and time-limits as provided under RoDTEP scheme, and relevant notifications, regulations, etc., as amended from time to time.

2. Any claim made in this shipping bill or bill of export is not with respect to any duties or taxes or levies which are exempted or remitted or credited under any other mechanism outside RoDTEP.

3. I/We undertake to preserve and make available relevant documents relating to the exported goods for the purposes of audit in the manner and for the time period prescribed in the Customs Audit Regulations, 2018.`,

        // Supporting Documents
        supportingDocs: exportJob.eSanchitDocuments?.[0]
          ? {
            invItemSrNo:
              exportJob.eSanchitDocuments[0].invSerialNo || "1/0/1",
            imageRefNo: exportJob.eSanchitDocuments[0].irn || "",
            icegateId: exportJob.eSanchitDocuments[0].otherIcegateId || "",
            issuingPartyName:
              exportJob.eSanchitDocuments[0].issuingParty?.name ||
              exportJob.exporter ||
              "",
            beneficiaryPartyName:
              exportJob.eSanchitDocuments[0].beneficiaryParty?.name ||
              exportJob.consignees?.[0]?.consignee_name ||
              "",
            docIssueDate:
              formatDate(exportJob.eSanchitDocuments[0].dateOfIssue) || "",
            docRefNo:
              exportJob.eSanchitDocuments[0].documentReferenceNo || "",
            fileType:
              exportJob.eSanchitDocuments[0].icegateFilename
                ?.split(".")
                .pop() || "",
            issuingPartyAdd1:
              exportJob.eSanchitDocuments[0].issuingParty?.addressLine1 ||
              exportJob.exporter_address ||
              "",
            beneficiaryPartyAdd1:
              exportJob.eSanchitDocuments[0].beneficiaryParty?.addressLine1 ||
              exportJob.consignees?.[0]?.consignee_address ||
              "",
            docExpiryDate:
              formatDate(exportJob.eSanchitDocuments[0].expiryDate) || "",
            docUploadedOn:
              formatDate(exportJob.eSanchitDocuments[0].dateTimeOfUpload) ||
              "",
            placeOfIssue: exportJob.eSanchitDocuments[0].placeOfIssue || "",
            issuingPartyAdd2:
              exportJob.eSanchitDocuments[0].issuingParty?.addressLine2 || "",
            beneficiaryPartyAdd2:
              exportJob.eSanchitDocuments[0].beneficiaryParty?.addressLine2 ||
              "",
            docTypeCode: exportJob.eSanchitDocuments[0].documentType || "",
            docName: exportJob.eSanchitDocuments[0].icegateFilename || "",
            issuingPartyCode:
              exportJob.eSanchitDocuments[0].issuingParty?.code || "",
            issuingPartyCity:
              exportJob.eSanchitDocuments[0].issuingParty?.city || "",
            beneficiaryPartyCity:
              exportJob.eSanchitDocuments[0].beneficiaryParty?.city || "",
            beneficiaryPartyCode:
              exportJob.eSanchitDocuments[0].beneficiaryParty?.code || "",
            issuingPartyPinCode:
              exportJob.eSanchitDocuments[0].issuingParty?.pinCode || "",
            beneficiaryPartyPinCode:
              exportJob.eSanchitDocuments[0].beneficiaryParty?.pinCode || "",
          }
          : {},

        // Final Declaration
        finalDeclaration: `1. I/We declare that the particulars given herein are true and are correct.

2. I/We undertake to abide by the provisions of Foreign Exchange Management Act, 1999, as amended from time to time, including realisation or repatriation of foreign exchange to or from India.

Signature of Exporter/CHA with date`,
      };

      // Create PDF
      const pdf = new jsPDF("p", "pt", "a4");
      const helpers = createPDFHelpers(pdf);

      helpers.addHeader(
        1,
        4,
        data.customStation,
        data.aeoRegistrationNo,
        data.aeoRole,
        currentDate
      );
      renderPage1(pdf, helpers, data);

      // PAGE 2 - ITEM DETAILS
      pdf.addPage();
      helpers.addHeader(
        2,
        4,
        data.customStation,
        data.aeoRegistrationNo,
        data.aeoRole,
        currentDate
      );
      renderItemDetailsPage(pdf, helpers, data);

      // PAGE 3 - DBK, VESSEL, CONTAINER details
      pdf.addPage();
      helpers.addHeader(
        3,
        4,
        data.customStation,
        data.aeoRegistrationNo,
        data.aeoRole,
        currentDate
      );
      renderPage2(pdf, helpers, data);

      // PAGE 4 - SINGLE WINDOW, RODTEP, DECLARATIONS, SUPPORTING DOCS
      pdf.addPage();
      helpers.addHeader(
        4,
        4,
        data.customStation,
        data.aeoRegistrationNo,
        data.aeoRole,
        currentDate
      );
      renderPage3(pdf, helpers, data);

      pdf.addPage();
      helpers.addHeader(
        4,
        4,
        data.customStation,
        data.aeoRegistrationNo,
        data.aeoRole,
        currentDate
      );
      renderPage4(pdf, helpers, data);

      // Generate filename and display
      const filename = `Export-CheckList-${data.jobNumber.replace(
        /\//g,
        "-"
      )}-${currentDate.replace(/ /g, "-")}.pdf`;
      const pdfBlob = pdf.output("blob");
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
    } catch (error) {
      console.error("Error generating export checklist PDF:", error);
      alert("Error generating PDF: " + error.message);
    }
  };

  return (
    <>
      {children ? (
        React.cloneElement(children, {
          onClick: (e) => {
            if (children.props.onClick) children.props.onClick(e);
            generateExportChecklist(e);
          },
        })
      ) : renderAsIcon ? (
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            generateExportChecklist();
          }}
        >
          <abbr title="Download Export Checklist">
            <DownloadIcon fontSize="inherit" />
          </abbr>
        </IconButton>
      ) : (
        <Button
          onClick={generateExportChecklist}
          type="button"
          sx={{
            backgroundColor: "#111B21",
            color: "white",
            "&:hover": {
              backgroundColor: "#333",
            },
          }}
        >
          Generate Export Checklist
        </Button>
      )}
    </>
  );
};

export default ExportChecklistGenerator;
