import React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from "axios";
import { IconButton, Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

const ExportChecklistGenerator = ({ jobNo, renderAsIcon = false }) => {
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
    const date = new Date(dateString);
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
        pdf.text(`${label}:`, x, y);

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
        pdf.text(`Custom stn: ${customStation || ""}`, leftX, y + 13);

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
      data.exporterGstin || "AATCA3129J",
      data.exporterGstinFull || "GSTIN: 24AATCA3129J2ZH",
      data.exporterPan || "PAN No: AATCA3129J",
      data.exporterType || "Exporter Type: Merchant Exporter",
      data.exporterName || "ANEETA PACKAGING PRIVATE LIMITED",
      data.exporterBranch || "Branch Ser #1",
      data.exporterAddress1 || "1103 - 1104, Parshwanath Business Park,",
      data.exporterAddress2 || "Near Auda, Garden,",
      data.exporterAddress3 || "Prahladnagar",
    ];

    exporterLines.forEach((line) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(FONT_SIZES.fieldValue);
      pdf.text(line, leftColX, exporterY);
      exporterY += 9;
    });

    // Right Column: CONSIGNEE details - start from same Y position as exporter
    let consigneeY = yPos + 10; // Start at same Y as exporter details
    const consigneeLines = [
      data.consigneeName || "TO ORDER",
      data.consigneeCountry1 || "UK",
      data.consigneeCountry2 || "United Kingdom",
    ];

    consigneeLines.forEach((line) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(FONT_SIZES.fieldValue);
      pdf.text(line, rightColX, consigneeY);
      consigneeY += 9;
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
      { label: "DBK+STR (INR)", value: data.dbkStr },
      { label: "STR Amount (INR)", value: data.strAmount },
      { label: "Total DBK (INR)", value: data.totalDbk },
      { label: "RODTEP Amount(INR)", value: data.rodtepAmount },
    ];

    let leftY = yPos;
    let rightY = yPos;

    // Draw both columns of main data
    const maxRows = Math.max(leftFields.length, rightFields.length);
    for (let i = 0; i < maxRows; i++) {
      if (leftFields[i]) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(leftFields[i].label, leftColX, leftY);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldValue);
        pdf.text(leftFields[i].value, leftColX + 100, leftY);
      }

      if (rightFields[i]) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(rightFields[i].label, rightColX, rightY);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldValue);
        pdf.text(rightFields[i].value, rightColX + 100, rightY);
      }

      leftY += 12;
      rightY += 12;
    }

    yPos = leftY + 8;

    // Invoice Details section
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.fieldValue);
    pdf.text("Invoice Details: Invoice 1 / 1", leftColX, yPos);
    yPos += 12;

    // Invoice fields in two columns
    const invoiceLeftFields = [
      { label: "Inv. No", value: data.invoiceNo },
      { label: "Inv. Date", value: data.invoiceDate },
      { label: "Nature of contract", value: data.natureOfContract },
      { label: "Unit Price Includes", value: data.unitPriceIncludes },
      { label: "Inv. Currency", value: data.invoiceCurrency },
    ];

    const invoiceRightFields = [
      { label: "Inv. Value", value: data.invoiceValue },
      { label: "FOB Value", value: data.fobValue },
      { label: "Exp Contract No.", value: data.expContractNo },
      { label: "Exp Contract Date", value: data.expContractDate },
      { label: "Exch. Rate", value: data.exchangeRate },
    ];

    let invoiceLeftY = yPos;
    let invoiceRightY = yPos;

    for (let i = 0; i < 5; i++) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(FONT_SIZES.fieldLabel);
      pdf.text(invoiceLeftFields[i].label, leftColX, invoiceLeftY);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(FONT_SIZES.fieldValue);
      pdf.text(invoiceLeftFields[i].value, leftColX + 80, invoiceLeftY);

      pdf.setFont("helvetica", "bold");
      pdf.text(invoiceRightFields[i].label, rightColX, invoiceRightY);
      pdf.setFont("helvetica", "normal");
      pdf.text(invoiceRightFields[i].value, rightColX + 80, invoiceRightY);

      invoiceLeftY += 12;
      invoiceRightY += 12;
    }

    yPos = invoiceLeftY + 8;

    // Rate table header
    yPos += 12;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.tableHeader);
    pdf.text("Rate", leftColX + 80, yPos);
    pdf.text("Currency", leftColX + 150, yPos);
    pdf.text("Amount", leftColX + 220, yPos);
    yPos += 10;

    // Rate items - empty values as shown in first image
    const rateItems = [
      "Insurance",
      "Freight",
      "Discount",
      "Commission",
      "Other Deduction",
      "Packing Charges",
    ];
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZES.tableContent);

    rateItems.forEach((item) => {
      pdf.text(item, leftColX, yPos);
      yPos += 10;
    });

    yPos += 5;
    yPos += 12;

    // Nature Of Payment and Period Of Payment on same line - exactly like first image
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.fieldLabel);
    pdf.text("Nature Of Payment", leftColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZES.fieldValue);
    pdf.text(data.natureOfPayment || "AP", leftColX + 100, yPos);

    pdf.setFont("helvetica", "bold");
    pdf.text("Period Of Payment", rightColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.periodOfPayment || "0 days", rightColX + 90, yPos);

    yPos += 12;

    // Marks & Nos - exactly like first image
    pdf.setFont("helvetica", "bold");
    pdf.text("Marks & Nos", leftColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      data.marksAndNos ||
        "WE INTEND TO CLAIM BENEFIT UNDER RODTEP SCHEME AS APPLICABLE.",
      leftColX + 70,
      yPos
    );
    yPos += 12;

    yPos += 5;
    yPos += 12;

    // Buyer's Name & Address section - exactly like first image
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.fieldLabel);
    pdf.text("Buyer's Name & Address", leftColX, yPos);
    yPos += 12;

    // Buyer address on left side
    const buyerLines = pdf.splitTextToSize(
      data.buyerName ||
        "FARRAG PACKAGING\n3 SHELDON AVENUE\nVICARS CROSS\nCHESTER CH3 5LF UNITED KINGDOM",
      colWidth - 20
    );
    buyerLines.forEach((line) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(FONT_SIZES.fieldValue);
      pdf.text(line, leftColX, yPos);
      yPos += 10;
    });

    // AEO details and Third Party on right side - exactly like first image
    let rightDetailsY = yPos - buyerLines.length * 10 - 5; // Align with buyer details start

    const rightDetails = [
      { label: "AEO Code", value: data.buyerAeoCode || "" },
      { label: "AEO Country", value: data.buyerAeoCountry || "" },
      { label: "AEO Role", value: data.buyerAeoRole || "" },
      {
        label: "Third Party Name & Addr.",
        value:
          data.thirdPartyDetails ||
          "STAINGARD LTD\nUNIT 7 - 9, BURNELL ROAD\nELLESMERE PORT CH65 5EX",
      },
    ];

    rightDetails.forEach((detail) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(FONT_SIZES.fieldLabel);
      pdf.text(detail.label, rightColX, rightDetailsY);

      if (detail.value) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(FONT_SIZES.fieldValue);
        const valueLines = pdf.splitTextToSize(detail.value, colWidth - 20);
        valueLines.forEach((line, index) => {
          pdf.text(line, rightColX, rightDetailsY + 10 + index * 9);
        });
        rightDetailsY += valueLines.length * 9 + 12;
      } else {
        rightDetailsY += 12;
      }
    });

    yPos = Math.max(yPos, rightDetailsY) + 8;

    // EOU Details - exactly like first image
    pdf.setFont("helvetica", "bold");
    pdf.text("EOU", leftColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.eou || "", leftColX + 30, yPos);

    pdf.setFont("helvetica", "bold");
    pdf.text("IEC", leftColX + 100, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.iec || "", leftColX + 130, yPos);

    pdf.setFont("helvetica", "bold");
    pdf.text("Branch Sno", leftColX + 200, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.branchSno || "0", leftColX + 260, yPos);

    yPos += 12;

    pdf.setFont("helvetica", "bold");
    pdf.text("Factory Address", leftColX, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.factoryAddress || "", leftColX + 80, yPos);

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
    const col4 = leftX + 240; // Unit Price/Unit, FOB Val(FC)
    const col5 = leftX + 320; // FOB Val(INR)
    const col6 = leftX + 410; // Total Value(FC), IGST Pymt Statu
    const col7 = leftX + 500; // PMV/Unit, IGST Taxable Value

    // ITEM DETAILS Table Headers - PROPERLY ALIGNED
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.tableHeader);

    // Column 1: SI No, Qty, Unit
    pdf.text("SI No", col1, yPos);
    pdf.text("Qty", col1, yPos + 10);
    pdf.text("Unit", col1, yPos + 20);

    // Column 2: RITC, Exim Scheme Code & description, NFEI Catg, Reward Item
    pdf.text("RITC", col2, yPos);
    pdf.text("Exim Scheme Code & description", col2, yPos + 10);
    pdf.text("NFEI Catg", col2, yPos + 20);
    pdf.text("Reward Item", col2, yPos + 30);

    // Column 3: Description (single row)
    pdf.text("Description", col3, yPos);

    // Column 4: Unit Price/Unit, FOB Val(FC)
    pdf.text("Unit Price / Unit", col3, yPos + 20);

    pdf.text("FOB Val(FC)", col3, yPos + 30);

    // Column 5: FOB Val(INR) - single row
    pdf.text("FOB Val(INR)", col4, yPos + 30);

    // Column 6: Total Value(FC), IGST Pymt St
    pdf.text("Total Value(FC)", col5, yPos + 20);
    pdf.text("IGST Pymt Status", col5, yPos + 30);

    // Column 7: PMV/Unit, IGST Taxable Value
    pdf.text("PMV/Unit", col6, yPos + 20);
    pdf.text("IGST Taxable Valu", col6, yPos + 30);

    // Column 8: Total PMV(INR), IGST Amount
    pdf.text("Total PMV(INR)", col7, yPos + 20);
    pdf.text("IGST Amount", col7, yPos + 30);

    yPos += 40; // Increased for multi-row headers
    drawLine(leftX, yPos, rightX);
    yPos += 12;

    // Item Data - COLUMN WISE DATA WITH PROPER ALIGNMENT
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZES.tableContent);

    if (data.products && data.products.length > 0) {
      data.products.forEach((product, index) => {
        const itemY = yPos;

        // Column 1: SI No, Qty, Unit
        pdf.text((index + 1).toString(), col1, itemY); // SI No
        pdf.text(product.quantity || "209088.000", col1, itemY + 10); // Qty
        pdf.text(product.per || "PCS", col1, itemY + 20); // Unit

        // Column 2: RITC, Exim Scheme Code & description, NFEI Catg, Reward Item
        pdf.text(product.ritc || "39233090", col2, itemY); // RITC

        pdf.text(product.eximCode || "19 (Drawback (DBK))", col2, itemY + 10); // Exim Scheme
        const nfei = product.nfeiCategory;
        const nfeilines = pdf.splitTextToSize(nfei, 90); // 110 width for description column
        pdf.text(nfeilines || "", col2, itemY + 20); // NFEI Catg
        pdf.text(product.rewardItem ? "Yes" : "No", col2, itemY + 30); // Reward Item

        // Column 3: Description
        const description =
          product.description ||
          "EMPTY HDPE BOTTLES - HDPE BOTTLES 60 ML AS PER INVOICE";
        // Split long description into multiple lines if needed
        const descriptionLines = pdf.splitTextToSize(description, 90); // 110 width for description column
        pdf.text(descriptionLines, col3, itemY);
        pdf.text(product.unitPrice || "0.032000/PCS", col3, itemY + 0); // Unit Price
        pdf.text(product.fobValueFC || "6690.82", col3, itemY + 70); // FOB Val(FC)

        // Column 5: FOB Val(INR)
        pdf.text(product.fobValueINR || "583104.96", col4, itemY + 20); // FOB Val(INR)

        // Column 6: Total Value(FC), IGST Pymt Statu
        pdf.text(product.amount || "6690.82", col5, itemY); // Total Value(FC)
        pdf.text(
          (product.igstPaymentStatus || "P") + " (18%)",
          col5,
          itemY + 20
        ); // IGST Pymt Statu

        // Column 7: PMV/Unit, IGST Taxable Value
        pdf.text(product.pmvPerUnit || "3.07", col6, itemY); // PMV/Unit
        pdf.text(product.taxableValueINR || "583104.61", col6, itemY + 20); // IGST Taxable Value

        // Column 8: Total PMV(INR), IGST Amount
        pdf.text(product.totalPMV || "641900.16", col7, itemY); // Total PMV(INR)
        pdf.text(product.igstAmountINR || "104958.83", col7, itemY + 20); // IGST Amount

        // Calculate height needed for this item (based on description lines)
        const itemHeight = Math.max(35, 10 + descriptionLines.length * 10);

        yPos += itemHeight;

        // Add separator line between items
        if (index < data.products.length - 1) {
          drawLine(leftX, yPos, rightX);
          yPos += 8;
        }
      });
    } else {
      // Default item data with column structure
      const itemY = yPos;

      // Column 1: SI No, Qty, Unit
      pdf.text("1", col1, itemY);
      pdf.text("209088.000", col1, itemY + 10);
      pdf.text("PCS", col1, itemY + 20);

      // Column 2: RITC, Exim Scheme Code & description, NFEI Catg, Reward Item
      pdf.text("39233090", col2, itemY);
      pdf.text("19 (Drawback (DBK))", col2, itemY + 10);
      pdf.text("", col2, itemY + 20);
      pdf.text("Yes", col2, itemY + 30);

      // Column 3: Description
      const description =
        "EMPTY HDPE BOTTLES - HDPE BOTTLES 60 ML AS PER INVOICE";
      const descriptionLines = pdf.splitTextToSize(description, 90);
      pdf.text(descriptionLines, col3, itemY);
      pdf.text("0.032000/PCS", col3, itemY + 50);
      pdf.text("6690.82", col3, itemY + 70);

      // Column 5: FOB Val(INR)
      pdf.text("583104.96", col4, itemY + 20);

      // Column 6: Total Value(FC), IGST Pymt Statu
      pdf.text("6690.82", col5, itemY);
      pdf.text("P (18%)", col5, itemY + 20);

      // Column 7: PMV/Unit, IGST Taxable Value
      pdf.text("3.07", col6, itemY);
      pdf.text("583104.61", col6, itemY + 20);

      // Column 8: Total PMV(INR), IGST Amount
      pdf.text("641900.16", col7, itemY);
      pdf.text("104958.83", col7, itemY + 20);

      yPos += 35;
    }

    // Totals section
    yPos += 5;

    yPos += 12;

    pdf.setFont("helvetica", "bold");
    drawLine(leftX, yPos + 20, rightX);
    pdf.setFontSize(FONT_SIZES.tableContent);

    yPos += 30;

    // Align totals to the right
    pdf.text("Total PMV", rightX - 150, yPos);
    pdf.text(data.totalPmv || "641900.16", rightX - 50, yPos);
    yPos += 10;

    pdf.text("Total IGST", rightX - 150, yPos);
    pdf.text(data.totalIgst || "104958.83", rightX - 50, yPos);
    yPos += 10;

    pdf.text("Total PMV (Gross)", rightX - 150, yPos);
    pdf.text(data.totalPmvGross || "641900.16", rightX - 50, yPos);
    yPos += 10;

    pdf.text("Total IGST (Gross)", rightX - 150, yPos);
    pdf.text(data.totalIgstGross || "104958.83", rightX - 50, yPos);

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
      "Custom Rate",
      "DBK Rate",
      "DBK Qty / Unit",
      "DBK Amount",
      "Custom SPE",
      "DBK SPE",
    ];

    const dbkRows = Array.isArray(data.dbkData) ? data.dbkData : [data.dbkData];

    pdf.autoTable({
      head: [dbkHeaders],
      body: dbkRows.map((row) => [
        row.invNo || "1",
        row.itemNo || "1",
        row.dbkSlNo || "392399B",
        row.customRate || "",
        row.dbkRate || "1.20",
        row.dbkQtyUnit || "209088.000 / PCS",
        row.dbkAmount || "6997.26",
        row.customSPE || "",
        row.dbkSPE || "0.00",
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
    console.log(data);
    console.log(data.containers);

    pdf.autoTable({
      head: [containerHeaders],
      body: containerRows.map((containers) => [
        containers.containerNo || "FTAU1600308",
        containers.size || "20",
        containers.type || "GP",
        containers.sealNo || "",
        containers.sealType || "BTSL - Bottle Seal",
        containers.sealDate || "",
        containers.sealDeviceID || "",
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

    // Additional Details
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("Additional Details", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    const additionalFields = [
      { label: "Inv/Item SLN", value: data.invItemSln || "1/1" },
      { label: "SQC Qty/Unit", value: data.sqcQtyUnit || "1890.000000 KGS" },
      {
        label: "Origin District",
        value: data.originDistrict || "446 - GANDHINAGAR",
      },
      { label: "Origin State", value: data.originState || "GUJARAT" },
      { label: "Comp. Cess Amount(INR)", value: data.compCessAmount || "0.00" },
      {
        label: "PTA/FTA",
        value:
          data.ptaFta ||
          "NCPTI - Preferential Trade Benefit not claimed at Importing Country",
      },
    ];

    additionalFields.forEach((field) => {
      yPos = drawField(field.label, field.value, leftX, yPos, 160);
      yPos += 9;
    });

    return yPos + 8;
  };

  // Update renderPage3 to start from where Page 2 left off
  const renderPage3 = (pdf, helpers, data) => {
    const { drawLine, drawField, leftX, rightX } = helpers;
    let yPos = 80;

    // SINGLE WINDOW - Additional Product Information
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("SINGLE WINDOW - Additional Product Information", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    const singleWindowHeaders = [
      "Inv No",
      "Item No",
      "Info Type",
      "Info Qualifier",
      "Info Code",
      "Information",
      "Measurement",
      "Unit",
    ];

    const singleWindowRows = Array.isArray(data.singleWindowData)
      ? data.singleWindowData
      : [data.singleWindowData];

    pdf.autoTable({
      head: [singleWindowHeaders],
      body: singleWindowRows.map((row) => [
        row.invNo || "1",
        row.itemNo || "1",
        row.infoType || "Duty",
        row.infoQualifier || "Remission of Duty",
        row.infoCode || "RODTEPY",
        row.information || "Claimed",
        row.measurement || "1890.000000",
        row.unit || "KGS",
      ]),
      startY: yPos,
      styles: {
        fontSize: FONT_SIZES.tableContent - 1,
        cellPadding: 1,
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

    // END USE INFORMATION
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("END USE INFORMATION", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    yPos = drawField("Code", data.endUseCode || "GNX200", leftX, yPos, 160);
    yPos += 9;
    yPos = drawField(
      "Inv / Item Sr.No.",
      data.endUseInvItem || "1/1",
      leftX,
      yPos,
      160
    );
    yPos += 15;

    pdf.setFont("helvetica", "bold");
    pdf.text("Code Description", leftX, yPos);
    yPos += 10;
    pdf.setFont("helvetica", "normal");
    const codeDesc =
      data.endUseDescription ||
      "Generic - For Commercial Assembly or processing (For Manufacture/Actual use)";
    const descLines = pdf.splitTextToSize(codeDesc, rightX - leftX);
    descLines.forEach((line) => {
      pdf.text(line, leftX, yPos);
      yPos += 10;
    });

    yPos += 10;

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
        row.invItemSr || "1/1",
        row.claimStatus || "RODTEPY",
        row.quantity || "1890.000000",
        row.rate || "0.900",
        row.capValue || "",
        row.noOfUnits || "1",
        row.rodtepAmount || "5247.94",
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
        decl.declType || "DEC",
        decl.declCode || "RD001",
        decl.invItemSrNo || "1/1",
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
  // Update renderPage4 for SUPPORTING DOCUMENTS
  const renderPage4 = (pdf, helpers, data) => {
    const { drawLine, leftX, rightX } = helpers;
    let yPos = 80;

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
    const headerSectionHeight = 60; // Height for header section

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

    // VALUES SECTION - All values below the header line
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZES.tableContent);
    let valueY = yPos;

    // Column 1 Values
    pdf.text(data.supportingDocs?.invItemSrNo || "1/0/1", col1, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docIssueDate || "20-Sep-2025", col1, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docExpiryDate || "", col1, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docTypeCode || "", col1, valueY);

    // Column 2 Values
    valueY = yPos;
    pdf.text(
      data.supportingDocs?.imageRefNo || "2025092200042373",
      col2,
      valueY
    );
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docRefNo || "APG/EXP/25-26/03", col2, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docUploadedOn || "", col2, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.docName || "", col2, valueY);

    // Column 3 Values
    valueY = yPos;
    pdf.text(data.supportingDocs?.icegateId || "RAJANSPPL", col3, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.fileType || "pdf", col3, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.placeOfIssue || "", col3, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.issuingPartyCode || "", col3, valueY);
    valueY += rowHeight;
    pdf.text(data.supportingDocs?.beneficiaryPartyCode || "", col3, valueY);

    // Column 4 Values (Issuing Party) - with text wrapping
    valueY = yPos;

    // Issuing Party Name
    const issuingPartyName =
      data.supportingDocs?.issuingPartyName ||
      "AMETA PACKAGING PRIVATE LIMITED";
    const issuingNameLines = pdf.splitTextToSize(issuingPartyName, 140);
    pdf.text(issuingNameLines, col4, valueY);
    valueY += issuingNameLines.length * 10;

    // Issuing Party Add1
    const issuingAdd1 =
      data.supportingDocs?.issuingPartyAdd1 ||
      "1103 - 1104, Parshwanath Business Park, Near Auda, Garden,";
    const add1Lines = pdf.splitTextToSize(issuingAdd1, 140);
    pdf.text(add1Lines, col4, valueY);
    valueY += add1Lines.length * 10;

    // Issuing Party Add2
    const issuingAdd2 = data.supportingDocs?.issuingPartyAdd2 || "Ahmedabad";
    const add2Lines = pdf.splitTextToSize(issuingAdd2, 140);
    pdf.text(add2Lines, col4, valueY);
    valueY += add2Lines.length * 10;

    // Issuing Party City
    pdf.text(
      data.supportingDocs?.issuingPartyCity || "Ahmedabad",
      col4,
      valueY
    );
    valueY += rowHeight;

    // Issuing Party Pin Code
    pdf.text(
      data.supportingDocs?.issuingPartyPinCode || "380015",
      col4,
      valueY
    );

    // Column 5 Values (Beneficiary Party) - with text wrapping
    valueY = yPos;

    // Beneficiary Party Name
    const beneficiaryName =
      data.supportingDocs?.beneficiaryPartyName || "TO ORDER";
    pdf.text(beneficiaryName, col5, valueY);
    valueY += rowHeight;

    // Beneficiary Party Add1
    const beneficiaryAdd1 =
      data.supportingDocs?.beneficiaryPartyAdd1 || "UK, United Kingdom";
    const beneficiaryAdd1Lines = pdf.splitTextToSize(beneficiaryAdd1, 140);
    pdf.text(beneficiaryAdd1Lines, col5, valueY);
    valueY += beneficiaryAdd1Lines.length * 10;

    // Beneficiary Party Add2
    pdf.text(data.supportingDocs?.beneficiaryPartyAdd2 || "", col5, valueY);
    valueY += rowHeight;

    // Beneficiary Party City
    pdf.text(data.supportingDocs?.beneficiaryPartyCity || "", col5, valueY);
    valueY += rowHeight;

    // Beneficiary Party Pin Code
    pdf.text(data.supportingDocs?.beneficiaryPartyPinCode || "", col5, valueY);

    // Calculate final Y position after the values section
    const maxValueHeight = Math.max(
      yPos + 4 * rowHeight, // Column 1 & 2 height
      yPos + 5 * rowHeight, // Column 3 height
      yPos +
        issuingNameLines.length * 10 +
        add1Lines.length * 10 +
        add2Lines.length * 10 +
        2 * rowHeight, // Column 4 height
      yPos + rowHeight + beneficiaryAdd1Lines.length * 10 + 3 * rowHeight // Column 5 height
    );

    yPos = maxValueHeight + 15;

    // FINAL DECLARATION
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(FONT_SIZES.sectionHeader);
    pdf.text("DECLARATION", leftX, yPos);
    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 17;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZES.declaration);
    const declarationLines = pdf.splitTextToSize(
      data.finalDeclaration,
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

    return yPos;
  };
  // ==================== MAIN GENERATOR ====================
  const generateExportChecklist = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-export-job/${jobNo}`
      );

      const exportJob = response.data;
      const currentDate = formatDate(new Date());

      // Prepare comprehensive data object with all fields from PDF
      const data = {
        // Basic Information
        sbNumber: exportJob.shippingbillnumber || exportJob.sbNo || "5550031",
        sbDate:
          formatDate(exportJob.shippingbilldate || exportJob.sb_date) ||
          "22-Sep-2025",
        jobNumber: exportJob.job_no || "AMD/EXP/SEA/01546/25-26",
        customStation: exportJob.customStation || "ICD Sabarmati, Ahmedabad",
        aeoRegistrationNo: exportJob.aeoRegistrationNo || "INABOFS1766L0F191",
        aeoRole: exportJob.aeoRole || "CUSTOMS",
        partyRef:
          exportJob.partyRef || exportJob.partyReference || "APG/EXP/25-26/03",
        chaCode:
          exportJob.chaCode ||
          "ABOFS1766LCH005 SURAJ FORWARDERS & SHIPPING AGENCIES",

        // Exporter & Consignee Details
        exporterDetails:
          exportJob.exporterName ||
          exportJob.exporter ||
          "ANEETA PACKAGING PRIVATE LIMITED\nBranch Ser #1\n1103 - 1104, Parshwanath Business Park,\nNear Auda, Garden,\nPrahladnagar",
        consigneeDetails:
          exportJob.consigneename ||
          exportJob.consigneeName ||
          exportJob.consigneeId ||
          "TO ORDER",

        // Shipping Details
        portOfLoading:
          exportJob.portofloading || "ICD Sabarmati, Ahmedabad(INSBIf6)",
        natureOfCargo: exportJob.natureOfCargo || "C - Containerised",
        portOfDischarge: exportJob.portofdischarge || "Southampton(GBSOU)",
        totalPackages: `${exportJob.totalPackages || "726"} BOX`,
        portOfDestination:
          exportJob.portOfDestination ||
          exportJob.portofdischarge ||
          "Southampton(GBSOU)",
        numberOfContainers: exportJob.numberOfContainers || "1",
        dischargeCountry:
          exportJob.dischargeCountry ||
          exportJob.countryoffinaldestination ||
          "United Kingdom",
        loosePackets: exportJob.loosePackets || "",
        countryOfDest: exportJob.countryoffinaldestination || "United Kingdom",
        grossWeight: `${exportJob.grossweightkg || "2330"}.000 KGS`,
        masterBlNo: exportJob.masterblno || "",
        netWeight: `${exportJob.netweightkg || "1890"}.000 KGS`,
        houseBlNo: exportJob.houseblno || "",
        rotationNo: exportJob.rotationNo || "",
        stateOfOrigin: exportJob.stateOfOrigin || "GUJARAT",
        adCode: exportJob.adCode || "0510052",

        // Financial Details
        totalFobInr:
          exportJob.totalFOBINR || exportJob.fobValINR || "583104.96",
        igstTaxableValue: exportJob.igstTaxableValue || "583104.61",
        igstAmount: exportJob.igstAmount || "104958.83",
        compCess: exportJob.compCess || "0.00",
        forexBankAcNo: exportJob.forexBankAcNo || "",
        dbkStr: exportJob.dbkStr || "6997.26",
        rbiWaiverNo: exportJob.rbiWaiverNo || "",
        strAmount: exportJob.strAmount || "",
        dbkBankAcNo: exportJob.dbkBankAcNo || "",
        totalDbk: exportJob.totalDBKINR || "6997.26",
        rodtepAmount: exportJob.rodtepAmount || "5247.94",

        // Invoice Details
        invoiceNo: exportJob.invoiceNo || "APG/EXP/25-26/03",
        invoiceValue: exportJob.invoiceValue || "USD 6690.82 (INR 583104.96)",
        invoiceDate: formatDate(exportJob.invoiceDate) || "20-Sep-2025",
        fobValue: exportJob.fobValue || "USD 6690.82 (INR 583104.96)",
        natureOfContract: exportJob.natureOfContract || "FOB",
        expContractNo: exportJob.expContractNo || "",
        expContractDate: formatDate(exportJob.expContractDate) || "",
        unitPriceIncludes: exportJob.unitPriceIncludes || "",
        invoiceCurrency: exportJob.invoiceCurrency || "USD",
        exchangeRate: exportJob.exchangeRate || "1 USD = 87.1500 INR",

        // Rate Details
        insurance: exportJob.insurance || "",
        freight: exportJob.freight || "",
        discount: exportJob.discount || "",
        commission: exportJob.commission || "",
        otherDeduction: exportJob.otherDeduction || "",
        packingCharges: exportJob.packingCharges || "",

        // Payment & Buyer Details
        natureOfPayment: exportJob.natureOfPayment || "",
        periodOfPayment: exportJob.periodOfPayment || "",
        buyerName:
          exportJob.buyerName ||
          "FARRAG PACKAGING\n3 SHELDON AVENUE\nVICARS CROSS\nCHESTER CH3 5LF UNITED KINGDOM",
        buyerAeoCode: exportJob.buyerAeoCode || "",
        buyerAeoCountry: exportJob.buyerAeoCountry || "",
        buyerAeoRole: exportJob.buyerAeoRole || "",
        thirdPartyDetails: exportJob.thirdPartyDetails || "",

        // EOU Details
        eou: exportJob.eou || "",
        iec: exportJob.iec || "",
        branchSno: exportJob.branchSno || "1",
        factoryAddress: exportJob.factoryAddress || "",

        // Marks & Nos
        marksAndNos:
          exportJob.marksAndNos ||
          "WE INTEND TO CLAIM BENEFIT UNDER RODTEP SCHEME AS APPLICABLE.",

        // Item Details
        products: exportJob.products || [
          // In the data preparation section, add these product fields:
          {
            ritc: "39233090",
            description:
              "EMPTY HDPE BOTTLES - HDPE BOTTLES 60 ML AS PER INVOICE",
            quantity: "209088.000",
            per: "PCS",
            unitPrice: "0.032000/PCS",
            amount: "6690.82",
            pmvPerUnit: "3.07",
            totalPMV: "641900.16",
            eximCode: "19 (Drawback (DBK))",
            nfeiCategory: "",
            rewardItem: true,
            fobValueFC: "6690.82",
            fobValueINR: "583104.96",
            igstPaymentStatus: "P",
            taxableValueINR: "583104.61",
            igstAmountINR: "104958.83",
          },
        ],

        // Also add these total fields:
        totalPmv: exportJob.totalPmv || "641900.16",
        totalIgst: exportJob.totalIgst || "104958.83",
        totalPmvGross: exportJob.totalPmvGross || "641900.16",
        totalIgstGross: exportJob.totalIgstGross || "104958.83",

        // DBK Details
        dbkData: exportJob.drawbackDetails || [
          {
            invNo: "1",
            itemNo: "1",
            dbkSlNo: "392399B",
            customRate: "",
            dbkRate: "1.20",
            dbkQtyUnit: "209088.000 / PCS",
            dbkAmount: "6997.26",
            customSPE: "",
            dbkSPE: "0.00",
          },
        ],

        // Vessel & Container Details
        factoryStuffed: exportJob.factoryStuffed || "No",
        sealType: exportJob.sealType || "BTSL - Bottle Seal",
        sampleAcc: exportJob.sampleAcc || "No",
        vesselName: exportJob.vesselName || "FTAU1600308",
        voyageNumber: exportJob.voyageNumber || "",
        containers: exportJob.containers,

        // Additional Details
        invItemSln: exportJob.invItemSln || "1/1",
        sqcQtyUnit: exportJob.sqcQtyUnit || "1890.000000 KGS",
        originDistrict: exportJob.originDistrict || "446 - GANDHINAGAR",
        originState: exportJob.originState || "GUJARAT",
        compCessAmount: exportJob.compCessAmount || "0.00",
        ptaFta:
          exportJob.ptaFta ||
          "NCPTI - Preferential Trade Benefit not claimed at Importing Country",

        // Single Window Data
        singleWindowData: exportJob.singleWindowData || [
          {
            invNo: "1",
            itemNo: "1",
            infoType: "Duty",
            infoQualifier: "Remission of Duty",
            infoCode: "RODTEPY",
            information: "Claimed",
            measurement: "1890.000000",
            unit: "KGS",
          },
        ],

        // End Use Information
        endUseCode: exportJob.endUseCode || "GNX200",
        endUseInvItem: exportJob.endUseInvItem || "1/1",
        endUseDescription:
          exportJob.endUseDescription ||
          "Generic - For Commercial Assembly or processing (For Manufacture/Actual use)",

        // RODTEP Data
        rodtepData: exportJob.rodtepData || [
          {
            invItemSr: "1/1",
            claimStatus: "RODTEPY",
            quantity: "1890.000000",
            rate: "0.900",
            capValue: "",
            noOfUnits: "1",
            rodtepAmount: "5247.94",
          },
        ],

        // Declaration Data
        declarationData: exportJob.declarationData || [
          {
            declType: "DEC",
            declCode: "RD001",
            invItemSrNo: "1/1",
          },
        ],
        declarationText: `I/We, in regard to my/our claim under RoDTEP scheme made in this Shipping Bill or Bill of Export, hereby declare that:

1. I/ We undertake to abide by the provisions, including conditions, restrictions, exclusions and time-limits as provided under RoDTEP scheme, and relevant notifications, regulations, etc., as amended from time to time.

2. Any claim made in this shipping bill or bill of export is not with respect to any duties or taxes or levies which are exempted or remitted or credited under any other mechanism outside RoDTEP.

3. I/We undertake to preserve and make available relevant documents relating to the exported goods for the purposes of audit in the manner and for the time period prescribed in the Customs Audit Regulations, 2018.`,

        // Supporting Documents
        supportingDocs: exportJob.supportingDocs || [
          {
            invItemSrNo: "1/0/1",
            imageRefNo: "2025092200042373",
            icegateId: "RAJANSPPL",
            issuingPartyName: "ANEETA PACKAGING PRIVATE LIMITED",
            beneficiaryPartyName: "TO ORDER",
            docIssueDate: "20-Sep-2025",
            docRefNo: "APG/EXP/25-26/03",
            fileType: "pdf",
            issuingPartyAdd1:
              "1103 - 1104, Parshwanath Business Park, Near Auda, Garden, Ahmedabad 380015",
            beneficiaryPartyAdd1: "UK, United Kingdom",
            docExpiryDate: "",
            docUploadedOn: "",
            placeOfIssue: "",
            issuingPartyAdd2: "",
            beneficiaryPartyAdd2: "",
            docTypeCode: "",
            docName: "",
            issuingPartyCode: "",
            issuingPartyCity: "",
            beneficiaryPartyCity: "",
            beneficiaryPartyCode: "",
            issuingPartyPinCode: "",
            beneficiaryPartyPinCode: "",
          },
        ],

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
      {renderAsIcon ? (
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
