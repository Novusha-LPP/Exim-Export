import express from 'express';
import GenInfo from '../../model/Directorties/GenInfo.mjs';

const router = express.Router();

// GET /api/genInfo - Get all genInfo
router.get('/api/genInfo', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = '',
      status = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { GenInfoName: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) query.type = type;
    if (status) query.status = status;

    const total = await GenInfo.countDocuments(query);
    const genInfo = await GenInfo.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: genInfo,
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

// GET /api/genInfo/stats - Get statistics
router.get('/api/genInfo/stats', async (req, res) => {
  try {
    const total = await GenInfo.countDocuments();
    const active = await GenInfo.countDocuments({ status: 'Active' });
    const inactive = await GenInfo.countDocuments({ status: 'Inactive' });

    const typeStats = await GenInfo.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: { total, active, inactive },
        byType: typeStats
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/genInfo/:id - Get GenInfo by ID
router.get('/api/genInfo/:id', async (req, res) => {
  try {
    const GenInfo = await GenInfo.findById(req.params.id);
    if (!GenInfo) {
      return res.status(404).json({ message: 'GenInfo not found' });
    }
    res.json({ success: true, data: GenInfo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/genInfo - Create new GenInfo
router.post('/api/genInfo', async (req, res) => {
  try {
    // Convert empty strings to null for unique fields
    const data = { ...req.body };
    ['panNo', 'gstin'].forEach(field => {
      if (data[field] === '') data[field] = null;
    });

    const genInfo = new GenInfo(data);
    const savedGenInfo = await genInfo.save();
    
    res.status(201).json({
      success: true,
      message: 'GenInfo created successfully',
      data: savedGenInfo
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ 
        message: `${field.toUpperCase()} already exists` 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/genInfo/:id - Update GenInfo
router.put('/api/genInfo/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    ['panNo', 'gstin'].forEach(field => {
      if (data[field] === '') data[field] = null;
    });

    const genInfo = await GenInfo.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!genInfo) {
      return res.status(404).json({ message: 'GenInfo not found' });
    }

    res.json({
      success: true,
      message: 'GenInfo updated successfully',
      data: genInfo
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ 
        message: `${field.toUpperCase()} already exists` 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/genInfo/:id - Delete GenInfo
router.delete('/api/genInfo/:id', async (req, res) => {
  try {
    const genInfo = await GenInfo.findByIdAndDelete(req.params.id);
    if (!genInfo) {
      return res.status(404).json({ message: 'GenInfo not found' });
    }
    res.json({
      success: true,
      message: 'GenInfo deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/genInfo - Bulk delete genInfo
router.delete('/api/genInfo', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        message: 'Please provide an array of GenInfo IDs' 
      });
    }

    const result = await GenInfo.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      message: `${result.deletedCount} genInfo deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
