import { ExContainer } from "./ExContainerModel.mjs";
import { ExInvoice } from "./ExInvoiceModel.mjs";
import { ExOperation } from "./ExOperationModel.mjs";

/**
 * Attaches virtual populate references to ExportJobSchema
 * Allows seamless, backwards-compatible population of normalized subcollections.
 *
 * @param {import("mongoose").Schema} schema
 */
export function attachSubcollectionVirtuals(schema) {
  // 1. Virtual for decoupled containers
  schema.virtual("sub_containers", {
    ref: "ExContainer",
    localField: "job_no",
    foreignField: "job_no",
  });

  // 2. Virtual for decoupled invoices
  schema.virtual("sub_invoices", {
    ref: "ExInvoice",
    localField: "job_no",
    foreignField: "job_no",
  });

  // 3. Virtual for decoupled operations
  schema.virtual("sub_operations", {
    ref: "ExOperation",
    localField: "job_no",
    foreignField: "job_no",
    justOne: true,
  });

  // Enable virtuals in JSON/Object conversions
  schema.set("toObject", { virtuals: true });
  schema.set("toJSON", { virtuals: true });

  /**
   * Helper method on document instance to reconstitute the unified legacy contract
   * seamlessly for document generators and frontend views.
   */
  schema.methods.getUnifiedContract = function () {
    const jobObj = this.toObject();

    // If virtuals were populated, map them to standard property names
    if (this.sub_containers && this.sub_containers.length > 0) {
      jobObj.containers = this.sub_containers;
    }
    if (this.sub_invoices && this.sub_invoices.length > 0) {
      jobObj.invoices = this.sub_invoices;
    }
    if (this.sub_operations) {
      jobObj.operations = [this.sub_operations];
    }

    return jobObj;
  };
}

export default attachSubcollectionVirtuals;
