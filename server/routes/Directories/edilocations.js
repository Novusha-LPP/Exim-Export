import express from 'express';
import EDILocation from '../../model/Directorties/EDILocation.js';

const router = express.Router();

// GET /api/ediLocations - Get all EDI locations
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { locationCode: { $regex: search, $options: 'i' } },
        { locationName: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) query.category = category;

    const total = await EDILocation.countDocuments(query);
    const ediLocations = await EDILocation.find(query)
      .sort({ locationCode: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: ediLocations,
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

// GET /api/ediLocations/stats - Get statistics
router.get('/stats', async (req, res) => {
  try {
    const total = await EDILocation.countDocuments();
    const categoryStats = await EDILocation.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent additions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = await EDILocation.countDocuments({
      ediOnlineDate: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      data: {
        total,
        recentAdditions: recentCount,
        byCategory: categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/ediLocations/:id - Get EDI location by ID
router.get('/:id', async (req, res) => {
  try {
    const ediLocation = await EDILocation.findById(req.params.id);
    if (!ediLocation) {
      return res.status(404).json({ message: 'EDI Location not found' });
    }
    res.json({ success: true, data: ediLocation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/ediLocations - Create new EDI location
router.post('/', async (req, res) => {
  try {
    const ediLocation = new EDILocation(req.body);
    const savedEDILocation = await ediLocation.save();
    
    res.status(201).json({
      success: true,
      message: 'EDI Location created successfully',
      data: savedEDILocation
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Location Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/ediLocations/:id - Update EDI location
router.put('/:id', async (req, res) => {
  try {
    const ediLocation = await EDILocation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!ediLocation) {
      return res.status(404).json({ message: 'EDI Location not found' });
    }

    res.json({
      success: true,
      message: 'EDI Location updated successfully',
      data: ediLocation
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Location Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/ediLocations/:id - Delete EDI location
router.delete('/:id', async (req, res) => {
  try {
    const ediLocation = await EDILocation.findByIdAndDelete(req.params.id);
    if (!ediLocation) {
      return res.status(404).json({ message: 'EDI Location not found' });
    }
    res.json({
      success: true,
      message: 'EDI Location deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
