import express from 'express';
import Package from '../../model/Directorties/Package.js';

const router = express.Router();

// GET /api/packagess - Get all packagess
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
        { packagesCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Package.countDocuments(query);
    const packagess = await Package.find(query)
      .sort({ packagesCode: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: packagess,
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

// GET /api/packagess/:id - Get packages by ID
router.get('/:id', async (req, res) => {
  try {
    const packages = await Package.findById(req.params.id);
    if (!packages) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.json({ success: true, data: packages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/packagess - Create new packages
router.post('/', async (req, res) => {
  try {
    const packages = new Package(req.body);
    const savedPackage = await packages.save();
    
    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data: savedPackage
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Package Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/packagess/:id - Update packages
router.put('/:id', async (req, res) => {
  try {
    const packages = await Package.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!packages) {
      return res.status(404).json({ message: 'Package not found' });
    }

    res.json({
      success: true,
      message: 'Package updated successfully',
      data: packages
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Package Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/packagess/:id - Delete packages
router.delete('/:id', async (req, res) => {
  try {
    const packages = await Package.findByIdAndDelete(req.params.id);
    if (!packages) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
