import express from 'express';
import State from "../../model/Directorties/State.js";

const router = express.Router();

// Get all states
router.get('/', async (req, res) => {
  try {
    const states = await State.find();
    res.json(states);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific state
router.get('/:id', async (req, res) => {
  try {
    const state = await State.findById(req.params.id);
    if (!state) return res.status(404).json({ message: 'Not found' });
    res.json(state);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const newState = await State.create(req.body);
    res.status(201).json(newState);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const updated = await State.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await State.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
