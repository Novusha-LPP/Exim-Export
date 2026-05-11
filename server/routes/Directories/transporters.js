import express from 'express';
import Transporter from "../../model/Directorties/Transporter.js";

const router = express.Router();

// GET /api/transporters - Get all transporters with pagination and search
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      active = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'branches.city': { $regex: search, $options: 'i' } },
        { 'branches.gst': { $regex: search, $options: 'i' } },
        { 'branches.pan': { $regex: search, $options: 'i' } }
      ];
    }

    if (active) query.active = active;

    const total = await Transporter.countDocuments(query);
    const transporters = await Transporter.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: transporters,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
        perPage: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/transporters/:id - Get transporter by ID
router.get('/:id', async (req, res) => {
  try {
    const transporter = await Transporter.findById(req.params.id);
    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }
    res.json({ success: true, data: transporter });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/transporters - Create new transporter
router.post('/', async (req, res) => {
  try {
    const transporter = new Transporter(req.body);
    const savedTransporter = await transporter.save();
    
    res.status(201).json({
      success: true,
      message: 'Transporter created successfully',
      data: savedTransporter
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Transporter with this name already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/transporters/:id - Update transporter
router.put('/:id', async (req, res) => {
  try {
    const transporter = await Transporter.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    res.json({
      success: true,
      message: 'Transporter updated successfully',
      data: transporter
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Transporter with this name already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/transporters/:id - Delete transporter
router.delete('/:id', async (req, res) => {
  try {
    const transporter = await Transporter.findByIdAndDelete(req.params.id);
    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }
    res.json({
      success: true,
      message: 'Transporter deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
