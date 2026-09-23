import express from 'express';
import CfsDirectory from "../../model/Directorties/CfsDirectory.js";

const router = express.Router();

// GET /api/cfsCodes - Get all CFS directory entries with pagination and search
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

    const total = await CfsDirectory.countDocuments(query);
    const cfsEntries = await CfsDirectory.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: cfsEntries,
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

// GET /get-cfs-directory-list - Fast dropdown list of CFS entries
router.get(['/get-cfs-directory-list', '/api/get-cfs-directory-list'], async (req, res) => {
  try {
    const items = await CfsDirectory.find().sort({ name: 1 }).lean();
    const mapped = items.map((i) => ({
      _id: i._id,
      name: i.name,
      city: i.branches?.[0]?.city || '',
      branches: i.branches || [],
      pan: i.branches?.[0]?.pan || '',
      tds_percent: i.tds_percent || 0,
      openingBalance: i.openingBalance || 0
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json([]);
  }
});

// GET /api/cfsCodes/:id - Get CFS entry by ID
router.get('/:id', async (req, res) => {
  try {
    const cfsEntry = await CfsDirectory.findById(req.params.id);
    if (!cfsEntry) {
      return res.status(404).json({ message: 'CFS entry not found' });
    }
    res.json({ success: true, data: cfsEntry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/cfsCodes - Create new CFS entry
router.post('/', async (req, res) => {
  try {
    const cfsEntry = new CfsDirectory(req.body);
    const saved = await cfsEntry.save();
    
    res.status(201).json({
      success: true,
      message: 'CFS created successfully',
      data: saved
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'CFS with this name already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/cfsCodes/:id - Update CFS entry
router.put('/:id', async (req, res) => {
  try {
    const updated = await CfsDirectory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'CFS entry not found' });
    }

    res.json({
      success: true,
      message: 'CFS updated successfully',
      data: updated
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'CFS with this name already exists' 
      });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/cfsCodes/:id - Delete CFS entry
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CfsDirectory.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'CFS entry not found' });
    }
    res.json({
      success: true,
      message: 'CFS deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
