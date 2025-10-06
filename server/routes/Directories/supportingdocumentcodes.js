import express from 'express';
import SupportingDocumentCode from '../../model/Directorties/SupportingDocumentsCode.js';

const router = express.Router();

// GET all
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = search
      ? { $or: [
          { code: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]}
      : {};

    const total = await SupportingDocumentCode.countDocuments(query);
    const docs = await SupportingDocumentCode.find(query)
      .sort({ code: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: docs,
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

// GET one
router.get('/:id', async (req, res) => {
  try {
    const doc = await SupportingDocumentCode.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const doc = new SupportingDocumentCode(req.body);
    const saved = await doc.save();
    res.status(201).json({
      success: true,
      message: 'Created successfully',
      data: saved
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Code already exists' });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const doc = await SupportingDocumentCode.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({
      success: true,
      message: 'Updated successfully',
      data: doc
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Code already exists' });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const doc = await SupportingDocumentCode.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
