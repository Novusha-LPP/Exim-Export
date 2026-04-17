import express from 'express';
import District from '../../model/Directorties/District.js';

const router = express.Router();

// GET /api/districts - Get all districts with search and status filter
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 300, // Higher limit as it's often used for dropdowns
      search = '',
      status = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { districtName: { $regex: search, $options: 'i' } },
        { districtCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;

    const total = await District.countDocuments(query);
    const districts = await District.find(query)
      .sort({ districtName: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: districts,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        perPage: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/districts/:id - Get district by ID
router.get('/:id', async (req, res) => {
  try {
    const district = await District.findById(req.params.id);
    if (!district) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }
    res.json({ success: true, data: district });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/districts - Create new district
router.post('/', async (req, res) => {
  try {
    const district = new District(req.body);
    const savedDistrict = await district.save();
    
    res.status(201).json({
      success: true,
      message: 'District created successfully',
      data: savedDistrict
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ 
        success: false,
        message: `${field.toUpperCase()} already exists` 
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/districts/:id - Update district
router.put('/:id', async (req, res) => {
  try {
    const district = await District.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!district) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }

    res.json({
      success: true,
      message: 'District updated successfully',
      data: district
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/districts/:id - Delete district
router.delete('/:id', async (req, res) => {
  try {
    const district = await District.findByIdAndDelete(req.params.id);
    if (!district) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }
    res.json({
      success: true,
      message: 'District deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
