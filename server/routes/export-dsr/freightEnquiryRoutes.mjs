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
    const { tab } = req.query;

    const enquiries = await FreightEnquiryModel.find().sort({ createdAt: -1 });
    const dataList = enquiries.map(e => e.toObject());
    
    // Sync missing documents (like LEO copy) from source Export Jobs
    await Promise.all(dataList.map(e => syncEnquiryDocuments(e)));

    // Helper to determine if an enquiry is converted or linked to an export job
    const isConverted = (e) => e.status === "Converted" || !!e.source_job_no || !!e.success_no;

    // For converted enquiries, merge key fields from the associated ExJob
    // (e.g. place_of_receipt, hbl_no) so the BL generator has access to them
    const convertedEnquiries = dataList.filter(e => isConverted(e) && (e.source_job_no || e.success_no || e.enquiry_no));
    if (convertedEnquiries.length > 0) {
      const jobNos = convertedEnquiries.flatMap(e => [e.enquiry_no, e.success_no, e.source_job_no]).filter(Boolean);
      const exJobs = await ExJobModel.find(
        { job_no: { $in: jobNos } },
        { 
          job_no: 1, 
          place_of_receipt: 1, 
          hbl_no: 1, 
          bl_details: 1,
          consignees: 1, 
          shipper: 1, 
          shipped_on_board_date: 1,
          sailing_date: 1,
          "operations.statusDetails.billing_details": 1,
          arrival_date: 1,
          final_delivery_date: 1,
          booking_no: 1,
          booking_date: 1,
          cut_off_date: 1,
          voyage_no: 1,
          vessel_name: 1,
          sb_no: 1,
          sb_date: 1,
          egm_no: 1,
          egm_date: 1,
          mbl_no: 1,
          mbl_date: 1,
          hbl_date: 1,
          shipping_line_airline: 1,
          flight_no: 1,
          flight_date: 1,
          consol_no: 1,
          consol_date: 1,
          eta_date: 1,
          booking_thru: 1,
          sales_person: 1,
          freight_type: 1,
          cargo_type: 1,
          movement_type: 1,
          volume_weight: 1,
          shipment_terms: 1,
          container_qty_type: 1,
          net_weight_kg: 1,
          gross_weight_kg: 1,
          volume_cbm: 1,
          chargeable_weight: 1,
          container_size: 1,
          goods_stuffed: 1,
          dimensions: 1
        }
      ).lean();
      const jobMap = {};
      exJobs.forEach(j => { jobMap[j.job_no] = j; });
      for (const e of dataList) {
        if (isConverted(e)) {
          const job = jobMap[e.enquiry_no] || jobMap[e.success_no] || jobMap[e.source_job_no];
          if (job) {
            if (job.place_of_receipt) e.place_of_receipt = job.place_of_receipt;
            if (job.hbl_no) {
              e.hbl_no = job.hbl_no;
              if (!e.bl_details) e.bl_details = {};
              if (!e.bl_details.shipment_ref_no) e.bl_details.shipment_ref_no = job.hbl_no;
            }
            // Merge consignee data from ExJob for import shipments
            if (job.consignees && job.consignees.length > 0 && job.consignees[0].consignee_name) {
              e.consignee_name = job.consignees[0].consignee_name;
            }
            // Merge shipper from ExJob for export shipments
            if (job.shipper) e.shipper_name = job.shipper;
            
            // Merge SBO and arrival dates
            if (job.shipped_on_board_date) e.shipped_on_board_date = job.shipped_on_board_date;
            if (job.sailing_date) e.sailing_date = job.sailing_date;
            if (job.arrival_date) e.arrival_date = job.arrival_date;
            if (job.final_delivery_date) e.final_delivery_date = job.final_delivery_date;
 
            // Merge timeline and document details
            if (job.booking_no) e.booking_no = job.booking_no;
            if (job.booking_date) e.booking_date = job.booking_date;
            if (job.cut_off_date) e.cut_off_date = job.cut_off_date;
            if (job.voyage_no) e.voyage_no = job.voyage_no;
            if (job.vessel_name) e.vessel_name = job.vessel_name;
            if (job.sb_no) e.sb_no = job.sb_no;
            if (job.sb_date) e.sb_date = job.sb_date;
            if (job.egm_no) e.egm_no = job.egm_no;
            if (job.egm_date) e.egm_date = job.egm_date;
            if (job.mbl_no) e.mbl_no = job.mbl_no;
            if (job.mbl_date) e.mbl_date = job.mbl_date;
            if (job.hbl_date) e.hbl_date = job.hbl_date;
            if (job.shipping_line_airline) e.shipping_line_airline = job.shipping_line_airline;
            if (job.flight_no) e.flight_no = job.flight_no;
            if (job.flight_date) e.flight_date = job.flight_date;
            if (job.consol_no) e.consol_no = job.consol_no;
            if (job.consol_date) e.consol_date = job.consol_date;
            if (job.eta_date) e.eta_date = job.eta_date;
            
            // Merge transport/sales fields
            if (job.booking_thru) e.booking_thru = job.booking_thru;
            if (job.sales_person) e.sales_person = job.sales_person;
            if (job.freight_type) e.freight_type = job.freight_type;
            if (job.cargo_type) e.cargo_type = job.cargo_type;
            if (job.movement_type) e.movement_type = job.movement_type;
            if (job.volume_weight) e.volume_weight = job.volume_weight;
            if (job.shipment_terms) e.shipment_terms = job.shipment_terms;
            if (job.container_qty_type) e.container_qty_type = job.container_qty_type;
            if (job.net_weight_kg) e.net_weight_kg = job.net_weight_kg;
            if (job.gross_weight_kg) e.gross_weight_kg = job.gross_weight_kg;
            if (job.volume_cbm) e.volume_cbm = job.volume_cbm;
            if (job.chargeable_weight) e.chargeable_weight = job.chargeable_weight;
            if (job.container_size) e.container_size = job.container_size;
            if (job.goods_stuffed) e.goods_stuffed = job.goods_stuffed;
            if (job.dimensions && job.dimensions.length > 0) e.dimensions = job.dimensions;
            if (job.bl_details) {
              e.bl_details = {
                ...e.bl_details,
                ...job.bl_details
              };
            }
            if (job.hbl_no) {
              if (!e.bl_details) e.bl_details = {};
              e.bl_details.shipment_ref_no = job.hbl_no;
              e.hbl_no = job.hbl_no;
            }
 
            // Merge billing submission details
            if (job.operations?.[0]?.statusDetails?.[0]?.billing_details) {
              e.billing_details = job.operations[0].statusDetails[0].billing_details;
            }
          }
        }
      }
    }

    // ─── Strict sequential pipeline stage classifier ───────────────────────────
    // Each stage requires ALL prior gates to be fully satisfied.
    // A job is "locked" in a stage until its OWN condition is met.
    // e.g. even if ETD is present, if draft is not approved → stays in Draft BL.
    const getPipelineStage = (e) => {
      if (!isConverted(e)) {
        if (e.status === "Rejected") return "Rejected";
        return "Enquiry";
      }

      // Gate 1: Draft BL – must be approved by client
      const draftApproved = e.draft_bl_approved === true;
      if (!draftApproved) return "Draft BL";

      // Gate 2: SBO – must have ETD (sailing_date) AFTER draft approved
      const sboDate = !!(e.sailing_date);
      if (!sboDate) return "SBO";

      // Gate 3: Billing – must have all 4 billing fields AFTER ETD
      const hasBillingDetails = !!(
        e.billing_details?.agency_bill_no &&
        e.billing_details?.agency_bill_date &&
        e.billing_details?.reimbursement_bill_no &&
        e.billing_details?.reimbursement_bill_date
      );
      if (!hasBillingDetails) return "Billing";

      // Gate 4: ETA Pending – billing done, waiting for final arrival date
      const hasArrivalDate = !!(e.arrival_date);
      if (!hasArrivalDate) return "ETA Pending";

      // Gate 5: Delivery – arrival date present, waiting for final delivery date
      const hasFinalDelivery = !!(e.final_delivery_date);
      if (!hasFinalDelivery) return "Delivery";

      // Gate 6: Completed – all gates passed
      return "Completed";
    };

    // Pending = all converted jobs that have NOT yet reached ETA Pending or beyond
    const PRE_ETA_STAGES = new Set(["Draft BL", "SBO", "Billing"]);

    let enquiryCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;
    let draftBlCount = 0;
    let sboCount = 0;
    let billingCount = 0;
    let etaPendingCount = 0;
    let deliveryCount = 0;
    let completedCount = 0;

    const processedList = dataList.map((e) => {
      const computedTab = getPipelineStage(e);
      const isPreEta = PRE_ETA_STAGES.has(computedTab);

      if (computedTab === "Enquiry") enquiryCount++;
      else if (computedTab === "Rejected") rejectedCount++;
      else if (computedTab === "Draft BL") { draftBlCount++; pendingCount++; }
      else if (computedTab === "SBO") { sboCount++; pendingCount++; }
      else if (computedTab === "Billing") { billingCount++; pendingCount++; }
      else if (computedTab === "ETA Pending") etaPendingCount++;
      else if (computedTab === "Delivery") deliveryCount++;
      else if (computedTab === "Completed") completedCount++;

      return { ...e, computedTab, isPreEta };
    });

    let resultData = processedList;
    if (tab) {
      if (tab === "Pending") {
        // Pending shows all converted jobs not yet at ETA Pending (pre-billing completion)
        resultData = processedList.filter(e => PRE_ETA_STAGES.has(e.computedTab));
      } else {
        resultData = processedList.filter(e => e.computedTab === tab);
      }
    }

    res.status(200).json({
      success: true,
      data: resultData,
      counts: {
        Enquiry: enquiryCount,
        Rejected: rejectedCount,
        Pending: pendingCount,
        "Draft BL": draftBlCount,
        SBO: sboCount,
        Billing: billingCount,
        "ETA Pending": etaPendingCount,
        Delivery: deliveryCount,
        Completed: completedCount
      }
    });
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

    // AUTO-CONVERSION: Create a Job entry if status is Converted
    if (req.body.status === "Converted" && (updated.success_no || updated.enquiry_no)) {
      const jobNo = updated.success_no || updated.enquiry_no;
      const existingJob = await ExJobModel.findOne({ job_no: jobNo });
      if (!existingJob) {
        const isImport = String(updated.shipment_type).startsWith("Import");
        const newJob = new ExJobModel({
          job_no: jobNo,
          jobNumber: jobNo,
          year: String(new Date().getFullYear()).slice(-2) + "-" + String(new Date().getFullYear() + 1).slice(-2),
          job_date: updated.enquiry_date || new Date().toISOString().split("T")[0],
          exporter: isImport ? "" : updated.organization_name,
          shipper: isImport ? "" : updated.organization_name,
          consignees: isImport ? [{
            consignee_name: updated.organization_name,
            consignee_address: "",
            consignee_country: ""
          }] : [{
            consignee_name: "",
            consignee_address: "",
            consignee_country: ""
          }],
          consignmentType: updated.consignment_type,
          port_of_loading: updated.port_of_loading,
          port_of_discharge: updated.port_of_destination,
          destination_port: updated.port_of_destination,
          place_of_delivery: updated.port_of_destination,
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

        // AUTO-PUSH CHARGES: Push all rate line items from received_rates into the new job
        if (updated.received_rates && updated.received_rates.length > 0) {
          const chargesToPush = [];
          for (const rate of updated.received_rates) {
            const forwarder = rate.forwarder_name || "";
            for (const item of (rate.base_rates || [])) {
              if (Number(item.amount) > 0) {
                chargesToPush.push({
                  chargeHead: item.charge_name,
                  category: "Local/Agency",
                  parentId: newJob._id,
                  parentModule: "Job",
                  cost: {
                    amount: Number(item.amount),
                    basicAmount: Number(item.amount),
                    total: Number(item.amount),
                    netPayable: Number(item.amount),
                    particulars: item.charge_name,
                    vendorName: forwarder,
                  }
                });
              }
            }
            for (const item of (rate.shipping_line_rates || [])) {
              if (Number(item.amount) > 0) {
                chargesToPush.push({
                  chargeHead: item.charge_name,
                  category: "Shipping Line",
                  parentId: newJob._id,
                  parentModule: "Job",
                  cost: {
                    amount: Number(item.amount),
                    basicAmount: Number(item.amount),
                    total: Number(item.amount),
                    netPayable: Number(item.amount),
                    particulars: item.charge_name,
                    vendorName: forwarder,
                  }
                });
              }
            }
          }
          if (chargesToPush.length > 0) {
            chargesToPush.forEach(c => newJob.charges.push(c));
            await newJob.save();
          }
        }
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
      .select("enquiry_no organization_name port_of_loading port_of_destination shipment_type bl_details")
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
        if (enq.status === "Converted" || enq.source_job_no || enq.success_no) {
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
        if (enq.status === "Converted" || enq.source_job_no || enq.success_no) {
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
