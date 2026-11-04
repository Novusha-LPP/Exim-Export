import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  const uri = process.env.PROD_MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const logs = await db.collection('exportaudittrails').find({
    $or: [{ job_no: /01768/ }, { 'changes.job_no': /01768/ }],
    timestamp: {
      $gte: new Date('2026-11-03T10:05:00Z'),
      $lte: new Date('2026-11-03T10:10:00Z')
    }
  }).toArray();

  console.log('Logs count between 10:05 and 10:10:', logs.length);
  for (const l of logs) {
    console.log(JSON.stringify(l, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(console.error);