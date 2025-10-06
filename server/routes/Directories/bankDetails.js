import express from 'express';
import BankDetails from '../../model/Directorties/BankDetails.js';

const router = express.Router();

// GET /api/bankDetails - Get all bank details
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      bankName = '',
      status = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { bankName: { $regex: search, $options: 'i' } },
        { branch: { $regex: search, $options: 'i' } },
        { ifscCode: { $regex: search, $options: 'i' } },
        { swiftCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (bankName) query.bankName = { $regex: bankName, $options: 'i' };
    if (status) query.status = status;

    const total = await BankDetails.countDocuments(query);
    const bankDetails = await BankDetails.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: bankDetails,
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

// GET /api/bankDetails/stats - Get statistics
router.get('/stats', async (req, res) => {
  try {
    const total = await BankDetails.countDocuments();
    const active = await BankDetails.countDocuments({ status: 'Active' });
    const inactive = await BankDetails.countDocuments({ status: 'Inactive' });
    const closed = await BankDetails.countDocuments({ status: 'Closed' });

    const bankStats = await BankDetails.aggregate([
      { $group: { _id: '$bankName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: { total, active, inactive, closed },
        byBank: bankStats
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/bankDetails/:id - Get bank details by ID
router.get('/:id', async (req, res) => {
  try {
    const bankDetails = await BankDetails.findById(req.params.id);
    if (!bankDetails) {
      return res.status(404).json({ message: 'Bank details not found' });
    }
    res.json({ success: true, data: bankDetails });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/bankDetails - Create new bank details
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Convert empty strings to null for optional fields
    ['swiftCode'].forEach(field => {
      if (data[field] === '') data[field] = null;
    });

    const bankDetails = new BankDetails(data);
    const savedBankDetails = await bankDetails.save();
    
    res.status(201).json({
      success: true,
      message: 'Bank details created successfully',
      data: savedBankDetails
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

// PUT /api/bankDetails/:id - Update bank details
router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Convert empty strings to null for optional fields
    ['swiftCode'].forEach(field => {
      if (data[field] === '') data[field] = null;
    });

    const bankDetails = await BankDetails.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!bankDetails) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    res.json({
      success: true,
      message: 'Bank details updated successfully',
      data: bankDetails
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

// DELETE /api/bankDetails/:id - Delete bank details
router.delete('/:id', async (req, res) => {
  try {
    const bankDetails = await BankDetails.findByIdAndDelete(req.params.id);
    if (!bankDetails) {
      return res.status(404).json({ message: 'Bank details not found' });
    }
    res.json({
      success: true,
      message: 'Bank details deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/bankDetails - Bulk delete bank details
router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        message: 'Please provide an array of bank details IDs' 
      });
    }

    const result = await BankDetails.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      message: `${result.deletedCount} bank details deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
