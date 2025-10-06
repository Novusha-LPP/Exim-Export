import PDFDocument from "pdfkit";
import ExportJob from "../../model/export/ExJobModel.mjs";
import express from "express";

const router = express.Router();

/**
 * Generate Export Checklist PDF with EXACT formatting matching the attached PDF
 */
export const generateExportChecklist = async (jobNumber) => {
  try {
    const exportJob = await ExportJob.findOne({ job_no: jobNumber }).exec();
      
    if (!exportJob) {
      throw new Error(`Export job with job number ${jobNumber} not found`);
    }

    const doc = new PDFDocument({ margin: 10, size: "A4" });
    const chunks = [];
    
    doc.on("data", (chunk) => chunks.push(chunk));

    // ==================== HELPER FUNCTIONS ====================
    
    const drawFieldBox = (x, y, width, height, label, value, fontSize = 6, labelFontSize = 5) => {
      // Draw box border
      doc.rect(x, y, width, height).stroke();
      
      // Label (bold, smaller font)
      if (label) {
        doc.fontSize(labelFontSize).font("Helvetica-Bold").fillColor("black");
        doc.text(label, x + 1, y + 1, { width: width - 2 });
      }
      
      // Value (regular font, below label)
      doc.fontSize(fontSize).font("Helvetica").fillColor("black");
      const valueY = label ? y + 8 : y + 2;
      doc.text(value || "", x + 1, valueY, { width: width - 2, lineGap: -1 });
    };

    const drawHeader = (pageNum) => {
      // Company name (centered, large)
      doc.fontSize(12).font("Helvetica-Bold").fillColor("black");
      doc.text("SURAJ FORWARDERS & SHIPPING AGENCIES", 0, 15, { align: "center", width: doc.page.width });
      
      // Subtitle (centered)
      doc.fontSize(9).text("Checklist for Shipping Bill", 0, 30, { align: "center", width: doc.page.width });
      
      // Date and page (right aligned)
      const currentDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
      });
      doc.fontSize(8).font("Helvetica");
      doc.text(`Printed On : ${currentDate}`, 450, 30);
      doc.text(`${pageNum}/3`, 550, 45);
    };

    const drawSectionHeader = (y, text) => {
      doc.fontSize(8).font("Helvetica-Bold").fillColor("black");
      doc.text(text, 10, y);
      // Draw underline
      doc.moveTo(10, y + 10).lineTo(585, y + 10).stroke();
      return y + 15;
    };

    // Extract all data (same structure as your PDF)
    const sbNumber = exportJob.shippingbillnumber || exportJob.sbNo || "";
    const sbDate = exportJob.shippingbilldate || exportJob.sb_date || "";
    const jobNo = exportJob.job_no || "";

    // ==================== PAGE 1 - EXACT LAYOUT ====================
    drawHeader(1);
    
    let yPos = 55;
    
    // Row 1: SB No./Date | Job No | CHA (exact widths from PDF)
    drawFieldBox(10, yPos, 170, 18, "SB No. / Date", `${sbNumber} dt ${sbDate}`, 6, 5);
    drawFieldBox(185, yPos, 170, 18, "Job No", jobNo, 6, 5);
    drawFieldBox(360, yPos, 225, 18, "CHA", "ABOFS1766LCH005 SURAJ FORWARDERS & SHIPPING AGENCIES", 5.5, 5);
    yPos += 20;

    // Row 2: CONSIGNEE | Port Of Discharge | Gross Weight | Country of Dest
    const consigneeName = exportJob.consigneename || exportJob.consigneeName || "";
    const consigneeId = exportJob.consigneeId || exportJob.iecNo || "";
    
    drawFieldBox(10, yPos, 200, 18, "CONSIGNEE", consigneeName, 6, 5);
    drawFieldBox(215, yPos, 120, 18, "Port Of Discharge", exportJob.portofdischarge || "", 6, 5);
    drawFieldBox(340, yPos, 100, 18, "Gross Weight", `${exportJob.grossweightkg || 0}.000 KGS`, 6, 5);
    drawFieldBox(445, yPos, 140, 18, "Country of Dest", exportJob.countryoffinaldestination || "", 6, 5);
    yPos += 20;

    // Row 3: Consignee ID and address details
    drawFieldBox(10, yPos, 60, 18, "", consigneeId, 6, 5);
    drawFieldBox(75, yPos, 370, 18, "", exportJob.consigneeaddress || "Branch Ser #1", 6, 5);
    yPos += 20;

    // Row 4: Address continuation
    const addressLine2 = [
      exportJob.consigneeAddress2 || "1103 - 1104, Parshwanath Business Park,",
      exportJob.consigneeAddress3 || "Near Auda, Garden,"
    ].join("\n");
    
    drawFieldBox(10, yPos, 200, 25, "", addressLine2, 5.5, 5);
    yPos += 27;

    // Row 5: Final address line and shipping info
    const finalAddressLine = exportJob.consigneeArea || "Prahladnagar";
    drawFieldBox(10, yPos, 100, 18, "", finalAddressLine, 6, 5);
    
    // Shipping info (right side)
    drawFieldBox(340, yPos, 100, 18, "", "TO ORDER", 6, 5);
    drawFieldBox(445, yPos, 70, 18, "", "UK", 6, 5);
    drawFieldBox(520, yPos, 65, 18, "", "United Kingdom", 5.5, 5);
    yPos += 20;

    // Row 6: Port details
    drawFieldBox(215, yPos, 225, 18, "", exportJob.portDetails || "Southampton(GBSOU)", 6, 5);
    yPos += 20;

    // Row 7: Master BL | Nature of Cargo | Port Of Loading
    drawFieldBox(10, yPos, 170, 18, "Master BL No.", exportJob.masterblno || "", 6, 5);
    drawFieldBox(185, yPos, 120, 18, "Nature of Cargo", "C - Containerised", 6, 5);
    drawFieldBox(310, yPos, 275, 18, "Port Of Loading", exportJob.portofloading || "ICD Sabarmati, Ahmedabad(INSBI6)", 6, 5);
    yPos += 20;

    // Row 8: Loose pkts | Net Weight | No Of Cntnrs
    drawFieldBox(10, yPos, 80, 18, "Loose pkts.", "", 6, 5);
    drawFieldBox(95, yPos, 100, 18, "Net Weight", `${exportJob.netweightkg || 0}.000 KGS`, 6, 5);
    drawFieldBox(200, yPos, 50, 18, "No Of Cntnrs", "1", 6, 5);
    yPos += 20;

    // Row 9: House BL | Invoice Details | Insurance
    drawFieldBox(10, yPos, 200, 18, "House BL No.", "", 6, 5);
    drawFieldBox(215, yPos, 120, 18, "Invoice Details", "Invoice 1 / 1", 6, 5);
    drawFieldBox(340, yPos, 60, 18, "Insurance", "0", 6, 5);
    yPos += 20;

    // Row 10: EOU IEC (full width)
    drawFieldBox(10, yPos, 575, 18, "EOU IEC", exportJob.iecNo || exportJob.iec || "", 6, 5);
    yPos += 20;

    // Factory Address section (full width, larger height)
    const factoryAddress = [
      exportJob.exporterName || "ANEETA PACKAGING PRIVATE LIMITED",
      "Branch Ser #1",
      exportJob.exporterAddress || "1103 - 1104, Parshwanath Business Park, Near Auda, Garden, Prahladnagar"
    ].join("\n");
    
    drawFieldBox(10, yPos, 575, 35, "Factory Address", factoryAddress, 6, 5);
    yPos += 40;

    // ==================== ITEM DETAILS TABLE (EXACT) ====================
    yPos = drawSectionHeader(yPos, "ITEM DETAILS");
    
    // Table headers with exact positioning
    const itemHeaders = ["Sl No", "Qty", "Unit", "RITC", "Description", "Unit Price / Unit", "FOB Val(FC)", "Total Value(FC)", "PMV/Unit", "Total PMV(INR)"];
    const colX = [10, 35, 80, 110, 150, 300, 380, 440, 500, 545];
    const colWidths = [25, 45, 30, 40, 150, 80, 60, 60, 45, 40];
    
    // Draw table header row with borders
    doc.fontSize(5.5).font("Helvetica-Bold");
    itemHeaders.forEach((header, i) => {
      doc.rect(colX[i], yPos, colWidths[i], 12).stroke();
      doc.text(header, colX[i] + 1, yPos + 2, { width: colWidths[i] - 2, align: "center" });
    });
    yPos += 12;

    // Product data (exact from PDF)
    const productList = exportJob.products || [];
    productList.forEach((item, index) => {
      doc.fontSize(5.5).font("Helvetica");
      const itemData = [
        (index + 1).toString(),
        (item.quantity || "").toString(),
        item.unit || item.per || "",
        item.hscode || item.ritc || "",
        item.description || "",
        (item.unitPrice || "").toString() + "/PCS",
        (item.amount || item.fobvalue || "").toString(),
        (item.amount || item.fobvalue || "").toString(),
        (item.pmvPerUnit || "").toString(),
        (item.totalPMV || "").toString()
      ];
      
      itemData.forEach((data, i) => {
        doc.rect(colX[i], yPos, colWidths[i], 10).stroke();
        doc.text(data, colX[i] + 1, yPos + 2, { width: colWidths[i] - 2 });
      });
      yPos += 10;
    });

    yPos += 5;
    
    // Total PMV section (right aligned, exact positioning)
    drawFieldBox(500, yPos, 45, 15, "Total PMV", exportJob.totalPMV || "", 6, 5);
    drawFieldBox(545, yPos, 40, 15, "Total PMV (Gross)", exportJob.totalPMVGross || "", 6, 5);
    yPos += 20;

    // ==================== EXPORTER DETAILS (EXACT SEQUENCE) ====================
    yPos = drawSectionHeader(yPos, "EXPORTER DETAILS");
    
    // Row 1: Total Packages | RBI Waiver | Rotation | State | DBK+STR | Ad. Code
    drawFieldBox(10, yPos, 80, 16, "Total Packages", `${exportJob.totalPackages || ""} BOX`, 6, 5);
    drawFieldBox(95, yPos, 90, 16, "RBI Waiver No/Dt", "", 6, 5);
    drawFieldBox(190, yPos, 90, 16, "Rotation No/Dt.", "", 6, 5);
    drawFieldBox(285, yPos, 70, 16, "State of Origin", "GUJARAT", 6, 5);
    drawFieldBox(360, yPos, 80, 16, "DBK+STR (INR)", exportJob.dbkStr || "", 6, 5);
    drawFieldBox(445, yPos, 70, 16, "Ad. Code", exportJob.adCode || "", 6, 5);
    yPos += 18;

    // Row 2: Forex Bank | DBK Bank | Nature of contract | Exchange Rate
    drawFieldBox(10, yPos, 100, 16, "Forex Bank A/c No", "", 6, 5);
    drawFieldBox(115, yPos, 100, 16, "DBK Bank A/c No", "", 6, 5);
    drawFieldBox(220, yPos, 80, 16, "Nature of contract", "FOB", 6, 5);
    drawFieldBox(305, yPos, 280, 16, "Exch. Rate", "1 USD = 87.1500 INR", 6, 5);
    yPos += 18;

    // Rate table header
    doc.fontSize(6).font("Helvetica-Bold");
    doc.text("Rate", 10, yPos);
    doc.text("Currency", 80, yPos);
    doc.text("Amount", 150, yPos);
    yPos += 12;

    // Rate details (exactly as PDF)
    const rateDetails = ["Freight", "Discount", "Commission", "Other Deduction", "Packing Charges"];
    doc.fontSize(6).font("Helvetica");
    rateDetails.forEach(rate => {
      doc.text(rate, 10, yPos);
      yPos += 10;
    });
    yPos += 5;

    // Marks & Nos and Buyer's Name & Address (exact positioning)
    const marksAndNos = "WE INTEND TO CLAIM BENEFIT UNDER RODTEP SCHEME AS APPLICABLE.";
    const buyerDetails = exportJob.buyerNameAddress || "";
    
    drawFieldBox(10, yPos, 200, 25, "Marks & Nos", marksAndNos, 5.5, 5);
    drawFieldBox(215, yPos, 370, 25, "Buyer's Name & Address", buyerDetails, 5.5, 5);
    yPos += 28;

    // Payment details row
    drawFieldBox(10, yPos, 80, 16, "Nature Of Payment", "AP", 6, 5);
    drawFieldBox(95, yPos, 80, 16, "Period Of Payment", "0 days", 6, 5);
    drawFieldBox(180, yPos, 405, 16, "Exim Scheme Code & description", exportJob.eximScheme || "", 6, 5);
    yPos += 18;

    // Additional details row (exact sequence)
    drawFieldBox(10, yPos, 60, 16, "NFEI Catg", "", 6, 5);
    drawFieldBox(75, yPos, 80, 16, "FOB Val(INR)", exportJob.fobValINR || "", 6, 5);
    drawFieldBox(160, yPos, 70, 16, "Party Ref", exportJob.partyRef || "", 6, 5);
    drawFieldBox(235, yPos, 120, 16, "Port Of Destination", exportJob.portOfDestination || "", 6, 5);
    drawFieldBox(360, yPos, 100, 16, "STR Amount (INR)", exportJob.strAmount || "", 6, 5);
    drawFieldBox(465, yPos, 120, 16, "Discharge Country", exportJob.dischargeCountry || "", 6, 5);
    yPos += 18;

    // Final row (exact sequence)
    drawFieldBox(10, yPos, 100, 16, "Total FOB (INR)", exportJob.totalFOBINR || "", 6, 5);
    drawFieldBox(115, yPos, 80, 16, "Total DBK (INR)", exportJob.totalDBKINR || "", 6, 5);
    drawFieldBox(200, yPos, 90, 16, "IGST Pymt Status", "Yes", 6, 5);
    drawFieldBox(295, yPos, 100, 16, "IGST Taxable Value", exportJob.igstTaxableValue || "", 6, 5);
    drawFieldBox(400, yPos, 90, 16, "IGST Amount", exportJob.igstAmount || "", 6, 5);
    drawFieldBox(495, yPos, 90, 16, "AEO Code", exportJob.aeoCode || "", 6, 5);
    yPos += 18;

    // AEO and contract details
    drawFieldBox(10, yPos, 80, 16, "AEO Country", exportJob.aeoCountry || "", 6, 5);
    drawFieldBox(95, yPos, 80, 16, "AEO Role", exportJob.aeoRole || "", 6, 5);
    drawFieldBox(180, yPos, 120, 16, "Exp Contract No.", exportJob.expContractNo || "", 6, 5);
    drawFieldBox(305, yPos, 80, 16, "Total IGST", exportJob.totalIGST || "", 6, 5);
    drawFieldBox(390, yPos, 90, 16, "Total IGST (Gross)", exportJob.totalIGSTGross || "", 6, 5);
    drawFieldBox(485, yPos, 100, 16, "Third Party Name & Addr.", exportJob.thirdPartyNameAddr || "", 6, 5);
    yPos += 18;

    // Final details row
    drawFieldBox(10, yPos, 80, 16, "Branch Sno", exportJob.branchSno || "", 6, 5);
    drawFieldBox(95, yPos, 85, 16, "Reward Item", exportJob.rewardItem || "", 6, 5);
    drawFieldBox(185, yPos, 120, 16, "AEO Registration No.", exportJob.aeoRegistrationNo || "", 6, 5);
    drawFieldBox(310, yPos, 80, 16, "AEO Role :", "", 6, 5);
    drawFieldBox(395, yPos, 90, 16, "IGST Taxable Value(INR)", exportJob.igstTaxableValueINR || "", 6, 5);
    drawFieldBox(490, yPos, 95, 16, "Exp Contract Date", exportJob.expContractDate || "", 6, 5);

    // ==================== PAGE 2 ====================
    doc.addPage();
    drawHeader(2);
    yPos = 55;

    // Top info row
    drawFieldBox(10, yPos, 170, 18, "SB No. / Date", `${sbNumber} dt ${sbDate}`, 6, 5);
    drawFieldBox(185, yPos, 400, 18, "Job No", jobNo, 6, 5);
    yPos += 25;

    // Invoice details row (exact from PDF)
    drawFieldBox(10, yPos, 60, 16, "Inv. No", exportJob.invoiceNo || "", 6, 5);
    drawFieldBox(75, yPos, 70, 16, "Inv. Date", exportJob.invoiceDate || "", 6, 5);
    drawFieldBox(150, yPos, 80, 16, "Unit Price Includes", "None", 6, 5);
    drawFieldBox(235, yPos, 100, 16, "Inv. Value", exportJob.invoiceValue || "", 5.5, 5);
    drawFieldBox(340, yPos, 100, 16, "FOB Value", exportJob.fobValue || "", 5.5, 5);
    drawFieldBox(445, yPos, 90, 16, "RODTEP Amount(INR)", exportJob.rodtepAmount || "", 6, 5);
    drawFieldBox(540, yPos, 45, 16, "Inv. Currency", exportJob.invoiceCurrency || "USD", 6, 5);
    yPos += 20;

    // ==================== DBK DETAILS ====================
    yPos = drawSectionHeader(yPos, "DBK DETAILS");
    
    const dbkHeaders = ["Inv No", "Item No", "DBK Sl No", "Custom Rate", "DBK Qty / Unit", "DBK Amount", "DBK Rate", "Custom SPE", "DBK SPE"];
    const dbkX = [10, 50, 90, 140, 200, 280, 340, 400, 480];
    const dbkWidths = [40, 40, 50, 60, 80, 60, 60, 80, 105];
    
    // DBK table headers
    doc.fontSize(5.5).font("Helvetica-Bold");
    dbkHeaders.forEach((header, i) => {
      doc.rect(dbkX[i], yPos, dbkWidths[i], 12).stroke();
      doc.text(header, dbkX[i] + 1, yPos + 2, { width: dbkWidths[i] - 2, align: "center" });
    });
    yPos += 12;

    // DBK data rows
    const dbkData = exportJob.dbkDetails || [];
    dbkData.forEach(item => {
      doc.fontSize(5.5).font("Helvetica");
      const dbkRow = [
        item.invNo || "1",
        item.itemNo || "1", 
        item.dbkSlNo || "",
        item.customRate || "",
        item.dbkQty || "",
        item.dbkAmount || "",
        item.dbkRate || "",
        item.customSPE || "",
        item.dbkSPE || ""
      ];
      
      dbkRow.forEach((data, i) => {
        doc.rect(dbkX[i], yPos, dbkWidths[i], 10).stroke();
        doc.text(data, dbkX[i] + 1, yPos + 2, { width: dbkWidths[i] - 2 });
      });
      yPos += 10;
    });
    yPos += 15;

    // ==================== VESSEL DETAILS ====================
    yPos = drawSectionHeader(yPos, "VESSEL DETAILS");
    drawFieldBox(10, yPos, 90, 16, "Factory Stuffed", "No", 6, 5);
    drawFieldBox(105, yPos, 90, 16, "Sample Acc.", "No", 6, 5);
    drawFieldBox(200, yPos, 180, 16, "Vessel Name", exportJob.vesselName || "", 6, 5);
    drawFieldBox(385, yPos, 200, 16, "Voyage Number", exportJob.voyageNumber || "", 6, 5);
    yPos += 20;

    // ==================== CONTAINER DETAILS ====================
    yPos = drawSectionHeader(yPos, "CONTAINER DETAILS");
    const contHeaders = ["Container No", "Size", "Type", "Seal No", "Seal Date"];
    const contX = [10, 120, 180, 240, 320];
    const contWidths = [110, 60, 60, 80, 100];
    
    doc.fontSize(5.5).font("Helvetica-Bold");
    contHeaders.forEach((header, i) => {
      doc.rect(contX[i], yPos, contWidths[i], 12).stroke();
      doc.text(header, contX[i] + 1, yPos + 2, { width: contWidths[i] - 2, align: "center" });
    });
    yPos += 12;

    const containers = exportJob.containers || [];
    containers.forEach(cont => {
      doc.fontSize(5.5).font("Helvetica");
      const contRow = [
        cont.containerNo || "",
        cont.size || "20",
        cont.type || "GP", 
        cont.sealNo || "",
        cont.sealDate || ""
      ];
      
      contRow.forEach((data, i) => {
        doc.rect(contX[i], yPos, contWidths[i], 10).stroke();
        doc.text(data, contX[i] + 1, yPos + 2, { width: contWidths[i] - 2 });
      });
      yPos += 10;
    });
    yPos += 15;

    // Continue with remaining Page 2 sections...

    // ==================== PAGE 3 ====================
    doc.addPage();
    drawHeader(3);
    yPos = 55;

    // Top info
    drawFieldBox(10, yPos, 170, 18, "SB No. / Date", `${sbNumber} dt ${sbDate}`, 6, 5);
    drawFieldBox(185, yPos, 400, 18, "Job No", jobNo, 6, 5);
    yPos += 25;

    // AEO Registration details
    drawFieldBox(10, yPos, 300, 16, "AEO Registration No.", exportJob.aeoRegistrationNo || "", 6, 5);
    drawFieldBox(315, yPos, 270, 16, "AEO Role :", exportJob.aeoRole || "", 6, 5);
    yPos += 20;

    // ==================== DECLARATION TEXT ====================
    yPos = drawSectionHeader(yPos, "DECLARATION");
    doc.fontSize(7).font("Helvetica");
    const declarationText = [
      "Signature of Exporter/CHA with date",
      "",
      "1. I/We declare that the particulars given herein are true and are correct.",
      "2. I/We undertake to abide by the provisions of Foreign Exchange Management Act, 1999, as amended from time to time, including",
      "realisation or repatriation of foreign exchange to or from India."
    ];
    
    declarationText.forEach(line => {
      doc.text(line, 10, yPos);
      yPos += 10;
    });
    yPos += 10;

    // ==================== SUPPORTING DOCUMENTS ====================
    yPos = drawSectionHeader(yPos, "SUPPORTING DOCUMENTS");
    const docHeaders = ["Inv/Item/SrNo.", "ICEGATE ID", "Image Ref.No.(IRN)", "Beneficiary Party Name", "Issuing Party Name", "Doc Issue Date", "Doc Ref.No."];
    const docX = [10, 75, 135, 215, 285, 360, 435];
    const docWidths = [65, 60, 80, 70, 75, 75, 150];
    
    doc.fontSize(5.5).font("Helvetica-Bold");
    docHeaders.forEach((header, i) => {
      doc.rect(docX[i], yPos, docWidths[i], 12).stroke();
      doc.text(header, docX[i] + 1, yPos + 2, { width: docWidths[i] - 2, align: "center" });
    });
    yPos += 12;

    const supportingDocs = exportJob.supportingDocuments || [];
    supportingDocs.forEach(sDoc => {
      doc.fontSize(5.5).font("Helvetica");
      const docRow = [
        sDoc.invItemSrNo || "",
        sDoc.icegateId || "",
        sDoc.imageRefNo || "",
        sDoc.beneficiaryPartyName || "",
        sDoc.issuingPartyName || "",
        sDoc.docIssueDate || "",
        sDoc.docRefNo || ""
      ];
      
      docRow.forEach((data, i) => {
        doc.rect(docX[i], yPos, docWidths[i], 10).stroke();
        doc.text(data, docX[i] + 1, yPos + 2, { width: docWidths[i] - 2 });
      });
      yPos += 10;
    });

    doc.end();
    
    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
    
  } catch (error) {
    console.error("Error generating export checklist:", error);
    throw error;
  }
};

// ==================== API ENDPOINT ====================
router.get('/api/export-checklist/:job_no', async (req, res) => {
  try {
    const { job_no } = req.params;
    
    if (!job_no) {
      return res.status(400).json({ 
        success: false,
        error: "Job number is required" 
      });
    }

    const pdfBuffer = await generateExportChecklist(job_no);
    const filename = `Export-CheckList-${job_no}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error("Export checklist generation error:", error);
    
    if (error.message.includes("not found")) {
      return res.status(404).json({ 
        success: false,
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to generate Export Checklist PDF" 
    });
  }
});

export default router;
