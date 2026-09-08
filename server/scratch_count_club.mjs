import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import ExJobModel from "./model/export/ExJobModel.mjs";

async function run() {
  const uri = process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/export";
  await mongoose.connect(uri);

  const parentCount = await ExJobModel.countDocuments({ is_club_job_parent: true, isJobCanceled: { $ne: true } });
  const parentCount2627 = await ExJobModel.countDocuments({ is_club_job_parent: true, year: "26-27", isJobCanceled: { $ne: true } });
  const bothCount = await ExJobModel.countDocuments({
    $or: [
      { is_club_job_parent: true },
      { parent_club_job: { $exists: true, $ne: "" } }
    ],
    isJobCanceled: { $ne: true }
  });
  const bothCount2627 = await ExJobModel.countDocuments({
    $or: [
      { is_club_job_parent: true },
      { parent_club_job: { $exists: true, $ne: "" } }
    ],
    year: "26-27",
    isJobCanceled: { $ne: true }
  });

  console.log("Counts in DB:", { parentCount, parentCount2627, bothCount, bothCount2627 });

  await mongoose.disconnect();
}

run().catch(console.error);
