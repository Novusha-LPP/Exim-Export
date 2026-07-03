import express from 'express';
import Drawback from '../../model/export/DrawbackModel.js';

const router = express.Router();

// GET /api/drawbacks - Get all drawbacks (paginated & searchable)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      chapter = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { tariff_item: { $regex: escapedSearch, $options: 'i' } },
        { description_of_goods: { $regex: escapedSearch, $options: 'i' } },
        { chapter: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    if (chapter) {
      query.chapter = { $regex: String(chapter).trim(), $options: 'i' };
    }

    const total = await Drawback.countDocuments(query);
    const drawbacks = await Drawback.find(query)
      .sort({ tariff_item: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      data: drawbacks,
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

// GET /api/drawbacks/:id - Get drawback by ID
router.get('/:id', async (req, res) => {
  try {
    const drawback = await Drawback.findById(req.params.id);
    if (!drawback) {
      return res.status(404).json({ message: 'Drawback entry not found' });
    }
    res.json({ success: true, data: drawback });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/drawbacks - Create new drawback
router.post('/', async (req, res) => {
  try {
    const drawback = new Drawback(req.body);
    const savedDrawback = await drawback.save();

    res.status(201).json({
      success: true,
      message: 'Drawback entry created successfully',
      data: savedDrawback
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Drawback Tariff Item already exists'
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/drawbacks/:id - Update drawback
router.put('/:id', async (req, res) => {
  try {
    const drawback = await Drawback.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!drawback) {
      return res.status(404).json({ message: 'Drawback entry not found' });
    }

    res.json({
      success: true,
      message: 'Drawback entry updated successfully',
      data: drawback
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Drawback Tariff Item already exists'
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/drawbacks/:id - Delete drawback
router.delete('/:id', async (req, res) => {
  try {
    const drawback = await Drawback.findByIdAndDelete(req.params.id);
    if (!drawback) {
      return res.status(404).json({ message: 'Drawback entry not found' });
    }
    res.json({
      success: true,
      message: 'Drawback entry deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
