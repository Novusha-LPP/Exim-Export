import mongoose from "mongoose";
import dotenv from "dotenv";
import { syncFreightEnquiryToCRM } from "../services/crmSyncService.mjs";
import FreightEnquiryModel from "../model/export/FreightEnquiryModel.mjs";
import importDbConnection from "../model/importDB.js";

dotenv.config();

const MONGODB_URI = process.env.PROD_MONGODB_URI || process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to Export DB");
    
    // Wait for import DB connection to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const enquiries = await FreightEnquiryModel.find({}).sort({ createdAt: 1 }).lean();
    
    if (!enquiries || enquiries.length === 0) {
      console.log("No enquiries found to sync.");
      process.exit(0);
    }
    
    console.log(`Found ${enquiries.length} historical enquiries. Starting bulk sync...`);
    
    let successCount = 0;
    for (const enquiry of enquiries) {
      console.log(`Syncing ${enquiry.enquiry_no} (Status: ${enquiry.status})...`);
      try {
        await syncFreightEnquiryToCRM(enquiry, "update");
        successCount++;
      } catch (e) {
        console.error(`Failed to sync ${enquiry.enquiry_no}:`, e.message);
      }
    }
    
    console.log(`\n✅ Bulk sync complete! Successfully pushed ${successCount} out of ${enquiries.length} historical freight enquiries to the CRM.`);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
