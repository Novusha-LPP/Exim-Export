import express from 'express';
import {ExportHandover} from '../../model/export/exportHandover.js';
import { handleAutomatedExportHandover } from  '../../services/handoverService.js';

const router = express.Router();

// Create handover (manual or automated)
router.post('/', async (req, res) => {
  const handoverData = req.body;
  try {
    const handover = new ExportHandover(handoverData);
    await handover.save();

    if (handover.handoverType === 'AUTOMATED') {
      await handleAutomatedExportHandover(handover);
    } else {
      handover.status = 'COMPLETED';
      await handover.save();
    }
    res.status(201).json(handover);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all handover records
router.get('/', async (req, res) => {
  try {
    const handovers = await ExportHandover.find().sort({ createdAt: -1 });
    res.json(handovers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
