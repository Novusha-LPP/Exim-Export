import express from 'express';
import TariffHead from '../../model/Directorties/TarrifHead.js';

const router = express.Router();

// GET /api/tariffHeads - Get all tariff heads
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      uqc = '',
      status = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { tariffHead: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (uqc) query.uqc = uqc;
    if (status) query.status = status;

    const total = await TariffHead.countDocuments(query);
    const tariffHeads = await TariffHead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: tariffHeads,
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

// GET /api/tariffHeads/:id - Get tariff head by ID
router.get('/:id', async (req, res) => {
  try {
    const tariffHead = await TariffHead.findById(req.params.id);
    if (!tariffHead) {
      return res.status(404).json({ message: 'Tariff Head not found' });
    }
    res.json({ success: true, data: tariffHead });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/tariffHeads - Create new tariff head
router.post('/', async (req, res) => {
  try {
    const tariffHead = new TariffHead(req.body);
    const savedTariffHead = await tariffHead.save();
    
    res.status(201).json({
      success: true,
      message: 'Tariff Head created successfully',
      data: savedTariffHead
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Tariff Head already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/tariffHeads/:id - Update tariff head
router.put('/:id', async (req, res) => {
  try {
    const tariffHead = await TariffHead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!tariffHead) {
      return res.status(404).json({ message: 'Tariff Head not found' });
    }

    res.json({
      success: true,
      message: 'Tariff Head updated successfully',
      data: tariffHead
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Tariff Head already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/tariffHeads/:id - Delete tariff head
router.delete('/:id', async (req, res) => {
  try {
    const tariffHead = await TariffHead.findByIdAndDelete(req.params.id);
    if (!tariffHead) {
      return res.status(404).json({ message: 'Tariff Head not found' });
    }
    res.json({
      success: true,
      message: 'Tariff Head deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
