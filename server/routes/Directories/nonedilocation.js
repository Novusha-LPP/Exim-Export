import express from 'express';
import NonEDILocation from "../../model/Directorties/NonEDILocation.js";

const router = express.Router();

// GET /api/nonEdiLocations - Get all non-EDI locations
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

    if (category) query.category = { $regex: category, $options: 'i' };

    const total = await NonEDILocation.countDocuments(query);
    const nonEdiLocations = await NonEDILocation.find(query)
      .sort({ locationCode: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: nonEdiLocations,
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

// GET /api/nonEdiLocations/:id - Get non-EDI location by ID
router.get('/:id', async (req, res) => {
  try {
    const nonEdiLocation = await NonEDILocation.findById(req.params.id);
    if (!nonEdiLocation) {
      return res.status(404).json({ message: 'Non-EDI Location not found' });
    }
    res.json({ success: true, data: nonEdiLocation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/nonEdiLocations - Create new non-EDI location
router.post('/', async (req, res) => {
  try {
    const nonEdiLocation = new NonEDILocation(req.body);
    const savedNonEdiLocation = await nonEdiLocation.save();
    
    res.status(201).json({
      success: true,
      message: 'Non-EDI Location created successfully',
      data: savedNonEdiLocation
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

// PUT /api/nonEdiLocations/:id - Update non-EDI location
router.put('/:id', async (req, res) => {
  try {
    const nonEdiLocation = await NonEDILocation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!nonEdiLocation) {
      return res.status(404).json({ message: 'Non-EDI Location not found' });
    }

    res.json({
      success: true,
      message: 'Non-EDI Location updated successfully',
      data: nonEdiLocation
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

// DELETE /api/nonEdiLocations/:id - Delete non-EDI location
router.delete('/:id', async (req, res) => {
  try {
    const nonEdiLocation = await NonEDILocation.findByIdAndDelete(req.params.id);
    if (!nonEdiLocation) {
      return res.status(404).json({ message: 'Non-EDI Location not found' });
    }
    res.json({
      success: true,
      message: 'Non-EDI Location deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
