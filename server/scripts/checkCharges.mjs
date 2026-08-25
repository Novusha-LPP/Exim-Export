import mongoose from "mongoose";
import dotenv from "dotenv";
import FreightEnquiryModel from "../model/export/FreightEnquiryModel.mjs";

dotenv.config();

const MONGODB_URI = process.env.PROD_MONGODB_URI || process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Find one with received_rates
    const e3 = await FreightEnquiryModel.findOne({ "received_rates.0": { $exists: true } }).lean();
    if (e3) {
      console.log("Enquiry with received_rates:", e3.enquiry_no);
      console.log("received_rates total:", e3.received_rates[0].total);
    } else {
      console.log("No enquiries have received_rates.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
