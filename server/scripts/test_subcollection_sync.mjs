import mongoose from "mongoose";
import dotenv from "dotenv";
import { ExContainer } from "../model/export/normalized/ExContainerModel.mjs";
import { ExInvoice } from "../model/export/normalized/ExInvoiceModel.mjs";
import { ExOperation } from "../model/export/normalized/ExOperationModel.mjs";

dotenv.config();

const LOCAL_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/export";

async function testSubcollectionActiveSync() {
  console.log("Connecting to local MongoDB...");
  await mongoose.connect(LOCAL_URI);

  const testJobNo = "AMD/EXP/SEA/00001/26-27";

  console.log(`\n1. Fetching containers for ${testJobNo} from ex_containers...`);
  const initialContainers = await ExContainer.find({ job_no: testJobNo }).lean();
  console.log(`Found ${initialContainers.length} containers:`, initialContainers.map(c => c.containerNo));

  console.log(`\n2. Updating a container field in ex_containers...`);
  const updatedGrossWeight = 25000 + Math.floor(Math.random() * 500);
  await ExContainer.updateOne(
    { job_no: testJobNo, containerNo: initialContainers[0]?.containerNo },
    { $set: { grossWeight: updatedGrossWeight } }
  );
  console.log(`Updated container ${initialContainers[0]?.containerNo} grossWeight to ${updatedGrossWeight} kg.`);

  console.log(`\n3. Verifying update in ex_containers...`);
  const verifyContainer = await ExContainer.findOne({ job_no: testJobNo, containerNo: initialContainers[0]?.containerNo }).lean();
  console.log(`Verified in ex_containers: grossWeight = ${verifyContainer.grossWeight} kg.`);

  await mongoose.disconnect();
  console.log("\nDone test.");
}

testSubcollectionActiveSync();
