import express from 'express';
import ExportJobModel from '../../model/export/ExJobModel.mjs';
import ExJobModel from '../../model/export/ExJobModel.mjs';

const router = express.Router();

// GET /api/exports - List all exports with pagination & filtering
// Updated exports API with status filtering
router.get('/api/exports/:status?', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      exporter = '', 
      country = '', 
      movement_type = '',
      status = 'all' 
    } = { ...req.params, ...req.query };

    const filter = {};
    
    // Initialize $and array for complex queries
    if (!filter.$and) filter.$and = [];

    // Status filtering logic (similar to your import jobs API)
    if (status && status.toLowerCase() !== 'all') {
      const statusLower = status.toLowerCase();
      
      if (statusLower === 'pending') {
        filter.$and.push({
          $or: [
            { status: { $regex: '^pending$', $options: 'i' } },
            { status: { $exists: false } },
            { status: null },
            { status: '' }
          ]
        });
      } else if (statusLower === 'completed') {
        filter.$and.push({
          status: { $regex: '^completed$', $options: 'i' }
        });
      } else if (statusLower === 'cancelled') {
        filter.$and.push({
          status: { $regex: '^cancelled$', $options: 'i' }
        });
      } else {
        filter.$and.push({
          status: { $regex: `^${status}$`, $options: 'i' }
        });
      }
    }

    // Search filter
    if (search) {
      filter.$and.push({
        $or: [
          { job_no: { $regex: search, $options: 'i' } },
          { exporter_name: { $regex: search, $options: 'i' } },
          { consignee_name: { $regex: search, $options: 'i' } },
          { ie_code: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Additional filters
    if (exporter) {
      filter.$and.push({
        exporter_name: { $regex: exporter, $options: 'i' }
      });
    }
    
    if (country) {
      filter.$and.push({
        country_of_final_destination: { $regex: country, $options: 'i' }
      });
    }
    
    if (movement_type) {
      filter.$and.push({
        movement_type: movement_type
      });
    }

    // Remove empty $and array if no conditions were added
    if (filter.$and && filter.$and.length === 0) {
      delete filter.$and;
    }

    const skip = (page - 1) * limit;
    
    // Execute queries in parallel
    const [jobs, totalCount] = await Promise.all([
      ExportJobModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExportJobModel.countDocuments(filter)
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
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching export jobs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching export jobs', 
      error: error.message 
    });
  }
});

// POST /api/exports - Create new export job
router.post('/exports', async (req, res) => {
  try {
    const newJob = new ExportJobModel(req.body);
    const savedJob = await newJob.save();
    res.status(201).json({ success: true, data: savedJob });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating job', error: error.message });
  }
});

// OPTION 1: Search using regex pattern (Recommended)
// NOTE the * after :jobNo
router.get("/api/export-jobs/:jobNo*", async (req, res) => {
  try {
    const decodedJobNo = decodeURIComponent(req.params.jobNo || "");


    const job = await ExportJobModel.findOne({ job_no: decodedJobNo });

    if (!job) {
      console.log("No job for job_no:", decodedJobNo);
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});



export default router;
