// routes/feedbackRoutes.js
import express from 'express';
import Feedback from '../model/feedbackModel.js';

const router = express.Router();

// Get all feedback (admin only - handled on frontend)
router.get('/feedback', async (req, res) => {
  try {
    const { status, type, module } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (module) filter.module = module;

    const feedback = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single feedback by ID
router.get('/feedback/:id', async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }
    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get feedback by username (user can see their own submissions)
router.get('/feedback/user/:username', async (req, res) => {
  try {
    const feedback = await Feedback.find({ submittedBy: req.params.username })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit new feedback
router.post('/feedback', async (req, res) => {
  try {
    const { type, module, title, description, priority, submittedBy, submittedByEmail, attachments } = req.body;

    // Validate required fields
    if (!type || !module || !title || !description || !submittedBy) {
      return res.status(400).json({ 
        success: false, 
        error: 'Type, module, title, description, and submittedBy are required' 
      });
    }

    const newFeedback = new Feedback({
      type,
      module,
      title,
      description,
      priority: priority || 'medium',
      submittedBy,
      submittedByEmail: submittedByEmail || '',
      attachments: attachments || [],
      status: 'pending'
    });

    await newFeedback.save();
    res.status(201).json({ success: true, data: newFeedback });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update feedback (admin only - change status, add notes)
router.put('/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If status is being changed to resolved, set resolvedAt
    if (updateData.status === 'resolved' && !updateData.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }

    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete feedback (admin only)
router.delete('/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findByIdAndDelete(id);

    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }

    res.json({ success: true, message: 'Feedback deleted' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get feedback statistics (admin only)
router.get('/feedback/stats/summary', async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const moduleStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$module',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({ 
      success: true, 
      data: {
        byStatus: stats,
        byType: typeStats,
        byModule: moduleStats
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
