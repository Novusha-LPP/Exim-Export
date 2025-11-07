import express from "express";
import ExportJobModel from "../../model/export/ExJobModel.mjs";

const router = express.Router();

router.get("/api/exports/documentation", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      exporter = "",
      country = "",
      movement_type = "",
      status = "all", // keep for future use if needed
    } = req.query;

    const filter = { $and: [] };

    // Filter for documentation pending jobs
    filter.$and.push({
      $or: [
        { documentation_completed: false },
        { documentation_completed: { $exists: false } },
        { documentation_completed: null },
      ],
    });

    // Optional: You can add status filtering here or omit if you want all docs regardless of status
    if (status && status.toLowerCase() !== "all") {
      filter.$and.push({
        status: { $regex: `^${status}$`, $options: "i" },
      });
    }

    // Search filter
    if (search) {
      filter.$and.push({
        $or: [
          { job_no: { $regex: search, $options: "i" } },
          { exporter_name: { $regex: search, $options: "i" } },
          { consignee_name: { $regex: search, $options: "i" } },
          { ie_code: { $regex: search, $options: "i" } },
        ],
      });
    }

    // Additional filters
    if (exporter) {
      filter.$and.push({
        exporter_name: { $regex: exporter, $options: "i" },
      });
    }

    if (country) {
      filter.$and.push({
        country_of_final_destination: { $regex: country, $options: "i" },
      });
    }

    if (movement_type) {
      filter.$and.push({
        movement_type: movement_type,
      });
    }

    // Remove $and if no filter added (to avoid empty $and array)
    if (filter.$and.length === 0) {
      delete filter.$and;
    }

    const skip = (page - 1) * limit;

    const [jobs, totalCount] = await Promise.all([
      ExportJobModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExportJobModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasNextPage: page < Math.ceil(totalCount / parseInt(limit)),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching documentation jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching documentation jobs",
      error: error.message,
    });
  }
});

router.get("/api/export/documentation/jobs/:job_no", async (req, res) => {
  try {
    const { job_no } = req.params;
    console.log("Fetching job details for job_no:", job_no);
    if (!job_no)
      return res
        .status(400)
        .json({ success: false, message: "job_no is required" });

    const job = await ExportJobModel.findOne({
      job_no: { $regex: job_no, $options: "i" },
    })
      .select("-__v -updatedAt -createdAt") // exclude technical fields for cleanliness
      .lean();

    // Extract basic details to send explicitly (pick fields as needed)
    const basicDetails = {
      job_no: job.job_no,
      custom_house: job.custom_house,
      exporter_name: job.exporter_name,
      invoice_number: job.invoice_number,
      invoice_date: job.invoice_date,
      supplier_exporter: job.supplier_exporter,
      gross_weight: job.gross_weight,
      net_weight: job.net_weight,
      port_of_origin: job.port_of_origin,
      port_of_discharge: job.port_of_discharge,
      country_of_final_destination: job.country_of_final_destination,
      movement_type: job.movement_type,
      priorityJob: job.priorityJob,
      bank_name: job.bank_name,
      cth_no: job.cth_no,
      status: job.status,
      detailed_status: job.detailed_status,
      remarks: job.remarks,
      adCode: job.adCode,
    };

    // Build documents metadata array from the job document arrays (leo_copy, assessed_copy, gate_pass_copy)
    const documents = [];

    ["leo_copy", "assessed_copy", "gate_pass_copy"].forEach((field) => {
      if (Array.isArray(job[field])) {
        job[field].forEach((url) => {
          const filename = url.split("/").pop();
          documents.push({
            field,
            url,
            name: filename,
            type: filename.split(".").pop(),
            size: "unknown",
            uploadedAt: null,
          });
        });
      }
    });

    // Respond sending basic details, full job object if needed, and documents metadata
    res.json({ success: true, basicDetails, job, documents });
  } catch (error) {
    console.error("Error fetching job:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// PATCH submit uploaded documents & mark as submitted
router.patch(
  "/api/export/documentation/jobs/:job_no/submit",
  async (req, res) => {
    // Expect body: { uploadedDocuments: { leo_copy: [urls], assessed_copy: [urls], gate_pass_copy: [urls] } }
    try {
      const { job_no } = req.params;
      const { uploadedDocuments } = req.body;
      if (!job_no || !uploadedDocuments) {
        return res
          .status(400)
          .json({
            success: false,
            message: "job_no and uploadedDocuments required",
          });
      }

      // Find job
      const job = await ExportJobModel.findOne({
        job_no: { $regex: job_no, $options: "i" },
      });
      if (!job)
        return res
          .status(404)
          .json({ success: false, message: "Job not found" });

      // Update document arrays and status
      ["leo_copy", "assessed_copy", "gate_pass_copy"].forEach((field) => {
        if (Array.isArray(uploadedDocuments[field])) {
          job[field] = uploadedDocuments[field]; // overwrite or set uploaded urls
        }
      });

      job.submission_status = "submitted";

      await job.save();

      res.json({ success: true, message: "Job submitted successfully" });
    } catch (error) {
      console.error("Error submitting job:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Server error",
          error: error.message,
        });
    }
  }
);

export default router;
