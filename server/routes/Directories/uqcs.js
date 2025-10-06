import express from 'express';
import UQC from '../../model/Directorties/UQC.js';

const router = express.Router();

// GET /api/uqcs - Get all UQCs
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { uqc: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) query.type = { $regex: type, $options: 'i' };

    const total = await UQC.countDocuments(query);
    const uqcs = await UQC.find(query)
      .sort({ uqc: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: uqcs,
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

// GET /api/uqcs/:id - Get UQC by ID
router.get('/:id', async (req, res) => {
  try {
    const uqc = await UQC.findById(req.params.id);
    if (!uqc) {
      return res.status(404).json({ message: 'UQC not found' });
    }
    res.json({ success: true, data: uqc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/uqcs - Create new UQC
router.post('/', async (req, res) => {
  try {
    const uqc = new UQC(req.body);
    const savedUQC = await uqc.save();
    
    res.status(201).json({
      success: true,
      message: 'UQC created successfully',
      data: savedUQC
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'UQC Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/uqcs/:id - Update UQC
router.put('/:id', async (req, res) => {
  try {
    const uqc = await UQC.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!uqc) {
      return res.status(404).json({ message: 'UQC not found' });
    }

    res.json({
      success: true,
      message: 'UQC updated successfully',
      data: uqc
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'UQC Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/uqcs/:id - Delete UQC
router.delete('/:id', async (req, res) => {
  try {
    const uqc = await UQC.findByIdAndDelete(req.params.id);
    if (!uqc) {
      return res.status(404).json({ message: 'UQC not found' });
    }
    res.json({
      success: true,
      message: 'UQC deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
