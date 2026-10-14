import { ExContainer } from "../../model/export/normalized/ExContainerModel.mjs";
import { ExInvoice } from "../../model/export/normalized/ExInvoiceModel.mjs";
import { ExOperation } from "../../model/export/normalized/ExOperationModel.mjs";

/**
 * Returns true if normalized subcollections are active.
 * Enabled when USE_NORMALIZED_SUBCOLLECTIONS="true" OR in local development.
 */
export const isSubcollectionEnabled = () => {
  return (
    process.env.USE_NORMALIZED_SUBCOLLECTIONS === "true" ||
    process.env.NODE_ENV === "development"
  );
};

/**
 * Enriches a job document or POJO with fresh subcollection data from
 * ex_containers, ex_invoices, and ex_operations.
 *
 * @param {Object} job - The job document or object
 * @returns {Promise<Object>} The enriched job
 */
export async function populateJobSubcollections(job) {
  if (!job || !isSubcollectionEnabled()) return job;

  const jobNo = job.job_no || job.jobNumber;
  if (!jobNo) return job;

  try {
    const [subContainers, subInvoices, subOp] = await Promise.all([
      ExContainer.find({ job_no: jobNo }).lean(),
      ExInvoice.find({ job_no: jobNo }).lean(),
      ExOperation.findOne({ job_no: jobNo }).lean(),
    ]);

    // If subcollection data exists, override the embedded arrays with fresh subcollection records
    if (subContainers && subContainers.length > 0) {
      job.containers = subContainers;
    }
    if (subInvoices && subInvoices.length > 0) {
      job.invoices = subInvoices;
    }
    if (subOp) {
      job.operations = [subOp];
    }
  } catch (err) {
    console.error(`[SubcollectionSync] Error populating subcollections for ${jobNo}:`, err.message);
  }

  return job;
}

/**
 * Syncs updated containers, invoices, or operations to their normalized subcollections.
 *
 * @param {string} jobNo - The job number
 * @param {Object} updatePayload - Fields being updated ({ containers, invoices, operations })
 * @param {string|ObjectId} [jobId] - Optional MongoDB ObjectId of the job
 */
export async function syncJobSubcollections(jobNo, updatePayload = {}, jobId = null) {
  if (!jobNo || !isSubcollectionEnabled()) return;

  try {
    // 1. Sync Containers
    if (updatePayload.containers !== undefined && Array.isArray(updatePayload.containers)) {
      await ExContainer.deleteMany({ job_no: jobNo });
      if (updatePayload.containers.length > 0) {
        const containerDocs = updatePayload.containers.map((c) => {
          const doc = { ...c, job_no: jobNo };
          if (jobId) doc.job_id = jobId;
          delete doc._id;
          return doc;
        });
        await ExContainer.insertMany(containerDocs);
      }
    }

    // 2. Sync Invoices
    if (updatePayload.invoices !== undefined && Array.isArray(updatePayload.invoices)) {
      await ExInvoice.deleteMany({ job_no: jobNo });
      if (updatePayload.invoices.length > 0) {
        const invoiceDocs = updatePayload.invoices.map((inv) => {
          const doc = { ...inv, job_no: jobNo };
          if (jobId) doc.job_id = jobId;
          delete doc._id;
          return doc;
        });
        await ExInvoice.insertMany(invoiceDocs);
      }
    }

    // 3. Sync Operations
    if (updatePayload.operations !== undefined && Array.isArray(updatePayload.operations)) {
      if (updatePayload.operations.length > 0) {
        const opData = { ...updatePayload.operations[0], job_no: jobNo };
        if (jobId) opData.job_id = jobId;
        delete opData._id;
        await ExOperation.updateOne(
          { job_no: jobNo },
          { $set: opData },
          { upsert: true }
        );
      } else {
        await ExOperation.deleteOne({ job_no: jobNo });
      }
    }
  } catch (err) {
    console.error(`[SubcollectionSync] Error syncing subcollections for ${jobNo}:`, err.message);
  }
}

export default {
  isSubcollectionEnabled,
  populateJobSubcollections,
  syncJobSubcollections,
};
