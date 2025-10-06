import express from 'express';
import ContactInfo from '../../model/Directorties/contactInfo.js';

const router = express.Router();

// GET /api/contactInfo - Get all contact information
router.get('/api/contactInfo/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      city = '',
      state = '',
      status = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search) {
      query.$or = [
        { contactPerson: { $regex: search, $options: 'i' } },
        { addressLine1: { $regex: search, $options: 'i' } },
        { addressLine2: { $regex: search, $options: 'i' } },
        { emailId: { $regex: search, $options: 'i' } }
      ];
    }

    if (city) query.city = { $regex: city, $options: 'i' };
    if (state) query.state = { $regex: state, $options: 'i' };
    if (status) query.status = status;

    const total = await ContactInfo.countDocuments(query);
    const contactInfos = await ContactInfo.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: contactInfos,
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

// GET /api/contactInfo/stats - Get statistics
router.get('/api/contactInfo/stats', async (req, res) => {
  try {
    const total = await ContactInfo.countDocuments();
    const active = await ContactInfo.countDocuments({ status: 'Active' });
    const inactive = await ContactInfo.countDocuments({ status: 'Inactive' });

    const stateStats = await ContactInfo.aggregate([
      { $group: { _id: '$state', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: { total, active, inactive },
        byState: stateStats
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/contactInfo/:id - Get contact information by ID
router.get('/api/contactInfo/:id', async (req, res) => {
  try {
    const contactInfo = await ContactInfo.findById(req.params.id);
    if (!contactInfo) {
      return res.status(404).json({ message: 'Contact information not found' });
    }
    res.json({ success: true, data: contactInfo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/contactInfo - Create new contact information
router.post('/api/contactInfo/', async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Convert empty strings to null for optional fields
    ['addressLine2', 'phoneNo', 'mobileNo', 'emailId', 'website'].forEach(field => {
      if (data[field] === '') data[field] = null;
    });

    const contactInfo = new ContactInfo(data);
    const savedContactInfo = await contactInfo.save();
    
    res.status(201).json({
      success: true,
      message: 'Contact information created successfully',
      data: savedContactInfo
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

// PUT /api/contactInfo/:id - Update contact information
router.put('/api/contactInfo/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Convert empty strings to null for optional fields
    ['addressLine2', 'phoneNo', 'mobileNo', 'emailId', 'website'].forEach(field => {
      if (data[field] === '') data[field] = null;
    });

    const contactInfo = await ContactInfo.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!contactInfo) {
      return res.status(404).json({ message: 'Contact information not found' });
    }

    res.json({
      success: true,
      message: 'Contact information updated successfully',
      data: contactInfo
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

// DELETE /api/contactInfo/:id - Delete contact information
router.delete('/api/contactInfo/:id', async (req, res) => {
  try {
    const contactInfo = await ContactInfo.findByIdAndDelete(req.params.id);
    if (!contactInfo) {
      return res.status(404).json({ message: 'Contact information not found' });
    }
    res.json({
      success: true,
      message: 'Contact information deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/contactInfo - Bulk delete contact information
router.delete('/api/contactInfo', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        message: 'Please provide an array of contact information IDs' 
      });
    }

    const result = await ContactInfo.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      message: `${result.deletedCount} contact information deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
