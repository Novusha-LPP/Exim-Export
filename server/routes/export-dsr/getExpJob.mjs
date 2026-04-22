import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";

const router = express.Router();

router.get("/api/get-export-job/:jobNo(.*)", async (req, res) => {
  try {
    const { jobNo } = req.params;

    let job = await ExJobModel.findOne({
      job_no: jobNo,
    });
    
    // JUST-IN-TIME CREATION: If job not found, check if it's a converted Freight Enquiry
    if (!job && String(jobNo).startsWith("FF/")) {
      const enquiry = await FreightEnquiryModel.findOne({ 
        enquiry_no: jobNo, 
        status: "Converted" 
      });

      if (enquiry) {
        console.log(`Creating missing job record for successful enquiry: ${jobNo}`);
        job = new ExJobModel({
          job_no: enquiry.enquiry_no,
          jobNumber: enquiry.enquiry_no,
          year: String(new Date().getFullYear()).slice(-2) + "-" + String(new Date().getFullYear() + 1).slice(-2),
          job_date: enquiry.enquiry_date || new Date().toISOString().split("T")[0],
          exporter: enquiry.organization_name,
          consignmentType: enquiry.consignment_type,
          port_of_loading: enquiry.port_of_loading,
          port_of_discharge: enquiry.port_of_destination,
          isGeneralJob: true,
          status: "Pending",
          detailedStatus: "Created from Freight Enquiry (JIT)"
        });
        await job.save();
      }
    }

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
