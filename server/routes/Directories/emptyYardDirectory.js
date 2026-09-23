import express from 'express';
import axios from 'axios';
import EmptyYardDirectory from "../../model/Directorties/EmptyYardDirectory.js";

const router = express.Router();

const getImportApiUrl = () => {
  return process.env.IMPORT_API_URL || 
    (process.env.NODE_ENV === "production" ? "https://eximbot.alvision.in/import/api" : "http://localhost:9006/api");
};

// GET /api/emptyYardCodes - Get all Empty Yard directory entries with pagination and search
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      active = ''
    } = req.query;

    // Try fetching through Import API first
    try {
      const apiUrl = `${getImportApiUrl()}/empty-yard-codes`;
      const response = await axios.get(apiUrl, { params: req.query, timeout: 5000 });
      if (response.data?.success) {
        return res.json(response.data);
      }
    } catch (apiErr) {
      // Fallback to direct import DB query
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
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

    const total = await EmptyYardDirectory.countDocuments(query);
    const entries = await EmptyYardDirectory.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: entries,
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

// GET /get-empty-yard-directory-list - Fast dropdown list
router.get(['/get-empty-yard-directory-list', '/api/get-empty-yard-directory-list', '/get-empty-yard-codes', '/api/get-empty-yard-codes'], async (req, res) => {
  try {
    // Try fetching through Import API first
    try {
      const apiUrl = `${getImportApiUrl()}/get-empty-yard-directory-list`;
      const response = await axios.get(apiUrl, { timeout: 5000 });
      if (Array.isArray(response.data)) {
        return res.json(response.data);
      }
    } catch (apiErr) {
      // Fallback to direct import DB query
    }

    const items = await EmptyYardDirectory.find().sort({ name: 1 }).lean();
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

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const entry = await EmptyYardDirectory.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Empty Yard entry not found' });
    }
    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /
router.post('/', async (req, res) => {
  try {
    try {
      const apiUrl = `${getImportApiUrl()}/add-empty-yard-directory`;
      const response = await axios.post(apiUrl, req.body, { timeout: 5000 });
      if (response.data) return res.status(201).json(response.data);
    } catch (apiErr) {
      // Fallback
    }

    const entry = new EmptyYardDirectory(req.body);
    const saved = await entry.save();
    res.status(201).json({ success: true, message: 'Empty Yard created successfully', data: saved });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Empty Yard with this name already exists' });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /:id
router.put('/:id', async (req, res) => {
  try {
    try {
      const apiUrl = `${getImportApiUrl()}/update-empty-yard-directory/${req.params.id}`;
      const response = await axios.put(apiUrl, req.body, { timeout: 5000 });
      if (response.data) return res.json(response.data);
    } catch (apiErr) {
      // Fallback
    }

    const updated = await EmptyYardDirectory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Empty Yard entry not found' });
    res.json({ success: true, message: 'Empty Yard updated successfully', data: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Empty Yard with this name already exists' });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    try {
      const apiUrl = `${getImportApiUrl()}/delete-empty-yard-directory/${req.params.id}`;
      const response = await axios.delete(apiUrl, { timeout: 5000 });
      if (response.data) return res.json(response.data);
    } catch (apiErr) {
      // Fallback
    }

    const deleted = await EmptyYardDirectory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Empty Yard entry not found' });
    res.json({ success: true, message: 'Empty Yard deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
