import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import ExJobModel from '../model/export/ExJobModel.mjs';
import { ExContainer } from '../model/export/normalized/ExContainerModel.mjs';

async function inspectBoth() {
  await mongoose.connect('mongodb://localhost:27017/export');
  const jobNo = 'AMD/EXP/SEA/00513/26-27';

  console.log('--- 1. FROM EX_CONTAINERS COLLECTION ---');
  const fromExContainers = await ExContainer.find({ job_no: jobNo }).lean();
  console.log(fromExContainers.map(c => ({ containerNo: c.containerNo, grossWeight: c.grossWeight, sealNo: c.sealNo })));

  console.log('--- 2. FROM EXPORTJOBS COLLECTION ---');
  const fromExportJobs = await ExJobModel.findOne({ job_no: jobNo }).lean();
  console.log(fromExportJobs.containers.map(c => ({ containerNo: c.containerNo, grossWeight: c.grossWeight, sealNo: c.sealNo })));

  await mongoose.disconnect();
}

inspectBoth();
