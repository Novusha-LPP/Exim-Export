import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import ExJobModel from '../model/export/ExJobModel.mjs';

async function checkClub() {
  await mongoose.connect('mongodb://localhost:27017/export');
  const job = await ExJobModel.findOne({ job_no: 'AMD/EXP/SEA/00513/26-27' }).lean();
  console.log('is_club_job_parent:', job?.is_club_job_parent);
  console.log('clubbed_jobs:', job?.clubbed_jobs);
  await mongoose.disconnect();
}

checkClub();
