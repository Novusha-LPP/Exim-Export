import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { ExContainer } from '../model/export/normalized/ExContainerModel.mjs';

async function update513() {
  await mongoose.connect('mongodb://localhost:27017/export');
  const jobNo = 'AMD/EXP/SEA/00513/26-27';

  console.log(`Updating container TCNU5574141 in ex_containers for ${jobNo}...`);
  await ExContainer.updateOne(
    { job_no: jobNo, containerNo: 'TCNU5574141' },
    { $set: { grossWeight: 77777, sealNo: 'DEMO-SEAL-777' } }
  );

  const updated = await ExContainer.findOne({ job_no: jobNo, containerNo: 'TCNU5574141' }).lean();
  console.log(`Updated in ex_containers: containerNo=${updated.containerNo}, grossWeight=${updated.grossWeight}, sealNo=${updated.sealNo}`);

  await mongoose.disconnect();
}

update513();
