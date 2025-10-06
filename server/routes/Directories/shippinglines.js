import express from 'express';
import ShippingLine from "../../model/Directorties/ShippingLine.js";

const router = express.Router();

// GET /api/shippingLines - Get all shipping lines
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      location = '',
      status = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { shippingLineCode: { $regex: search, $options: 'i' } },
        { shippingName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    if (location) query.location = { $regex: location, $options: 'i' };
    if (status) query.status = status;

    const total = await ShippingLine.countDocuments(query);
    const shippingLines = await ShippingLine.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: shippingLines,
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

// GET /api/shippingLines/:id - Get shipping line by ID
router.get('/:id', async (req, res) => {
  try {
    const shippingLine = await ShippingLine.findById(req.params.id);
    if (!shippingLine) {
      return res.status(404).json({ message: 'Shipping Line not found' });
    }
    res.json({ success: true, data: shippingLine });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/shippingLines - Create new shipping line
router.post('/', async (req, res) => {
  try {
    const shippingLine = new ShippingLine(req.body);
    const savedShippingLine = await shippingLine.save();
    
    res.status(201).json({
      success: true,
      message: 'Shipping Line created successfully',
      data: savedShippingLine
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Shipping Line Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/shippingLines/:id - Update shipping line
router.put('/:id', async (req, res) => {
  try {
    const shippingLine = await ShippingLine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!shippingLine) {
      return res.status(404).json({ message: 'Shipping Line not found' });
    }

    res.json({
      success: true,
      message: 'Shipping Line updated successfully',
      data: shippingLine
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Shipping Line Code already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/shippingLines/:id - Delete shipping line
router.delete('/:id', async (req, res) => {
  try {
    const shippingLine = await ShippingLine.findByIdAndDelete(req.params.id);
    if (!shippingLine) {
      return res.status(404).json({ message: 'Shipping Line not found' });
    }
    res.json({
      success: true,
      message: 'Shipping Line deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
