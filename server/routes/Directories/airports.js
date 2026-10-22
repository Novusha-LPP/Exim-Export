import express from 'express';
import AirPort from '../../model/Directorties/AirPort.js';
import SeaPort from '../../model/Directorties/SeaPort.js';

const router = express.Router();

// GET /api/airPorts - Get all air ports
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = req.query.search ? 50 : 10,
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
        { uneceCode: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } }
      ];
    }

    if (country) {
      query.country = { $regex: `^${country}$`, $options: 'i' };
    }

    const total = await AirPort.countDocuments(query);
    let airPorts = await AirPort.find(query)
      .sort({ portCode: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // If a search was performed, also supplement from SeaPort if not already present
    if (search && airPorts.length < limitNum) {
      const existingCodes = new Set(
        airPorts.map((p) => (p.portCode || '').toUpperCase().trim())
      );
      const seaPorts = await SeaPort.find(query)
        .limit(limitNum - airPorts.length)
        .lean();
      for (const sp of seaPorts) {
        const code = (sp.portCode || '').toUpperCase().trim();
        if (code && !existingCodes.has(code)) {
          existingCodes.add(code);
          airPorts.push(sp);
        }
      }
    }

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
    const payload = { ...req.body };
    if (payload.portCode) payload.portCode = payload.portCode.toUpperCase().trim();
    if (payload.uneceCode) payload.uneceCode = payload.uneceCode.toUpperCase().trim();
    if (payload.country) payload.country = payload.country.toUpperCase().trim();
    if (payload.portName) payload.portName = payload.portName.trim();

    const airPort = new AirPort(payload);
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
    const payload = { ...req.body };
    if (payload.portCode) payload.portCode = payload.portCode.toUpperCase().trim();
    if (payload.uneceCode) payload.uneceCode = payload.uneceCode.toUpperCase().trim();
    if (payload.country) payload.country = payload.country.toUpperCase().trim();
    if (payload.portName) payload.portName = payload.portName.trim();

    const airPort = await AirPort.findByIdAndUpdate(
      req.params.id,
      payload,
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
