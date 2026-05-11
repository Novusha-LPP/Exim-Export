import express from 'express';
import TerminalCode from "../../model/Directorties/TerminalCode.js";

const router = express.Router();

// GET /api/terminalCodes - Get all terminal codes with pagination and search
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      active = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'branches.city': { $regex: search, $options: 'i' } },
        { 'branches.gst': { $regex: search, $options: 'i' } },
        { 'branches.pan': { $regex: search, $options: 'i' } }
      ];
    }

    if (active) query.active = active;

    const total = await TerminalCode.countDocuments(query);
    const terminalCodes = await TerminalCode.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: terminalCodes,
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

// GET /api/terminalCodes/:id - Get terminal code by ID
router.get('/:id', async (req, res) => {
  try {
    const terminalCode = await TerminalCode.findById(req.params.id);
    if (!terminalCode) {
      return res.status(404).json({ message: 'Terminal Code not found' });
    }
    res.json({ success: true, data: terminalCode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/terminalCodes - Create new terminal code
router.post('/', async (req, res) => {
  try {
    const terminalCode = new TerminalCode(req.body);
    const savedTerminalCode = await terminalCode.save();
    
    res.status(201).json({
      success: true,
      message: 'Terminal Code created successfully',
      data: savedTerminalCode
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Terminal Code with this name already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/terminalCodes/:id - Update terminal code
router.put('/:id', async (req, res) => {
  try {
    const terminalCode = await TerminalCode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!terminalCode) {
      return res.status(404).json({ message: 'Terminal Code not found' });
    }

    res.json({
      success: true,
      message: 'Terminal Code updated successfully',
      data: terminalCode
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Terminal Code with this name already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/terminalCodes/:id - Delete terminal code
router.delete('/:id', async (req, res) => {
  try {
    const terminalCode = await TerminalCode.findByIdAndDelete(req.params.id);
    if (!terminalCode) {
      return res.status(404).json({ message: 'Terminal Code not found' });
    }
    res.json({
      success: true,
      message: 'Terminal Code deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
