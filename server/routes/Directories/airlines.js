import express from 'express';
import AirlineCode from "../../model/Directorties/AirlineCode.js"

const router = express.Router();

// Get all airline codes
router.get('/', async (req, res) => {
  try {
    const airlines = await AirlineCode.find();
    res.json(airlines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single airline code
router.get('/:id', async (req, res) => {
  try {
    const airline = await AirlineCode.findById(req.params.id);
    if (!airline) return res.status(404).json({ message: 'Not found' });
    res.json(airline);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new airline code
router.post('/', async (req, res) => {
  try {
    const newAirline = new AirlineCode(req.body);
    const saved = await newAirline.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update airline code
router.put('/:id', async (req, res) => {
  try {
    const updated = await AirlineCode.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete airline code
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await AirlineCode.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
