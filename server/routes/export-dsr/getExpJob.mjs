import express from "express";
import ExJobModel from "../../model/export/ExJobModel.mjs";
import FreightEnquiryModel from "../../model/export/FreightEnquiryModel.mjs";

const router = express.Router();

router.get("/api/get-export-job/:jobNo(.*)", async (req, res) => {
  try {
    const { jobNo } = req.params;

    let job = await ExJobModel.findOne({
      $or: [
        { job_no: jobNo },
        { jobNumber: jobNo }
      ]
    });
    
    // If job not found directly, check if an enquiry maps this jobNo to an alternate success_no / enquiry_no
    if (!job && String(jobNo).startsWith("FF")) {
      const existingEnquiry = await FreightEnquiryModel.findOne({
        $or: [
          { enquiry_no: jobNo },
          { success_no: jobNo }
        ]
      });
      if (existingEnquiry) {
        const altJobNos = [existingEnquiry.enquiry_no, existingEnquiry.success_no].filter(Boolean);
        job = await ExJobModel.findOne({
          $or: [
            { job_no: { $in: altJobNos } },
            { jobNumber: { $in: altJobNos } }
          ]
        });
      }
    }

    // JUST-IN-TIME CREATION: If job not found, check if it's a Freight Enquiry
    if (!job && String(jobNo).startsWith("FF")) {
      const enquiry = await FreightEnquiryModel.findOne({ 
        $or: [
          { enquiry_no: jobNo },
          { success_no: jobNo }
        ]
      });

      if (enquiry) {
        const actualJobNo = enquiry.success_no || enquiry.enquiry_no;

        // Check if job record already exists for actualJobNo
        job = await ExJobModel.findOne({
          $or: [
            { job_no: actualJobNo },
            { jobNumber: actualJobNo }
          ]
        });

        if (!job) {
          console.log(`Creating missing job record for successful enquiry: ${jobNo}`);
          const isImport = String(enquiry.shipment_type).startsWith("Import");
          job = new ExJobModel({
            job_no: actualJobNo,
            jobNumber: actualJobNo,
            year: String(new Date().getFullYear()).slice(-2) + "-" + String(new Date().getFullYear() + 1).slice(-2),
            job_date: enquiry.enquiry_date || new Date().toISOString().split("T")[0],
            exporter: isImport ? "" : enquiry.organization_name,
            shipper: isImport ? "" : enquiry.organization_name,
            consignees: isImport ? [{
              consignee_name: enquiry.organization_name,
              consignee_address: "",
              consignee_country: ""
            }] : [{
              consignee_name: "",
              consignee_address: "",
              consignee_country: ""
            }],
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
          try {
            await job.save();
          } catch (saveErr) {
            if (saveErr.code === 11000) {
              console.warn(`[JIT] Duplicate key on save for ${actualJobNo}, retrieving existing job...`);
              job = await ExJobModel.findOne({
                $or: [
                  { job_no: actualJobNo },
                  { jobNumber: actualJobNo },
                  { job_no: jobNo },
                  { jobNumber: jobNo }
                ]
              });
            } else {
              throw saveErr;
            }
          }
        }
      }
    } else if (job && String(jobNo).startsWith("FF")) {
      // JIT BACKFILL: If job exists but lacks the mapped enquiry fields (e.g. created before schema mapping updates), backfill them from enquiry
      const enquiry = await FreightEnquiryModel.findOne({
        $or: [
          { enquiry_no: jobNo },
          { success_no: jobNo }
        ],
        $or: [
          { status: "Converted" },
          { source_job_no: { $exists: true, $ne: "" } },
          { success_no: { $exists: true, $ne: "" } }
        ]
      });
      if (enquiry) {
        let changed = false;
        const isImport = String(enquiry.shipment_type).startsWith("Import");

        if (isImport) {
          if (!job.consignees || job.consignees.length === 0 || !job.consignees[0]?.consignee_name) {
            job.consignees = [{
              consignee_name: enquiry.organization_name,
              consignee_address: "",
              consignee_country: ""
            }];
            changed = true;
          }
          if (job.shipper === enquiry.organization_name) {
            job.shipper = "";
            changed = true;
          }
          if (job.exporter === enquiry.organization_name) {
            job.exporter = "";
            changed = true;
          }
        } else {
          if (!job.shipper && enquiry.organization_name) {
            job.shipper = enquiry.organization_name;
            changed = true;
          }
          if (!job.exporter && enquiry.organization_name) {
            job.exporter = enquiry.organization_name;
            changed = true;
          }
        }

        const fieldsToMap = {
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

    // Merge FreightEnquiry details if FF job
    if (String(jobNo).startsWith("FF")) {
      const enquiry = await FreightEnquiryModel.findOne({
        $or: [
          { enquiry_no: jobNo },
          { success_no: jobNo },
          { source_job_no: jobNo }
        ]
      }).lean();
      if (enquiry) {
        jobData.shipment_type = enquiry.shipment_type;
        jobData.container_size = enquiry.container_size;
        jobData.goods_stuffed = enquiry.goods_stuffed;
        jobData.contact_no = enquiry.contact_no;
        jobData.email = enquiry.email;
        jobData.is_manual_cbm = enquiry.is_manual_cbm;
        jobData.dimensions = enquiry.dimensions || [];
        jobData.bl_details = enquiry.bl_details || {};
        jobData.remarks = enquiry.remarks || jobData.remarks;
        if (enquiry.containers && enquiry.containers.length > 0 && (!jobData.containers || jobData.containers.length === 0)) {
          jobData.containers = enquiry.containers.map((c, i) => ({
            serialNumber: i + 1,
            containerNo: c.container_number || "",
            customSealNo: c.custom_seal || "",
            shippingLineSealNo: c.line_seal || ""
          }));
        }
      }
    }

    const excludeChildJobs = req.query.excludeChildJobs === "true";

    if (jobData.is_club_job_parent && Array.isArray(jobData.clubbed_jobs) && jobData.clubbed_jobs.length > 0 && !excludeChildJobs) {
      const childJobs = await ExJobModel.find({
        $or: [
          { job_no: { $in: jobData.clubbed_jobs } },
          { parent_club_job: jobData.job_no }
        ]
      }).lean();
      
      const mergedContainers = [];

      for (const j of childJobs) {
        const inv = j.invoices?.[0] || {};
        const op = j.operations?.[0] || {};
        const st = op.statusDetails?.[0] || {};
        const product = inv.products?.[0] || {};
        const hsnList = [...new Set((inv.products || []).map(p => p.hsn_code || p.hsnCode || p.hsn || (p.ritc?.hsnCode || p.ritc?.ritcCode || p.ritc)).filter(Boolean))].join(", ");
        
        for (const c of (j.containers || [])) {
          mergedContainers.push({
            ...c,
            _sourceJobNo: j.job_no,
            _sourceSbNo: j.custom_house_details?.shipping_bill_no || j.sb_no || j.shippingBillNo,
            _sourceSbDate: j.custom_house_details?.sb_date || j.sb_date,
            _sourceInvoiceNumber: inv.invoiceNumber,
            _sourceInvoiceValue: inv.invoiceValue,
            _sourceLeoDate: st.leoDate,
            _sourceDescription: product.description || j.descriptionOfGoods || j.description,
            _sourceHsnList: hsnList || j.custom_house_details?.hsn_code || j.hsn,
            _sourceFobValue: j.invoices?.[0]?.freightInsuranceCharges?.fobValue?.amount || ""
          });
        }
      }

      jobData.containers = mergedContainers;
      jobData.invoices = childJobs.flatMap(j => j.invoices || []).filter(Boolean);
      jobData.operations = childJobs.flatMap(j => j.operations || []).filter(Boolean);
    }

    res.json(jobData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
