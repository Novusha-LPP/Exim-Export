import express from 'express';
import Country from  '../../model/Directorties/Country.js';

const router = express.Router();

// GET /api/countries - Get all countries
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { countryName: { $regex: search, $options: 'i' } },
        { countryCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;

    const total = await Country.countDocuments(query);
    const countries = await Country.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: countries,
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

// GET /api/countries/:id - Get country by ID
router.get('/:id', async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.json({ success: true, data: country });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/countries - Create new country
router.post('/', async (req, res) => {
  try {
    const country = new Country(req.body);
    const savedCountry = await country.save();
    
    res.status(201).json({
      success: true,
      message: 'Country created successfully',
      data: savedCountry
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

// PUT /api/countries/:id - Update country
router.put('/:id', async (req, res) => {
  try {
    const country = await Country.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }

    res.json({
      success: true,
      message: 'Country updated successfully',
      data: country
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

// DELETE /api/countries/:id - Delete country
router.delete('/:id', async (req, res) => {
  try {
    const country = await Country.findByIdAndDelete(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.json({
      success: true,
      message: 'Country deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
