import express from "express";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import ForwarderModel from "../../model/export/ForwarderModel.mjs";
import transporter from "../../utils/mailer.mjs";
import ExcelJS from "exceljs";

const getCurrentFinancialYear = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based: 0=Jan, 3=April
  const startYear = month < 3 ? year - 1 : year;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
};

// Helper function to sync documents (such as LEO Copy, Invoice, Packing List, Bill of Lading)
// from the source Export Job to the Freight Enquiry document if they are missing.
async function syncEnquiryDocuments(enquiry) {
  if (!enquiry.source_job_no) return;

  const currentDocs = enquiry.documents || {};
  const syncedDocs = { ...currentDocs };
  let modified = false;

  try {
    // Find the source export job
    const sourceJob = await ExJobModel.findOne({
      job_no: { $regex: `^${String(enquiry.source_job_no).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
    });

    if (sourceJob) {
      // 1. Check operations statusDetails for LEO copy
      if (!syncedDocs.leo_copy && sourceJob.operations && sourceJob.operations.length > 0) {
        for (const op of sourceJob.operations) {
          if (op.statusDetails && op.statusDetails.length > 0) {
            for (const sd of op.statusDetails) {
              if (sd.leoUpload && sd.leoUpload.length > 0 && sd.leoUpload[0]) {
                syncedDocs.leo_copy = sd.leoUpload[0];
                modified = true;
                break;
              }
            }
          }
          if (syncedDocs.leo_copy) break;
        }
      }

      // 2. Check eSanchitDocuments for missing files
      if (sourceJob.eSanchitDocuments && sourceJob.eSanchitDocuments.length > 0) {
        sourceJob.eSanchitDocuments.forEach(d => {
          const docTypeUpper = (d.documentType || "").toUpperCase();
          const docNameUpper = (d.documentName || "").toUpperCase();
          const url = d.fileUrl;
          if (!url) return;

          // Check LEO
          if (!syncedDocs.leo_copy && (docTypeUpper.includes("LEO") || docNameUpper.includes("LEO"))) {
            syncedDocs.leo_copy = url;
            modified = true;
          }
          // Check Invoice
          if (!syncedDocs.invoice && (docTypeUpper.includes("INV") || docNameUpper.includes("INV"))) {
            syncedDocs.invoice = url;
            modified = true;
          }
          // Check Packing List
          if (!syncedDocs.packing_list && (docTypeUpper.includes("PACK") || docTypeUpper.includes("PL") || docNameUpper.includes("PACK") || docNameUpper.includes("PL"))) {
            syncedDocs.packing_list = url;
            modified = true;
          }
          // Check Bill of Lading
          if (!syncedDocs.bill_of_lading && (docTypeUpper.includes("BILL OF LADING") || docTypeUpper.includes("BL") || docTypeUpper.includes("B/L") || docNameUpper.includes("BILL OF LADING") || docNameUpper.includes("BL") || docNameUpper.includes("B/L"))) {
            syncedDocs.bill_of_lading = url;
            modified = true;
          }
        });
      }

      // 3. Check top-level documents on source job
      if (sourceJob.documents) {
        if (!syncedDocs.leo_copy && sourceJob.documents.leo_copy) {
          syncedDocs.leo_copy = sourceJob.documents.leo_copy;
          modified = true;
        }
        if (!syncedDocs.invoice && sourceJob.documents.invoice) {
          syncedDocs.invoice = sourceJob.documents.invoice;
          modified = true;
        }
        if (!syncedDocs.packing_list && sourceJob.documents.packing_list) {
          syncedDocs.packing_list = sourceJob.documents.packing_list;
          modified = true;
        }
        if (!syncedDocs.bill_of_lading && sourceJob.documents.bill_of_lading) {
          syncedDocs.bill_of_lading = sourceJob.documents.bill_of_lading;
          modified = true;
        }
      }

      // If we updated/synced any new documents, save them to the FreightEnquiryModel
      if (modified) {
        await FreightEnquiryModel.updateOne(
          { _id: enquiry._id },
          { $set: { documents: syncedDocs } }
        );
        enquiry.documents = syncedDocs;
      }
    }
  } catch (err) {
    console.error(`Error syncing documents for enquiry ${enquiry.enquiry_no}:`, err);
  }
}

const router = express.Router();

// Get all enquiries
router.get("/freight-enquiries", async (req, res) => {
  try {
    const enquiries = await FreightEnquiryModel.find().sort({ createdAt: -1 });
    const dataList = enquiries.map(e => e.toObject());
    
    // Sync missing documents (like LEO copy) from source Export Jobs
    await Promise.all(dataList.map(e => syncEnquiryDocuments(e)));

    res.status(200).json({ success: true, data: dataList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new enquiry
router.post("/freight-enquiries", async (req, res) => {
  try {
    // Generate sequential enquiry number based on shipment type
    const { shipment_type } = req.body;
    let typeCode = "MISC";
    if (shipment_type === "Import-Sea") typeCode = "IMP/SEA";
    else if (shipment_type === "Export-Sea") typeCode = "EXP/SEA";
    else if (shipment_type === "Import-Air") typeCode = "IMP/AIR";
    else if (shipment_type === "Export-Air") typeCode = "EXP/AIR";

    const currentFY = getCurrentFinancialYear();
    
    // Helper to generate sequential numbers for different series
    const getNextNo = async (field, prefix) => {
      const lastEntry = await FreightEnquiryModel.findOne({ 
        shipment_type,
        [field]: { $exists: true, $ne: null }
      }).sort({ [field]: -1 });

      let nextNo = 1;
      if (lastEntry && lastEntry[field]) {
        const parts = lastEntry[field].split("/");
        const seqPart = parts.find(p => p.length === 4 && /^\d+$/.test(p));
        const lastNo = seqPart ? parseInt(seqPart) : 0;
        if (!isNaN(lastNo)) nextNo = lastNo + 1;
      }
      return `${prefix}/${typeCode}/${nextNo.toString().padStart(4, "0")}/${currentFY}`;
    };

    const enquiry_no = await getNextNo("enquiry_no", "FF");

    const newEnquiry = new FreightEnquiryModel({
      ...req.body,
      enquiry_no,
      consignment_type: req.body.consignment_type || "",
      goods_stuffed: req.body.goods_stuffed || ""
    });
    
    const savedEnquiry = await newEnquiry.save();

    // Send emails to forwarders
    try {
      const forwarders = await ForwarderModel.find();
      if (forwarders.length > 0) {
        const emailList = forwarders.map(f => f.email).filter(Boolean);
        if (emailList.length > 0) {
          const emailBody = `
Dear Partner,

We have a new freight enquiry. Please provide your best rates for the following:

Enquiry No: ${savedEnquiry.enquiry_no}
Organization: ${savedEnquiry.organization_name}
Shipment Type: ${savedEnquiry.shipment_type}
Consignment Type: ${savedEnquiry.consignment_type}
Booking Info: ${savedEnquiry.container_size || "-"} / ${savedEnquiry.goods_stuffed || "-"}
Port of Loading: ${savedEnquiry.port_of_loading}
Port of Destination: ${savedEnquiry.port_of_destination}

Weights & Dimensions:
Gross Weight: ${savedEnquiry.gross_weight || "-"}
Net Weight: ${savedEnquiry.net_weight || "-"}
Dimensions: ${savedEnquiry.dimension || "-"}
No of Packages: ${savedEnquiry.no_packages || "-"}

Remarks:
${savedEnquiry.remarks || "No additional remarks."}

Please reply with your rates at the earliest.

Best Regards,
Freight Forwarding Team
          `;

          const mailOptions = {
            from: `"Freight System" <connect@surajgroupofcompanies.com>`,
            to: emailList.join(", "),
            subject: `New Rate Enquiry: ${savedEnquiry.enquiry_no} - ${savedEnquiry.shipment_type}`,
            text: emailBody,
            attachments: [
              {
                filename: `Enquiry_${savedEnquiry.enquiry_no}.txt`,
                content: emailBody
              }
            ]
          };
          await transporter.sendMail(mailOptions);
        }
      }
    } catch (emailErr) {
      console.error("Failed to send emails to forwarders:", emailErr);
    }

    res.status(201).json({ success: true, data: savedEnquiry });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update rates for an enquiry
router.post("/freight-enquiries/:id/rates", async (req, res) => {
  try {
    const updated = await FreightEnquiryModel.findByIdAndUpdate(
      req.params.id,
      { received_rates: req.body.rates },
      { new: true }
    );
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update enquiry details
router.put("/freight-enquiries/:id", async (req, res) => {
  try {
    const existing = await FreightEnquiryModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Enquiry not found" });

    const updates = { ...req.body };
    const shipment_type = existing.shipment_type;
    const currentFY = getCurrentFinancialYear();

    // Helper to generate sequential numbers (redundant if defined globally, but safe here)
    const getNextNo = async (field, prefix) => {
      let typeCode = "MISC";
      if (shipment_type === "Import-Sea") typeCode = "IMP/SEA";
      else if (shipment_type === "Export-Sea") typeCode = "EXP/SEA";
      else if (shipment_type === "Import-Air") typeCode = "IMP/AIR";
      else if (shipment_type === "Export-Air") typeCode = "EXP/AIR";

      const lastEntry = await FreightEnquiryModel.findOne({ 
        shipment_type,
        [field]: { $exists: true, $ne: null }
      }).sort({ [field]: -1 });

      let nextNo = 1;
      if (lastEntry && lastEntry[field]) {
        const parts = lastEntry[field].split("/");
        const seqPart = parts.find(p => p.length === 4 && /^\d+$/.test(p));
        const lastNo = seqPart ? parseInt(seqPart) : 0;
        if (!isNaN(lastNo)) nextNo = lastNo + 1;
      }
      return `${prefix}/${typeCode}/${nextNo.toString().padStart(4, "0")}/${currentFY}`;
    };

    // Generate Success No if status is becoming Converted
    if (req.body.status === "Converted" && !existing.success_no) {
      updates.success_no = await getNextNo("success_no", "FF-SUC");
    }
    // Generate Rejected No if status is becoming Rejected
    if (req.body.status === "Rejected" && !existing.rejected_no) {
      updates.rejected_no = await getNextNo("rejected_no", "FF-REJ");
    }

    const updated = await FreightEnquiryModel.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).lean();

    if (updated) {
      await syncEnquiryDocuments(updated);
    }

    // AUTO-CONVERSION: Create an Export Job entry if status is Converted and it's an Export type
    if (req.body.status === "Converted" && (updated.success_no || updated.enquiry_no) && String(updated.shipment_type).startsWith("Export")) {
      const jobNo = updated.success_no || updated.enquiry_no;
      const existingJob = await ExJobModel.findOne({ job_no: jobNo });
      if (!existingJob) {
        const newJob = new ExJobModel({
          job_no: jobNo,
          jobNumber: jobNo,
          year: String(new Date().getFullYear()).slice(-2) + "-" + String(new Date().getFullYear() + 1).slice(-2),
          job_date: updated.enquiry_date || new Date().toISOString().split("T")[0],
          exporter: updated.organization_name,
          shipper: updated.organization_name,
          consignmentType: updated.consignment_type,
          port_of_loading: updated.port_of_loading,
          port_of_discharge: updated.port_of_destination,
          isGeneralJob: false,
          status: "Pending",
          detailedStatus: "Created from Freight Enquiry",
          movement_type: updated.movement_type,
          gross_weight_kg: updated.gross_weight,
          gross_weight_unit: updated.gross_weight_unit,
          net_weight_kg: updated.net_weight,
          net_weight_unit: updated.net_weight_unit,
          chargeable_weight: updated.chargeable_weight,
          chargeable_weight_unit: updated.chargeable_weight_unit,
          volume_cbm: updated.volume_cbm,
          volume_unit: updated.volume_unit,
          total_no_of_pkgs: updated.no_packages,
          package_unit: updated.package_unit,
          volume_weight: updated.volume_weight,
          containers: (updated.containers || []).map((c, i) => ({
            serialNumber: i + 1,
            containerNo: c.container_number,
            customSealNo: c.custom_seal,
            shippingLineSealNo: c.line_seal
          }))
        });
        await newJob.save();
      }
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Public: Get limited enquiry info for BL form
router.get("/freight-enquiries/public/:id", async (req, res) => {
  try {
    const enquiry = await FreightEnquiryModel.findById(req.params.id)
      .select("enquiry_no organization_name port_of_loading port_of_destination shipment_type bl_details hbl_no")
      .lean();
    if (!enquiry) return res.status(404).json({ success: false, message: "Link expired or invalid" });
    res.status(200).json({ success: true, data: enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Public: Submit BL data Details
router.post("/freight-enquiries/public/:id/bl-data", async (req, res) => {
  try {
    const updated = await FreightEnquiryModel.findByIdAndUpdate(
      req.params.id,
      { $set: { bl_details: req.body } },
      { new: true }
    );
    res.status(200).json({ success: true, data: updated.bl_details });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate DSR Report Excel for Freight Forwarding (Import & Export)
router.get("/freight-forwarding/generate-dsr", async (req, res) => {
  try {
    const { year, shipment_type, startDate, endDate, mode } = req.query;

    const filter = {};
    if (!filter.$and) filter.$and = [];

    // Filter by year
    if (year && year !== "" && year.toLowerCase() !== "all") {
      const escapedYear = year.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and.push({
        $or: [
          { enquiry_no: { $regex: escapedYear, $options: "i" } },
          { success_no: { $regex: escapedYear, $options: "i" } }
        ]
      });
    }

    // Filter by shipment_type or mode (Import vs Export)
    if (shipment_type && shipment_type !== "" && shipment_type.toLowerCase() !== "all") {
      filter.$and.push({ shipment_type });
    } else if (mode === "Import") {
      filter.$and.push({ shipment_type: { $regex: "^Import", $options: "i" } });
    } else if (mode === "Export") {
      filter.$and.push({ shipment_type: { $regex: "^Export", $options: "i" } });
    }

    // Filter by date range
    if (startDate || endDate) {
      if (startDate) {
        filter.$and.push({ enquiry_date: { $gte: startDate } });
      }
      if (endDate) {
        filter.$and.push({ enquiry_date: { $lte: endDate } });
      }
    }

    if (filter.$and.length === 0) {
      delete filter.$and;
    }

    const enquiries = await FreightEnquiryModel.find(filter).sort({ createdAt: -1 }).lean();

    if (!enquiries || enquiries.length === 0) {
      return res.status(404).json({ success: false, error: "No enquiries/jobs found matching filter criteria" });
    }

    const workbook = new ExcelJS.Workbook();
    const isImport = mode === "Import";
    const sheetTitle = isImport ? "Freight Forwarding Import DSR" : "Freight Forwarding Export DSR";
    const worksheet = workbook.addWorksheet(sheetTitle);

    if (isImport) {
      // -------------------- IMPORT DSR LAYOUT --------------------
      // Headers: JOB NO | SHIPMENT | IMPORTER | POL/IMP | POD | EQUIPMENT/TYPE | BL NO. | BE NO & DATE | S/LINE NAME | BKG NUMBER/ AWBL | CONTAINER NO. | AGENT / FORWARDER | STATUS/REMARKS | BILL CMPLTD/ DATE | IMPORT DEALING HAND
      worksheet.columns = [
        { header: "JOB NO", key: "success_no", width: 22 },
        { header: "SHIPMENT", key: "shipment_type", width: 15 },
        { header: "IMPORTER", key: "importer", width: 35 },
        { header: "POL/IMP", key: "port_of_loading", width: 20 },
        { header: "POD", key: "port_of_destination", width: 20 },
        { header: "EQUIPMENT/TYPE", key: "equipment_type", width: 20 },
        { header: "BL NO.", key: "bl_no", width: 25 },
        { header: "BE NO & DATE", key: "be_no_date", width: 20 },
        { header: "S/LINE NAME", key: "shipping_line_airline", width: 25 },
        { header: "BKG NUMBER/ AWBL", key: "booking_no", width: 20 },
        { header: "CONTAINER NO.", key: "container_no", width: 30 },
        { header: "AGENT / FORWARDER", key: "forwarder", width: 30 },
        { header: "STATUS/REMARKS", key: "status_remarks", width: 50 },
        { header: "BILL CMPLTD/ DATE", key: "bill_completed_date", width: 20 },
        { header: "IMPORT DEALING HAND", key: "dealing_hand", width: 25 }
      ];

      for (const enq of enquiries) {
        let job = null;
        if (enq.status === "Converted") {
          const jobNo = enq.success_no || enq.enquiry_no;
          job = await ExJobModel.findOne({ job_no: jobNo }).lean();
        }

        const importerName = job?.consignees?.[0]?.consignee_name || enq.bl_details?.consignee || enq.organization_name || "";
        const pol = enq.port_of_loading || job?.port_of_loading || "";
        const pod = enq.port_of_destination || job?.port_of_discharge || "";
        const eqType = enq.consignment_type || job?.consignmentType || enq.container_qty_type || enq.container_size || "";
        const blNo = job?.mbl_no || job?.hbl_no || enq.bl_details?.bill_of_lading || "";
        const beNoDate = job?.be_no ? (job.be_no + (job.be_date ? " " + job.be_date : "")) : "";
        const sline = job?.shipping_line_airline || "";
        const booking = job?.booking_no || "";
        const containerNo = job?.containers?.map(c => c.containerNo).filter(Boolean).join(", ") || enq.containers?.map(c => c.container_number).filter(Boolean).join(", ") || "";
        const agent = job?.forwarder || "";
        const statusRemarks = job?.detailedStatus || enq.remarks || enq.status || "";
        const billCompletedDate = job?.send_for_billing_date ? new Date(job.send_for_billing_date).toLocaleDateString('en-GB') : "";
        const dealingHand = job?.job_owner || "";

        const row = worksheet.addRow({
          success_no: enq.success_no || enq.enquiry_no || "",
          shipment_type: enq.shipment_type ? enq.shipment_type.toUpperCase() : "",
          importer: importerName,
          port_of_loading: pol,
          port_of_destination: pod,
          equipment_type: eqType,
          bl_no: blNo,
          be_no_date: beNoDate,
          shipping_line_airline: sline,
          booking_no: booking,
          container_no: containerNo,
          forwarder: agent,
          status_remarks: statusRemarks,
          bill_completed_date: billCompletedDate,
          dealing_hand: dealingHand
        });

        // Coloring logic based on status_remarks for Import:
        // - Dark Slate Blue (#B4C6E7) -> CUSTOM CLEARANCE COMPLETED / BILLING
        // - Light Blue (#DDEBF7) -> B/E NOTED / CLEARNCE PENDING
        // - Orange/Peach (#FCE4D6) -> NOTING PENDING / DISCHARGED @ PORT
        // - Yellow (#FFF2CC) -> ETA PENDING
        // - Light Green (#E2EFDA) -> ETD CONFIRMED
        let cellColor = null;
        const statusText = statusRemarks.toUpperCase();
        if (statusText.includes("BILLING") || statusText.includes("COMPLETED")) {
          cellColor = "B4C6E7";
        } else if (statusText.includes("NOTED") || statusText.includes("CLEARNCE PENDING")) {
          cellColor = "DDEBF7";
        } else if (statusText.includes("NOTING PENDING") || statusText.includes("DISCHARGED")) {
          cellColor = "FCE4D6";
        } else if (statusText.includes("ETA PENDING") || statusText.includes("ETA")) {
          cellColor = "FFF2CC";
        } else if (statusText.includes("CONFIRMED") || statusText.includes("ETD")) {
          cellColor = "E2EFDA";
        }

        if (cellColor) {
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + cellColor }
            };
          });
        }
      }

      // Add legend at the bottom of the table
      worksheet.addRow([]);
      worksheet.addRow([]);
      const leg1 = worksheet.addRow(["", "", "", "", "", "COLOR CODE MEANING FOR IMPORT DSR:"]);
      leg1.getCell(6).font = { bold: true };
      
      const leg2 = worksheet.addRow(["", "", "", "", "", "CUSTOM CLEARANCE COMPLETED / BILLING", "", ""]);
      leg2.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB4C6E7" } };
      
      const leg3 = worksheet.addRow(["", "", "", "", "", "B/E NOTED / CLEARNCE PENDING", "", ""]);
      leg3.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } };
      
      const leg4 = worksheet.addRow(["", "", "", "", "", "NOTING PENDING / DISCHARGED @ PORT", "", ""]);
      leg4.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } };
      
      const leg5 = worksheet.addRow(["", "", "", "", "", "ETA PENDING", "", ""]);
      leg5.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
      
      const leg6 = worksheet.addRow(["", "", "", "", "", "ETD CONFIRMED", "", ""]);
      leg6.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };

    } else {
      // -------------------- EXPORT DSR LAYOUT --------------------
      // Headers: Quotation No | Job No | Shipment | Shipper Name | Invoice No | POD | Size | S/B No | S/B Date | S/Line Name / Agent | Cut off Date | Sailing / Dep Date | B/L Status | Booking Number | BL Number | Status / Remarks | Bill Sent to A/C | ETA at Destination
      worksheet.columns = [
        { header: "Quotation No", key: "enquiry_no", width: 22 },
        { header: "Job No", key: "success_no", width: 22 },
        { header: "Shipment", key: "shipment_type", width: 15 },
        { header: "Shipper Name", key: "shipper", width: 35 },
        { header: "Invoice No", key: "invoice_no", width: 20 },
        { header: "POD", key: "port_of_destination", width: 20 },
        { header: "Size", key: "size_type", width: 15 },
        { header: "S/B No", key: "sb_no", width: 15 },
        { header: "S/B Date", key: "sb_date", width: 15 },
        { header: "S/Line Name / Agent", key: "shipping_line_airline", width: 25 },
        { header: "Cut off Date", key: "cut_off_date", width: 15 },
        { header: "Sailing / Dep Date", key: "sailing_date", width: 15 },
        { header: "B/L Status", key: "bl_status", width: 20 },
        { header: "Booking Number", key: "booking_no", width: 20 },
        { header: "BL Number", key: "bl_hbl_number", width: 25 },
        { header: "Status / Remarks", key: "status_remarks", width: 50 },
        { header: "Bill Sent to A/C", key: "bill_sent_date", width: 15 },
        { header: "ETA at Destination", key: "eta_date", width: 15 }
      ];

      for (const enq of enquiries) {
        let job = null;
        if (enq.status === "Converted") {
          const jobNo = enq.success_no || enq.enquiry_no;
          job = await ExJobModel.findOne({ job_no: jobNo }).lean();
        }

        const shipperName = job?.shipper || enq.bl_details?.consignor || enq.organization_name || "";
        const consigneeName = job?.consignees?.[0]?.consignee_name || enq.bl_details?.consignee || "";
        const invoicesStr = job?.invoices?.map(inv => inv.invoiceNumber).join(", ") || "";
        const pol = enq.port_of_loading || job?.port_of_loading || "";
        const pod = enq.port_of_destination || job?.port_of_discharge || "";
        const sizeType = enq.consignment_type || job?.consignmentType || enq.container_size || "";
        const sbNo = job?.sb_no || "";
        const sbDate = job?.sb_date || "";
        const slineName = job?.shipping_line_airline || "";
        const bookingNo = job?.booking_no || "";
        const blHblNum = job?.hbl_no || job?.mbl_no || "";
        const cutoffDate = job?.cut_off_date || "";
        const sailingDate = job?.sailing_date || "";
        const etaDate = job?.eta_date || "";
        const statusRemarks = job?.detailedStatus || enq.remarks || enq.status || "";
        const billSentDate = job?.send_for_billing_date ? new Date(job.send_for_billing_date).toLocaleDateString('en-GB') : "";

        let blStatus = "DRAFT PROCESS";
        if (blHblNum) {
          blStatus = "BL RELEASED";
        } else if (job?.detailedStatus?.toUpperCase().includes("RELEASED")) {
          blStatus = "BL RELEASED";
        } else if (job?.detailedStatus?.toUpperCase().includes("BILLING")) {
          blStatus = "JOB SHEET PENDING / BILLING";
        }

        const row = worksheet.addRow({
          enquiry_no: enq.enquiry_no || "",
          success_no: enq.success_no || "",
          shipment_type: enq.shipment_type ? enq.shipment_type.toUpperCase() : "",
          shipper: shipperName,
          invoice_no: invoicesStr,
          port_of_destination: pod,
          size_type: sizeType,
          sb_no: sbNo,
          sb_date: sbDate,
          shipping_line_airline: slineName,
          cut_off_date: cutoffDate,
          sailing_date: sailingDate,
          bl_status: blStatus,
          booking_no: bookingNo,
          bl_hbl_number: blHblNum,
          status_remarks: statusRemarks,
          bill_sent_date: billSentDate,
          eta_date: etaDate
        });

        // Coloring logic based on blStatus / status_remarks for Export:
        // - Green (#C6EFCE) -> B/L RELED - RECD / JOB SHEET PENDING / BILLING
        // - Light Blue (#DDEBF7) -> DRAFT PROCESS
        // - Peach/Orange (#FCE4D6) -> CUSTOM CLRANCE CMPLTD / DRAFT PROCESS
        // - Yellow (#FFF2CC) -> CARGO PENDING / UNDER CLEARANCE
        // - Orange/Gold (#F8CBAD) -> ORG PENDING / BOOKING PENDING
        let cellColor = null;
        const statusText = blStatus.toUpperCase();
        const remarkText = statusRemarks.toUpperCase();
        if (statusText.includes("RELEASED") || statusText.includes("RELED") || statusText.includes("BILLING") || remarkText.includes("BILLING")) {
          cellColor = "C6EFCE";
        } else if (statusText.includes("DRAFT PROCESS") || statusText.includes("PROCESS")) {
          cellColor = "DDEBF7";
        } else if (remarkText.includes("CUSTOM CLRANCE") || remarkText.includes("CUSTOM CLEARANCE") || remarkText.includes("LEO")) {
          cellColor = "FCE4D6";
        } else if (remarkText.includes("CARGO PENDING") || remarkText.includes("CLEARANCE")) {
          cellColor = "FFF2CC";
        } else if (remarkText.includes("ORG PENDING") || remarkText.includes("BOOKING")) {
          cellColor = "F8CBAD";
        }

        if (cellColor) {
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF" + cellColor }
            };
          });
        }
      }

      // Add legend at the bottom of the table
      worksheet.addRow([]);
      worksheet.addRow([]);
      const leg1 = worksheet.addRow(["", "", "", "", "", "COLOR CODE MEANING FOR EXPORT DSR:"]);
      leg1.getCell(6).font = { bold: true };
      
      const leg2 = worksheet.addRow(["", "", "", "", "", "B/L RELED - RECD / JOB SHEET PENDING / BILLING", "", ""]);
      leg2.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
      
      const leg3 = worksheet.addRow(["", "", "", "", "", "DRAFT PROCESS", "", ""]);
      leg3.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } };
      
      const leg4 = worksheet.addRow(["", "", "", "", "", "CUSTOM CLRANCE CMPLTD / DRAFT PROCESS", "", ""]);
      leg4.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } };
      
      const leg5 = worksheet.addRow(["", "", "", "", "", "CARGO PENDING / UNDER CLEARANCE", "", ""]);
      leg5.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
      
      const leg6 = worksheet.addRow(["", "", "", "", "", "ORG PENDING / BOOKING PENDING", "", ""]);
      leg6.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8CBAD" } };
    }

    // Style the header
    const headerRow = worksheet.getRow(1);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: "FF000000" } }; // Dark font color
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFCE4D6" }, // Light Peach Header Background color as in second screenshot header
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });

    // Style the data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      
      // If it's a legend row, don't draw border or format text like data
      if (rowNumber > enquiries.length + 2) {
        row.eachCell({ includeEmpty: false }, (cell, colNo) => {
          if (colNo === 6) {
            cell.border = {
              top: { style: "thin" }, left: { style: "thin" },
              bottom: { style: "thin" }, right: { style: "thin" }
            };
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          }
        });
        return;
      }

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD9D9D9" } },
          left: { style: "thin", color: { argb: "FFD9D9D9" } },
          bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
          right: { style: "thin", color: { argb: "FFD9D9D9" } },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      });
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Freight_Forwarding_${mode}_DSR_${new Date().toISOString().split('T')[0]}.xlsx"`,
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    console.error("Error generating Freight Forwarding DSR:", error);
    res.status(500).json({ success: false, error: "Failed to generate DSR report" });
  }
});

export default router;
