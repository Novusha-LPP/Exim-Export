import mongoose from "mongoose";
import ExJobModel from "./model/export/ExJobModel.mjs";

const MONGO_URI = "mongodb://localhost:27017/export";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  try {
    const db = mongoose.connection.db;
    const entry = await db.collection("purchasebookentries").findOne({ tds: 51 });
    if (entry) {
      console.log("Found Entry with tds 51:", entry.entryNo);
      console.log("jobRef:", entry.jobRef);
      console.log("chargeRef:", entry.chargeRef);

      const job = await ExJobModel.findById(entry.jobRef).lean();
      if (job) {
        console.log("Found Job:", job.job_no);
        const charge = job.charges?.find(c => c._id?.toString() === entry.chargeRef?.toString());
        if (charge) {
          console.log("Found Charge:", JSON.stringify(charge, null, 2));
        } else {
          console.log("Charge not found in job charges by chargeRef");
          // Try by heading
          if (entry.chargeHeading) {
            const byHeading = job.charges?.find(c => c.chargeHead?.toLowerCase() === entry.chargeHeading?.toLowerCase());
            console.log("Found Charge by heading:", JSON.stringify(byHeading, null, 2));
          }
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
  }
}

main().catch(console.error);
