import express from 'express';
import Currency from  '../../model/Directorties/Currency.js';
const router = express.Router();

// GET /api/currencies - Get all currencies
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      countryCode = '',
      standardCurrency = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { currencyCode: { $regex: search, $options: 'i' } },
        { currencyDescription: { $regex: search, $options: 'i' } }
      ];
    }

    if (countryCode) query.countryCode = { $regex: countryCode, $options: 'i' };
    if (standardCurrency !== '') query.standardCurrency = standardCurrency === 'true';

    const total = await Currency.countDocuments(query);
    const currencies = await Currency.find(query)
      .sort({ currencyCode: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: currencies,
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

// GET /api/currencies/:id - Get currency by ID
router.get('/:id', async (req, res) => {
  try {
    const currency = await Currency.findById(req.params.id);
    if (!currency) {
      return res.status(404).json({ message: 'Currency not found' });
    }
    res.json({ success: true, data: currency });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/currencies - Create new currency
router.post('/', async (req, res) => {
  try {
    const currency = new Currency(req.body);
    const savedCurrency = await currency.save();
    
    res.status(201).json({
      success: true,
      message: 'Currency created successfully',
      data: savedCurrency
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Currency Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/currencies/:id - Update currency
router.put('/:id', async (req, res) => {
  try {
    const currency = await Currency.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!currency) {
      return res.status(404).json({ message: 'Currency not found' });
    }

    res.json({
      success: true,
      message: 'Currency updated successfully',
      data: currency
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Currency Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/currencies/:id - Delete currency
router.delete('/:id', async (req, res) => {
  try {
    const currency = await Currency.findByIdAndDelete(req.params.id);
    if (!currency) {
      return res.status(404).json({ message: 'Currency not found' });
    }
    res.json({
      success: true,
      message: 'Currency deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
