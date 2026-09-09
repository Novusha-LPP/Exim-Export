import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import ExJobModel from "./model/export/ExJobModel.mjs";

dotenv.config();

async function run() {
  const uri = process.env.USER_MONGODB_URI || process.env.MONGODB_URI || process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const parentJob = await ExJobModel.findOne({ job_no: 'AMD/EXP/SEA/01097/26-27' }).lean();
  let jobData = parentJob;
  const childJobs = await ExJobModel.find({
    $or: [
      { job_no: { $in: jobData.clubbed_jobs } },
      { parent_club_job: jobData.job_no }
    ],
    job_no: { $ne: jobData.job_no }
  }).lean();

  const mergedContainers = [];

  const parentInv = jobData.invoices?.[0] || {};
  const parentOp = jobData.operations?.[0] || {};
  const parentSt = parentOp.statusDetails?.[0] || {};
  const parentProduct = parentInv.products?.[0] || {};
  const parentHsnList = [...new Set((parentInv.products || []).map(p => p.hsn_code || p.hsnCode || p.hsn || (p.ritc?.hsnCode || p.ritc?.ritcCode || p.ritc)).filter(Boolean))].join(", ");

  const parentContainersToUse = (jobData.containers && jobData.containers.length > 0)
    ? jobData.containers
    : (parentOp.containerDetails || []);

  for (const c of parentContainersToUse) {
    mergedContainers.push({
      ...c,
      _sourceJobNo: jobData.job_no
    });
  }

  for (const j of childJobs) {
    const inv = j.invoices?.[0] || {};
    const op = j.operations?.[0] || {};
    const containersToUse = (j.containers && j.containers.length > 0) ? j.containers : (op.containerDetails || []);
    for (const c of containersToUse) {
      mergedContainers.push({
        ...c,
        _sourceJobNo: j.job_no
      });
    }
  }

  jobData.mergedContainers = mergedContainers;
  jobData.containers = (jobData.containers && jobData.containers.length > 0) ? jobData.containers : (parentOp.containerDetails || []);

  console.log('SIMULATED jobData.containers:', JSON.stringify(jobData.containers, null, 2));
  console.log('SIMULATED jobData.mergedContainers count:', jobData.mergedContainers?.length);
  console.log('SIMULATED jobData.mergedContainers:', JSON.stringify(jobData.mergedContainers, null, 2));

  if (parentJob?.clubbed_jobs?.length > 0) {
    const childJobs = await ExJobModel.find({ job_no: { $in: parentJob.clubbed_jobs } }).lean();
    for (const child of childJobs) {
      if (child.job_no === parentJob.job_no) continue;
      console.log(`\n=== CHILD JOB ${child.job_no} in MongoDB ===`);
      console.log('containers count:', child.containers?.length);
      console.log('containers array:', JSON.stringify(child.containers, null, 2));
      console.log('operations containerDetails:', JSON.stringify(child.operations?.[0]?.containerDetails, null, 2));
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
