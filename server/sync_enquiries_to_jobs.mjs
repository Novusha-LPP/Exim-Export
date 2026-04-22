import mongoose from "mongoose";
import FreightEnquiryModel from "./server/model/export/FreightEnquiryModel.mjs";
import ExJobModel from "./server/model/export/ExJobModel.mjs";

const MONGO_URI = "mongodb://localhost:27017/exim_export";

async function syncConvertedEnquiries() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const convertedEnquiries = await FreightEnquiryModel.find({ 
      status: "Converted",
      shipment_type: /^Export/i 
    }).lean();

    console.log(`Found ${convertedEnquiries.length} converted export enquiries.`);

    for (const enquiry of convertedEnquiries) {
      const existingJob = await ExJobModel.findOne({ job_no: enquiry.enquiry_no });
      
      if (!existingJob) {
        console.log(`Creating job for ${enquiry.enquiry_no}...`);
        const newJob = new ExJobModel({
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
          detailedStatus: "Created from Freight Enquiry (Backfill)"
        });
        await newJob.save();
      } else {
        console.log(`Job for ${enquiry.enquiry_no} already exists.`);
      }
    }

    console.log("Sync completed.");
    process.exit(0);
  } catch (error) {
    console.error("Error syncing enquiries:", error);
    process.exit(1);
  }
}

syncConvertedEnquiries();
