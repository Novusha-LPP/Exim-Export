import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './server/.env' });
dotenv.config();

import ExJobModel from "../model/export/ExJobModel.mjs";

async function fixParentContainers() {
  const uri = process.env.USER_MONGODB_URI || process.env.MONGODB_URI || process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI;
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const parentJobs = await ExJobModel.find({
    is_club_job_parent: true,
    clubbed_jobs: { $exists: true, $not: { $size: 0 } }
  }).lean();

  console.log(`Found ${parentJobs.length} parent club jobs to check.`);

  let totalUpdated = 0;

  for (const parent of parentJobs) {
    if (!Array.isArray(parent.containers) || parent.containers.length === 0) continue;

    const childJobNos = (parent.clubbed_jobs || []).filter(jNo => jNo !== parent.job_no);
    if (childJobNos.length === 0) continue;

    const childJobs = await ExJobModel.find({ job_no: { $in: childJobNos } }).lean();

    // Map all child containers
    const childContainerSignatures = new Set();
    const childContainerIds = new Set();

    for (const child of childJobs) {
      if (!Array.isArray(child.containers)) continue;
      for (const c of child.containers) {
        const cNo = String(c.containerNo || c.container_number || "").trim().toUpperCase();
        const pkgs = Number(c.pkgsStuffed || 0);
        const weight = Number(c.grossWeight || 0);
        if (cNo) {
          childContainerSignatures.add(`${cNo}_${pkgs}_${weight}`);
        }
        if (c._id) {
          childContainerIds.add(String(c._id));
        }
      }
    }

    if (childContainerSignatures.size === 0 && childContainerIds.size === 0) continue;

    // Filter parent containers
    const originalCount = parent.containers.length;
    const cleanedContainers = parent.containers.filter(c => {
      const cNo = String(c.containerNo || c.container_number || "").trim().toUpperCase();
      const pkgs = Number(c.pkgsStuffed || 0);
      const weight = Number(c.grossWeight || 0);
      const sig = `${cNo}_${pkgs}_${weight}`;
      const cId = c._id ? String(c._id) : "";

      // If this container in parent job matches a child container by signature or ID, it's a leaked child container
      if (cId && childContainerIds.has(cId)) {
        return false;
      }
      if (cNo && childContainerSignatures.has(sig)) {
        return false;
      }
      return true;
    });

    if (cleanedContainers.length !== originalCount) {
      console.log(`Fixing parent job ${parent.job_no}: reduced containers from ${originalCount} to ${cleanedContainers.length}`);
      await ExJobModel.updateOne(
        { job_no: parent.job_no },
        { $set: { containers: cleanedContainers } }
      );
      totalUpdated++;
    }
  }

  console.log(`Finished! Updated ${totalUpdated} parent club jobs.`);
  await mongoose.disconnect();
}

fixParentContainers().catch(console.error);
