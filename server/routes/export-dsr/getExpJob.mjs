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

    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
