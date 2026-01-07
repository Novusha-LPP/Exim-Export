import PDFDocument from "pdfkit";
import ExportJob from "../../model/export/ExJobModel.mjs";
import express from "express";

const router = express.Router();

/**
 * Generate Export Checklist PDF - PURE DATABASE DATA ONLY
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

    const drawFieldBox = (
      x,
      y,
      width,
      height,
      label,
      value,
      fontSize = 6,
      labelFontSize = 5
    ) => {
      doc.rect(x, y, width, height).stroke();

      if (label) {
        doc.fontSize(labelFontSize).font("Helvetica-Bold").fillColor("black");
        doc.text(label, x + 1, y + 1, { width: width - 2 });
      }

      doc.fontSize(fontSize).font("Helvetica").fillColor("black");
      const valueY = label ? y + 8 : y + 2;
      doc.text(value || "", x + 1, valueY, { width: width - 2, lineGap: -1 });
    };

    const drawHeader = (pageNum) => {
      doc.fontSize(12).font("Helvetica-Bold").fillColor("black");
      doc.text(
        exportJob.companyName || "SURAJ FORWARDERS & SHIPPING AGENCIES",
        0,
        15,
        { align: "center", width: doc.page.width }
      );

      doc
        .fontSize(9)
        .text("Checklist for Shipping Bill", 0, 30, {
          align: "center",
          width: doc.page.width,
        });

      const currentDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      doc.fontSize(8).font("Helvetica");
      doc.text(`Printed On : ${currentDate}`, 450, 30);
      doc.text(`${pageNum}/4`, 550, 45);
    };

    const drawSectionHeader = (y, text) => {
      doc.fontSize(8).font("Helvetica-Bold").fillColor("black");
      doc.text(text, 10, y);
      doc
        .moveTo(10, y + 10)
        .lineTo(585, y + 10)
        .stroke();
      return y + 15;
    };

    // ==================== PAGE 1 ====================
    drawHeader(1);
    let yPos = 55;

    drawFieldBox(
      10,
      yPos,
      170,
      18,
      "SB No. / Date",
      `${exportJob.shippingbillnumber} dt ${exportJob.shippingbilldate}`,
      6,
      5
    );
    drawFieldBox(185, yPos, 170, 18, "Job No", exportJob.job_no, 6, 5);
    drawFieldBox(360, yPos, 225, 18, "CHA", exportJob.cha, 5.5, 5);
    yPos += 20;

    drawFieldBox(10, yPos, 200, 18, "CONSIGNEE", exportJob.consigneename, 6, 5);
    drawFieldBox(
      215,
      yPos,
      120,
      18,
      "Port Of Discharge",
      exportJob.portofdischarge,
      6,
      5
    );
    drawFieldBox(
      340,
      yPos,
      100,
      18,
      "Gross Weight",
      `${exportJob.grossweightkg || 0}.000 KGS`,
      6,
      5
    );
    drawFieldBox(
      445,
      yPos,
      140,
      18,
      "Country of Dest",
      exportJob.countryoffinaldestination,
      6,
      5
    );
    yPos += 20;

    drawFieldBox(10, yPos, 60, 18, "", exportJob.consigneeId, 6, 5);
    drawFieldBox(75, yPos, 370, 18, "", exportJob.consigneeaddress, 6, 5);
    yPos += 20;

    const addressLine2 = [
      exportJob.consigneeAddress2,
      exportJob.consigneeAddress3,
    ]
      .filter(Boolean)
      .join("\n");
    drawFieldBox(10, yPos, 200, 25, "", addressLine2, 5.5, 5);
    yPos += 27;

    drawFieldBox(10, yPos, 100, 18, "", exportJob.consigneeArea, 6, 5);
    drawFieldBox(340, yPos, 100, 18, "", exportJob.consigneeCountry, 6, 5);
    drawFieldBox(445, yPos, 70, 18, "", exportJob.consigneeCountryCode, 6, 5);
    drawFieldBox(520, yPos, 65, 18, "", exportJob.consigneeCountryFull, 5.5, 5);
    yPos += 20;

    drawFieldBox(215, yPos, 225, 18, "", exportJob.portDetails, 6, 5);
    yPos += 20;

    drawFieldBox(
      10,
      yPos,
      170,
      18,
      "Master BL No.",
      exportJob.masterblno,
      6,
      5
    );
    drawFieldBox(
      185,
      yPos,
      120,
      18,
      "Nature of Cargo",
      exportJob.natureofcargo,
      6,
      5
    );
    drawFieldBox(
      310,
      yPos,
      275,
      18,
      "Port Of Loading",
      exportJob.portofloading,
      6,
      5
    );
    yPos += 20;

    drawFieldBox(10, yPos, 80, 18, "Loose pkts.", exportJob.loosepkgs, 6, 5);
    drawFieldBox(
      95,
      yPos,
      100,
      18,
      "Net Weight",
      `${exportJob.netweightkg || 0}.000 KGS`,
      6,
      5
    );
    drawFieldBox(
      200,
      yPos,
      50,
      18,
      "No Of Cntnrs",
      exportJob.noofcontainers,
      6,
      5
    );
    yPos += 20;

    drawFieldBox(10, yPos, 200, 18, "House BL No.", exportJob.houseblno, 6, 5);
    drawFieldBox(215, yPos, 120, 18, "Invoice Details", "Invoice 1 / 1", 6, 5);
    drawFieldBox(
      340,
      yPos,
      60,
      18,
      "Insurance",
      exportJob.insuranceAmount,
      6,
      5
    );
    yPos += 20;

    drawFieldBox(10, yPos, 575, 18, "EOU IEC", exportJob.iecNo, 6, 5);
    yPos += 20;

    const factoryAddress = [
      exportJob.exporterName,
      exportJob.branchcode,
      exportJob.exporterAddress,
    ]
      .filter(Boolean)
      .join("\n");
    drawFieldBox(10, yPos, 575, 35, "Factory Address", factoryAddress, 6, 5);
    yPos += 40;

    // ==================== PAGE 2 - ITEM DETAILS ====================
    doc.addPage();
    drawHeader(2);
    yPos = 55;

    yPos = drawSectionHeader(yPos, "ITEM DETAILS");

    const itemHeaders = [
      "SI No",
      "Qty",
      "Unit",
      "RITC",
      "Exim Scheme Code description",
      "NFEI Catg",
      "Reward Item",
      "Description",
      "Unit Price Unit",
      "FOB ValFC",
      "FOB ValINR",
      "Total ValueFC",
      "IGST Pymt Status",
      "PMVUnit",
      "IGST Taxable Value",
      "Total PMVINR",
      "IGST Amount",
    ];
    const colX = [
      10, 35, 60, 90, 130, 200, 240, 270, 370, 430, 470, 510, 540, 570, 600,
    ];
    const colWidths = [
      25, 25, 30, 40, 70, 40, 30, 100, 60, 40, 40, 30, 30, 30, 30, 40, 40,
    ];

    doc.fontSize(5.5).font("Helvetica-Bold");
    for (let i = 0; i < itemHeaders.length; i++) {
      if (colX[i] && colWidths[i]) {
        doc.rect(colX[i], yPos, colWidths[i], 12).stroke();
        doc.text(itemHeaders[i], colX[i] + 1, yPos + 2, {
          width: colWidths[i] - 2,
        });
      }
    }
    yPos += 40;

    const productList = exportJob.products || [];
    productList.forEach((item, index) => {
      doc.fontSize(5.5).font("Helvetica");
      const itemData = [
        (index + 1).toString(),
        item.quantity,
        item.per,
        item.ritc,
        item.eximCode,
        item.nfeiCategory,
        item.rewardItem ? "Yes" : "No",
        item.description,
        `${item.unitPrice}${item.per}`,
        item.fobValueFC,
        item.fobValueINR,
        item.amount,
        item.igstPaymentStatus,
        item.pmvPerUnit,
        item.taxableValueINR,
        item.totalPMV,
        item.igstAmountINR,
      ];

      itemData.forEach((data, i) => {
        if (colX[i] && colWidths[i]) {
          doc.rect(colX[i], yPos, colWidths[i], 10).stroke();
          doc.text(data || "", colX[i] + 1, yPos + 2, {
            width: colWidths[i] - 2,
          });
        }
      });
      yPos += 10;
    });

    drawFieldBox(500, yPos, 45, 15, "Total PMV", exportJob.totalPmv, 6, 5);
    drawFieldBox(545, yPos, 40, 15, "Total IGST", exportJob.totalIgst, 6, 5);
    yPos += 20;

    // ==================== PAGE 3 ====================
    doc.addPage();
    drawHeader(3);
    yPos = 55;

    yPos = drawSectionHeader(yPos, "DBK DETAILS");

    const dbkHeaders = [
      "Inv No",
      "Item No",
      "DBK SI No",
      "Custom Rate",
      "DBK Rate",
      "DBK Qty Unit",
      "DBK Amount",
      "Custom SPE",
      "DBK SPE",
    ];
    const dbkX = [10, 50, 90, 140, 200, 260, 340, 400, 480];
    const dbkWidths = [40, 40, 50, 60, 60, 80, 60, 80, 105];

    doc.fontSize(5.5).font("Helvetica-Bold");
    dbkHeaders.forEach((header, i) => {
      doc.rect(dbkX[i], yPos, dbkWidths[i], 12).stroke();
      doc.text(header, dbkX[i] + 1, yPos + 2, {
        width: dbkWidths[i] - 2,
        align: "center",
      });
    });
    yPos += 12;

    const dbkData = exportJob.drawbackDetails || [];
    dbkData.forEach((item, index) => {
      doc.fontSize(5.5).font("Helvetica");
      const dbkRow = [
        "1",
        (index + 1).toString(),
        item.dbkSrNo,
        item.customRate,
        item.dbkRate,
        `${item.quantity} ${item.dbkDescription}`,
        item.dbkAmount,
        item.customSPE,
        item.dbkSPE,
      ];

      dbkRow.forEach((data, i) => {
        doc.rect(dbkX[i], yPos, dbkWidths[i], 10).stroke();
        doc.text(data || "", dbkX[i] + 1, yPos + 2, {
          width: dbkWidths[i] - 2,
        });
      });
      yPos += 10;
    });
    yPos += 15;

    yPos = drawSectionHeader(yPos, "VESSEL DETAILS");
    drawFieldBox(
      10,
      yPos,
      90,
      16,
      "Factory Stuffed",
      exportJob.goodsstuffedat === "Factory" ? "Yes" : "No",
      6,
      5
    );
    drawFieldBox(
      105,
      yPos,
      90,
      16,
      "Seal Type",
      exportJob.stuffingsealtype,
      6,
      5
    );
    drawFieldBox(
      200,
      yPos,
      180,
      16,
      "Vessel Name",
      exportJob.shippinglineairline,
      6,
      5
    );
    drawFieldBox(385, yPos, 200, 16, "Voyage Number", exportJob.voyageno, 6, 5);
    yPos += 20;

    yPos = drawSectionHeader(yPos, "CONTAINER DETAILS");
    const contHeaders = [
      "Container No",
      "Size",
      "Type",
      "Seal No",
      "Seal Type",
      "Seal Date",
      "Seal Device ID",
    ];
    const contX = [10, 130, 180, 230, 290, 370, 450];
    const contWidths = [120, 50, 50, 60, 80, 80, 135];

    doc.fontSize(5.5).font("Helvetica-Bold");
    contHeaders.forEach((header, i) => {
      doc.rect(contX[i], yPos, contWidths[i], 12).stroke();
      doc.text(header, contX[i] + 1, yPos + 2, {
        width: contWidths[i] - 2,
        align: "center",
      });
    });
    yPos += 12;

    const containers = exportJob.containers || [];
    containers.forEach((cont) => {
      doc.fontSize(5.5).font("Helvetica");
      const contRow = [
        cont.containerNo,
        cont.size,
        cont.type,
        cont.sealNo,
        cont.sealType,
        cont.sealDate,
        cont.sealDeviceId,
      ];

      contRow.forEach((data, i) => {
        doc.rect(contX[i], yPos, contWidths[i], 10).stroke();
        doc.text(data || "", contX[i] + 1, yPos + 2, {
          width: contWidths[i] - 2,
        });
      });
      yPos += 10;
    });

    // ==================== PAGE 4 ====================
    doc.addPage();
    drawHeader(4);
    yPos = 55;

    yPos = drawSectionHeader(yPos, "SUPPORTING DOCUMENTS");

    // 5 Column layout matching your PDF exactly
    const suppHeaders = [
      "Inv/Item/SrNo.",
      "Doc Issue Date",
      "Doc Expiry Date",
      "Doc Type Code",
      "Image Ref.No.(IRN)",
      "Doc Ref.No.",
      "Doc Uploaded On",
      "Doc Name",
      "ICEGATE ID",
      "File Type",
      "Place of Issue",
      "Issuing Party Code",
      "Beneficiary Party Code",
      "Issuing Party Name",
      "Issuing Party Add1",
      "Issuing Party Add2",
      "Issuing Party City",
      "Issuing Party Pin Code",
      "Beneficiary Party Name",
      "Beneficiary Party Add1",
      "Beneficiary Party Add2",
      "Beneficiary Party City",
      "Beneficiary Party Pin Code",
    ];

    const suppColX = [10, 80, 130, 180, 230, 280, 330, 380, 430];
    const suppColWidths = [70, 50, 50, 50, 50, 50, 50, 50, 155];

    doc.fontSize(5.5).font("Helvetica-Bold");
    suppHeaders.forEach((header, i) => {
      const col = Math.floor(i / 4);
      const row = i % 4;
      if (suppColX[col]) {
        doc
          .rect(suppColX[col], yPos + row * 12, suppColWidths[col], 12)
          .stroke();
        doc.text(header, suppColX[col] + 1, yPos + row * 12 + 2, {
          width: suppColWidths[col] - 2,
        });
      }
    });
    yPos += 48;

    const supportingDocs = exportJob.eSanchitDocuments || [];
    supportingDocs.forEach((sDoc) => {
      doc.fontSize(5.5).font("Helvetica");
      const docRow = [
        sDoc.invSerialNo,
        sDoc.dateOfIssue,
        sDoc.expiryDate,
        sDoc.documentType,
        sDoc.irn,
        sDoc.documentReferenceNo,
        sDoc.dateTimeOfUpload,
        sDoc.icegateFilename,
        sDoc.otherIcegateId,
        sDoc.icegateFilename?.split(".").pop(),
        sDoc.placeOfIssue,
        sDoc.issuingParty?.code,
        sDoc.beneficiaryParty?.code,
        sDoc.issuingParty?.name,
        sDoc.issuingParty?.addressLine1,
        sDoc.issuingParty?.addressLine2,
        sDoc.issuingParty?.city,
        sDoc.issuingParty?.pinCode,
        sDoc.beneficiaryParty?.name,
        sDoc.beneficiaryParty?.addressLine1,
        sDoc.beneficiaryParty?.addressLine2,
        sDoc.beneficiaryParty?.city,
        sDoc.beneficiaryParty?.pinCode,
      ];

      docRow.slice(0, 9).forEach((data, i) => {
        doc.rect(suppColX[i], yPos, suppColWidths[i], 10).stroke();
        doc.text(data || "", suppColX[i] + 1, yPos + 2, {
          width: suppColWidths[i] - 2,
        });
      });
      yPos += 10;
    });

    yPos = drawSectionHeader(yPos, "DECLARATION");
    doc.fontSize(7).font("Helvetica");
    const declarationText = [
      "Signature of Exporter/CHA with date",
      "",
      "1. I/We declare that the particulars given herein are true and are correct.",
      "2. I/We undertake to abide by the provisions of Foreign Exchange Management Act, 1999, as amended from time to time, including",
      "realisation or repatriation of foreign exchange to or from India.",
    ];

    declarationText.forEach((line) => {
      doc.text(line, 10, yPos);
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
router.get("/api/export-checklist/:job_no", async (req, res) => {
  try {
    const { job_no } = req.params;

    if (!job_no) {
      return res.status(400).json({
        success: false,
        error: "Job number is required",
      });
    }

    const pdfBuffer = await generateExportChecklist(job_no);
    const filename = `Export-CheckList-${job_no}-${
      new Date().toISOString().split("T")[0]
    }.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Export checklist generation error:", error);

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to generate Export Checklist PDF",
    });
  }
});

export default router;
