import express from 'express';
import Scheme from '../../model/Directorties/Scheme.js';

const router = express.Router();

// GET /api/schemes - Get all schemes
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { schemeCode: { $regex: search, $options: 'i' } },
        { schemeDescription: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Scheme.countDocuments(query);
    const schemes = await Scheme.find(query)
      .sort({ schemeCode: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: schemes,
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

// GET /api/schemes/:id - Get scheme by ID
router.get('/:id', async (req, res) => {
  try {
    const scheme = await Scheme.findById(req.params.id);
    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found' });
    }
    res.json({ success: true, data: scheme });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/schemes - Create new scheme
router.post('/', async (req, res) => {
  try {
    const scheme = new Scheme(req.body);
    const savedScheme = await scheme.save();
    
    res.status(201).json({
      success: true,
      message: 'Scheme created successfully',
      data: savedScheme
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Scheme Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/schemes/:id - Update scheme
router.put('/:id', async (req, res) => {
  try {
    const scheme = await Scheme.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found' });
    }

    res.json({
      success: true,
      message: 'Scheme updated successfully',
      data: scheme
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Scheme Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/schemes/:id - Delete scheme
router.delete('/:id', async (req, res) => {
  try {
    const scheme = await Scheme.findByIdAndDelete(req.params.id);
    if (!scheme) {
      return res.status(404).json({ message: 'Scheme not found' });
    }
    res.json({
      success: true,
      message: 'Scheme deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
