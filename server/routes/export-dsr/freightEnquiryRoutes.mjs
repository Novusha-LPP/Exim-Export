import express from "express";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import ForwarderModel from "../../model/export/ForwarderModel.mjs";
import transporter from "../../utils/mailer.mjs";

const getCurrentFinancialYear = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based: 0=Jan, 3=April
  const startYear = month < 3 ? year - 1 : year;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
};

const router = express.Router();

// Get all enquiries
router.get("/freight-enquiries", async (req, res) => {
  try {
    const enquiries = await FreightEnquiryModel.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: enquiries });
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
          consignmentType: updated.consignment_type,
          port_of_loading: updated.port_of_loading,
          port_of_discharge: updated.port_of_destination,
          isGeneralJob: false,
          status: "Pending",
          detailedStatus: "Created from Freight Enquiry"
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

export default router;
