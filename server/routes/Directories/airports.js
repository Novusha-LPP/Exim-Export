import express from 'express';
import AirPort from '../../model/Directorties/AirPort.js';

const router = express.Router();

// GET /api/airPorts - Get all air ports
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
        { portCode: { $regex: search, $options: 'i' } },
        { portName: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await AirPort.countDocuments(query);
    const airPorts = await AirPort.find(query)
      .sort({ portCode: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: airPorts,
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

// GET /api/airPorts/:id - Get air port by ID
router.get('/:id', async (req, res) => {
  try {
    const airPort = await AirPort.findById(req.params.id);
    if (!airPort) {
      return res.status(404).json({ message: 'Air Port not found' });
    }
    res.json({ success: true, data: airPort });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/airPorts - Create new air port
router.post('/', async (req, res) => {
  try {
    const airPort = new AirPort(req.body);
    const savedAirPort = await airPort.save();
    
    res.status(201).json({
      success: true,
      message: 'Air Port created successfully',
      data: savedAirPort
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

// PUT /api/airPorts/:id - Update air port
router.put('/:id', async (req, res) => {
  try {
    const airPort = await AirPort.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!airPort) {
      return res.status(404).json({ message: 'Air Port not found' });
    }

    res.json({
      success: true,
      message: 'Air Port updated successfully',
      data: airPort
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

// DELETE /api/airPorts/:id - Delete air port
router.delete('/:id', async (req, res) => {
  try {
    const airPort = await AirPort.findByIdAndDelete(req.params.id);
    if (!airPort) {
      return res.status(404).json({ message: 'Air Port not found' });
    }
    res.json({
      success: true,
      message: 'Air Port deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
