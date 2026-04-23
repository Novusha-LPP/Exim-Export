import express from "express";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import ForwarderModel from "../../model/export/ForwarderModel.mjs";
import transporter from "../../utils/mailer.mjs";

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

    const lastEnquiry = await FreightEnquiryModel.findOne({ shipment_type }).sort({ createdAt: -1 });
    let nextNo = 1;
    if (lastEnquiry && lastEnquiry.enquiry_no) {
      const parts = lastEnquiry.enquiry_no.split("/");
      const lastNoPart = parts[parts.length - 1];
      const lastNo = parseInt(lastNoPart);
      if (!isNaN(lastNo)) nextNo = lastNo + 1;
    }
    const enquiry_no = `FF/${typeCode}/${nextNo.toString().padStart(4, "0")}`;

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
    const updated = await FreightEnquiryModel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).lean();

    // AUTO-CONVERSION: Create an Export Job entry if status is Converted and it's an Export type
    if (req.body.status === "Converted" && updated.enquiry_no && String(updated.shipment_type).startsWith("Export")) {
      const existingJob = await ExJobModel.findOne({ job_no: updated.enquiry_no });
      if (!existingJob) {
        const newJob = new ExJobModel({
          job_no: updated.enquiry_no,
          jobNumber: updated.enquiry_no,
          year: String(new Date().getFullYear()).slice(-2) + "-" + String(new Date().getFullYear() + 1).slice(-2),
          job_date: updated.enquiry_date || new Date().toISOString().split("T")[0],
          exporter: updated.organization_name,
          consignmentType: updated.consignment_type,
          port_of_loading: updated.port_of_loading,
          port_of_discharge: updated.port_of_destination,
          isGeneralJob: true,
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

// Delete an enquiry
router.delete("/freight-enquiries/:id", async (req, res) => {
  try {
    await FreightEnquiryModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Enquiry deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
