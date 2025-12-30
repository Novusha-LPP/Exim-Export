import express from 'express';
import Port from '../../model/Directorties/Port.js';

const router = express.Router();

// GET /api/ports - Get all ports
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      country = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { portCode: { $regex: search, $options: 'i' } },
        { portName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { unece_code: { $regex: search, $options: 'i' } }
      ];
    }

    if (country) query.country = { $regex: country, $options: 'i' };

    const total = await Port.countDocuments(query);
    const ports = await Port.find(query)
      .sort({ portCode: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: ports,
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

// GET /api/ports/:id - Get port by ID
router.get('/:id', async (req, res) => {
  try {
    const port = await Port.findById(req.params.id);
    if (!port) {
      return res.status(404).json({ message: 'Port not found' });
    }
    res.json({ success: true, data: port });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/ports - Create new port
router.post('/', async (req, res) => {
  try {
    const port = new Port(req.body);
    const savedPort = await port.save();

    res.status(201).json({
      success: true,
      message: 'Port created successfully',
      data: savedPort
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Port Code already exists'
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/ports/:id - Update port
router.put('/:id', async (req, res) => {
  try {
    const port = await Port.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!port) {
      return res.status(404).json({ message: 'Port not found' });
    }

    res.json({
      success: true,
      message: 'Port updated successfully',
      data: port
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Port Code already exists'
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/ports/:id - Delete port
router.delete('/:id', async (req, res) => {
  try {
    const port = await Port.findByIdAndDelete(req.params.id);
    if (!port) {
      return res.status(404).json({ message: 'Port not found' });
    }
    res.json({
      success: true,
      message: 'Port deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
