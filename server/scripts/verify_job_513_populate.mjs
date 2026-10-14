import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import ExJobModel from '../model/export/ExJobModel.mjs';
import { populateJobSubcollections } from '../services/export-jobs/subcollectionSyncService.mjs';

async function verify() {
  await mongoose.connect('mongodb://localhost:27017/export');
  const jobNo = 'AMD/EXP/SEA/00513/26-27';

  const rawJob = await ExJobModel.findOne({ job_no: jobNo }).lean();
  console.log('Raw job containers[0] grossWeight (from old embedded exportjobs):', rawJob.containers?.[0]?.grossWeight);

  const populated = await populateJobSubcollections({ ...rawJob });
  console.log('Populated job containers[0] grossWeight (from new ex_containers):', populated.containers?.[0]?.grossWeight);
  console.log('Populated job containers[0] sealNo (from new ex_containers):', populated.containers?.[0]?.sealNo);

  await mongoose.disconnect();
}

verify();
