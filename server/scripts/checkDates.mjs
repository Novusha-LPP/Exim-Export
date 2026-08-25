import mongoose from "mongoose";
import dotenv from "dotenv";
import FreightEnquiryModel from "../model/export/FreightEnquiryModel.mjs";

dotenv.config();

const MONGODB_URI = process.env.PROD_MONGODB_URI || process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to Export DB");
    
    const enquiries = await FreightEnquiryModel.find({}).select("enquiry_no createdAt enquiry_date").sort({ createdAt: 1 }).lean();
    
    console.log(`Found ${enquiries.length} historical enquiries.`);
    
    // Group by month
    const byMonth = {};
    for (const enquiry of enquiries) {
      const date = enquiry.createdAt ? new Date(enquiry.createdAt) : new Date();
      const month = date.toISOString().substring(0, 7);
      if (!byMonth[month]) byMonth[month] = 0;
      byMonth[month]++;
      
      // Print first 5 just to see
      if (enquiries.indexOf(enquiry) < 5) {
        console.log(`- ${enquiry.enquiry_no}: createdAt=${enquiry.createdAt}, enquiry_date=${enquiry.enquiry_date}`);
      }
    }
    
    console.log("\nSummary by Month (based on createdAt):");
    console.log(byMonth);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
