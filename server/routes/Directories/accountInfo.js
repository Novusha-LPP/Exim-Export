import express from 'express';
import AccountInfo from '../../model/Directorties/accountInfo.js';

const router = express.Router();

// GET /api/accountInfo - Get all account information
router.get('/api/accountInfo/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      accountGroup = '',
      currency = '',
      status = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { ledgerCode: { $regex: search, $options: 'i' } },
        { accountManager: { $regex: search, $options: 'i' } },
        { accountGroup: { $regex: search, $options: 'i' } }
      ];
    }

    if (accountGroup) query.accountGroup = accountGroup;
    if (currency) query.currency = currency;
    if (status) query.status = status;

    const total = await AccountInfo.countDocuments(query);
    const accountInfos = await AccountInfo.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: accountInfos,
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

// GET /api/accountInfo/stats - Get statistics
router.get('/api/accountInfo/stats', async (req, res) => {
  try {
    const total = await AccountInfo.countDocuments();
    const active = await AccountInfo.countDocuments({ status: 'Active' });
    const inactive = await AccountInfo.countDocuments({ status: 'Inactive' });
    const suspended = await AccountInfo.countDocuments({ status: 'Suspended' });

    const groupStats = await AccountInfo.aggregate([
      { $group: { _id: '$accountGroup', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const currencyStats = await AccountInfo.aggregate([
      { $group: { _id: '$currency', count: { $sum: 1 }, totalCredit: { $sum: '$creditLimit' } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: { total, active, inactive, suspended },
        byGroup: groupStats,
        byCurrency: currencyStats
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/accountInfo/:id - Get account information by ID
router.get('/api/accountInfo/:id', async (req, res) => {
  try {
    const accountInfo = await AccountInfo.findById(req.params.id);
    if (!accountInfo) {
      return res.status(404).json({ message: 'Account information not found' });
    }
    res.json({ success: true, data: accountInfo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/accountInfo - Create new account information
router.post('/api/accountInfo/', async (req, res) => {
  try {
    const accountInfo = new AccountInfo(req.body);
    const savedAccountInfo = await accountInfo.save();
    
    res.status(201).json({
      success: true,
      message: 'Account information created successfully',
      data: savedAccountInfo
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

// PUT /api/accountInfo/:id - Update account information
router.put('/api/accountInfo/:id', async (req, res) => {
  try {
    const accountInfo = await AccountInfo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!accountInfo) {
      return res.status(404).json({ message: 'Account information not found' });
    }

    res.json({
      success: true,
      message: 'Account information updated successfully',
      data: accountInfo
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

// DELETE /api/accountInfo/:id - Delete account information
router.delete('/api/accountInfo/:id', async (req, res) => {
  try {
    const accountInfo = await AccountInfo.findByIdAndDelete(req.params.id);
    if (!accountInfo) {
      return res.status(404).json({ message: 'Account information not found' });
    }
    res.json({
      success: true,
      message: 'Account information deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/accountInfo - Bulk delete account information
router.delete('/api/accountInfo', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        message: 'Please provide an array of account information IDs' 
      });
    }

    const result = await AccountInfo.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      message: `${result.deletedCount} account information deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
