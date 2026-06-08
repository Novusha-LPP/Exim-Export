import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";

const router = express.Router();

router.get("/api/get-export-job/:jobNo(.*)", async (req, res) => {
  try {
    const { jobNo } = req.params;

    let job = await ExJobModel.findOne({
      job_no: jobNo,
    });
    
    // JUST-IN-TIME CREATION: If job not found, check if it's a converted Freight Enquiry
    if (!job && String(jobNo).startsWith("FF")) {
      const enquiry = await FreightEnquiryModel.findOne({ 
        $or: [
          { enquiry_no: jobNo },
          { success_no: jobNo }
        ],
        status: "Converted" 
      });

      if (enquiry) {
        console.log(`Creating missing job record for successful enquiry: ${jobNo}`);
        const actualJobNo = enquiry.success_no || enquiry.enquiry_no;
        job = new ExJobModel({
          job_no: actualJobNo,
          jobNumber: actualJobNo,
          year: String(new Date().getFullYear()).slice(-2) + "-" + String(new Date().getFullYear() + 1).slice(-2),
          job_date: enquiry.enquiry_date || new Date().toISOString().split("T")[0],
          exporter: enquiry.organization_name,
          shipper: enquiry.organization_name,
          consignmentType: enquiry.consignment_type,
          port_of_loading: enquiry.port_of_loading,
          port_of_discharge: enquiry.port_of_destination,
          isGeneralJob: true,
          status: "Pending",
          detailedStatus: "Created from Freight Enquiry (JIT)",
          movement_type: enquiry.movement_type,
          gross_weight_kg: enquiry.gross_weight,
          gross_weight_unit: enquiry.gross_weight_unit,
          net_weight_kg: enquiry.net_weight,
          net_weight_unit: enquiry.net_weight_unit,
          chargeable_weight: enquiry.chargeable_weight,
          chargeable_weight_unit: enquiry.chargeable_weight_unit,
          volume_cbm: enquiry.volume_cbm,
          volume_unit: enquiry.volume_unit,
          total_no_of_pkgs: enquiry.no_packages,
          package_unit: enquiry.package_unit,
          volume_weight: enquiry.volume_weight,
        });
        await job.save();
      }
    } else if (job && String(jobNo).startsWith("FF")) {
      // JIT BACKFILL: If job exists but lacks the mapped enquiry fields (e.g. created before schema mapping updates), backfill them from enquiry
      const enquiry = await FreightEnquiryModel.findOne({
        $or: [
          { enquiry_no: jobNo },
          { success_no: jobNo }
        ],
        status: "Converted"
      });
      if (enquiry) {
        let changed = false;
        const fieldsToMap = {
          shipper: enquiry.organization_name,
          movement_type: enquiry.movement_type,
          gross_weight_kg: enquiry.gross_weight,
          gross_weight_unit: enquiry.gross_weight_unit,
          net_weight_kg: enquiry.net_weight,
          net_weight_unit: enquiry.net_weight_unit,
          chargeable_weight: enquiry.chargeable_weight,
          chargeable_weight_unit: enquiry.chargeable_weight_unit,
          volume_cbm: enquiry.volume_cbm,
          volume_unit: enquiry.volume_unit,
          total_no_of_pkgs: enquiry.no_packages,
          package_unit: enquiry.package_unit,
          volume_weight: enquiry.volume_weight,
        };

        for (const [key, val] of Object.entries(fieldsToMap)) {
          if (!job[key] && val) {
            job[key] = val;
            changed = true;
          }
        }

        if (changed) {
          console.log(`[JIT Backfill] Backfilling enquiry fields for existing job: ${jobNo}`);
          await job.save();
        }
      }
    }

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    let jobData = job.toObject();

    if (jobData.is_club_job_parent && Array.isArray(jobData.clubbed_jobs) && jobData.clubbed_jobs.length > 0) {
      const childJobs = await ExJobModel.find({ job_no: { $in: jobData.clubbed_jobs } }).lean();
      
      jobData.containers = childJobs.flatMap(j => {
        const inv = j.invoices?.[0] || {};
        const op = j.operations?.[0] || {};
        const st = op.statusDetails?.[0] || {};
        const product = inv.products?.[0] || {};
        const hsnList = [...new Set((inv.products || []).map(p => p.hsn_code || p.hsnCode || p.hsn || (p.ritc?.hsnCode || p.ritc?.ritcCode || p.ritc)).filter(Boolean))].join(", ");
        return (j.containers || []).map(c => ({
          ...c,
          _sourceJobNo: j.job_no,
          _sourceSbNo: j.sb_no || j.shippingBillNo,
          _sourceSbDate: j.sb_date,
          _sourceInvoiceNumber: inv.invoiceNumber,
          _sourceInvoiceValue: inv.invoiceValue,
          _sourceLeoDate: st.leoDate,
          _sourceDescription: product.description,
          _sourceHsnList: hsnList,
          _sourceFobValue: j.invoices?.[0]?.freightInsuranceCharges?.fobValue?.amount || ""
        }));
      });

      jobData.invoices = childJobs.flatMap(j => j.invoices || []);
      jobData.operations = childJobs.flatMap(j => j.operations || []);
    }

    res.json(jobData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
