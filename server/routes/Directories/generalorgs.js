import express from 'express';
import GeneralOrg from "../../model/Directorties/GeneralOrg.js";

const router = express.Router();

// GET /get-general-orgs - Get all general orgs with pagination and search
router.get('/get-general-orgs', async (req, res) => {
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

    const total = await GeneralOrg.countDocuments(query);
    const generalOrgs = await GeneralOrg.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: generalOrgs,
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

// POST /add-general-org
router.post('/add-general-org', async (req, res) => {
  try {
    const generalOrg = new GeneralOrg(req.body);
    const savedOrg = await generalOrg.save();
    res.status(201).json(savedOrg);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'General Org with this name already exists' });
    }
    res.status(400).json({ message: error.message });
  }
});

// PUT /update-general-org/:id
router.put('/update-general-org/:id', async (req, res) => {
  try {
    const generalOrg = await GeneralOrg.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!generalOrg) {
      return res.status(404).json({ message: 'General Org not found' });
    }
    res.json(generalOrg);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'General Org with this name already exists' });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE /delete-general-org/:id
router.delete('/delete-general-org/:id', async (req, res) => {
  try {
    const generalOrg = await GeneralOrg.findByIdAndDelete(req.params.id);
    if (!generalOrg) {
      return res.status(404).json({ message: 'General Org not found' });
    }
    res.json({ message: 'General Org deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /delete-general-org/:id/branch/:branchId
router.delete('/delete-general-org/:id/branch/:branchId', async (req, res) => {
  try {
    const generalOrg = await GeneralOrg.findById(req.params.id);
    if (!generalOrg) {
      return res.status(404).json({ message: 'General Org not found' });
    }
    generalOrg.branches = generalOrg.branches.filter(b => String(b._id) !== req.params.branchId);
    await generalOrg.save();
    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /delete-general-org/:id/branch/:branchId/account/:accountId
router.delete('/delete-general-org/:id/branch/:branchId/account/:accountId', async (req, res) => {
  try {
    const generalOrg = await GeneralOrg.findById(req.params.id);
    if (!generalOrg) {
      return res.status(404).json({ message: 'General Org not found' });
    }
    const branch = generalOrg.branches.find(b => String(b._id) === req.params.branchId);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    branch.accounts = branch.accounts.filter(a => String(a._id) !== req.params.accountId);
    await generalOrg.save();
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
