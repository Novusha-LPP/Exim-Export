// routes/jobBookingRoutes.js
import express from 'express';
import Job from '../../model/export/ExJobModel.mjs';

const router = express.Router();

// Add a vessel entry to a job
router.post('/api/job-booking/:jobNo/vessels', async (req, res) => {
  try {
    const { jobNo } = req.params;
    const vesselData = req.body;

    const job = await Job.findOne({ job_no: jobNo });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    job.vessel.push(vesselData);
    await job.save();

    res.status(201).json(job.vessel[job.vessel.length - 1]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List vessels for a given job
router.get('/api/job-booking/:jobNo/vessels', async (req, res) => {
  try {
    const { jobNo } = req.params;
    const job = await Job.findOne({ job_no: jobNo });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    res.json(job.vessel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a booking entry to a job
router.post('/api/job-booking/:jobNo/bookings', async (req, res) => {
  try {
    const { jobNo } = req.params;
    const bookingData = req.body;

    const job = await Job.findOne({ job_no: jobNo });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Accept vessel subdocument directly, no lookup needed
    // bookingData.vessel should be object with vessel fields
    
    job.booking.push(bookingData);
    await job.save();

    res.status(201).json(job.booking[job.booking.length - 1]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});



// List bookings for a job
router.get("/api/job-booking/:jobNo", async (req, res) => {
  try {
    const { jobNo } = req.params;
    const job = await Job.findOne({ job_no: jobNo });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    res.json(job);   // Not res.json(job.booking)
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Add a booking confirmation to a specific booking in a job
router.post('/api/job-booking/:jobNo/bookings/:bookingIndex/confirmation', async (req, res) => {
  try {
    const { jobNo, bookingIndex } = req.params;
    const confirmationData = req.body;

    const job = await Job.findOne({ job_no: jobNo });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (!job.booking[bookingIndex])
      return res.status(404).json({ error: 'Booking not found at specified index' });

    job.booking[bookingIndex].status = 'Confirmed';

    job.bookingConfirmation.push({
      booking: job.booking[bookingIndex]._id || null,
      ...confirmationData,
    });

    await job.save();

    res.status(201).json(job.bookingConfirmation[job.bookingConfirmation.length - 1]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List booking confirmations for a job
router.get('/api/job-booking/:jobNo/confirmations', async (req, res) => {
  try {
    const { jobNo } = req.params;
    const job = await Job.findOne({ job_no: jobNo });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    res.json(job.bookingConfirmation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a vessel in a job by index
router.put('/api/job-booking/:jobNo/vessels/:vesselIndex', async (req, res) => {
  try {
    const { jobNo, vesselIndex } = req.params;
    const updatedData = req.body;

    const job = await Job.findOne({ job_no: jobNo });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.vessel[vesselIndex]) return res.status(404).json({ error: 'Vessel not found' });

    job.vessel[vesselIndex] = { ...job.vessel[vesselIndex].toObject(), ...updatedData };
    await job.save();

    res.json(job.vessel[vesselIndex]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a vessel from a job by index
router.delete('/api/job-booking/:jobNo/vessels/:vesselIndex', async (req, res) => {
  try {
    const { jobNo, vesselIndex } = req.params;

    const job = await Job.findOne({ job_no: jobNo });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.vessel[vesselIndex]) return res.status(404).json({ error: 'Vessel not found' });

    job.vessel.splice(vesselIndex, 1);
    await job.save();

    res.json({ message: 'Vessel deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a booking in a job by index
router.put('/api/job-booking/:jobNo/bookings/:bookingIndex', async (req, res) => {
  try {
    const { jobNo, bookingIndex } = req.params;
    const updatedData = req.body;

    const job = await Job.findOne({ job_no: jobNo });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.booking[bookingIndex]) return res.status(404).json({ error: 'Booking not found' });

    // Update booking subdocument including embedded vessel
    job.booking[bookingIndex] = { ...job.booking[bookingIndex].toObject(), ...updatedData };
    await job.save();

    res.json(job.booking[bookingIndex]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// Delete a booking from a job by index
router.delete('/api/job-booking/:jobNo/bookings/:bookingIndex', async (req, res) => {
  try {
    const { jobNo, bookingIndex } = req.params;

    const job = await Job.findOne({ job_no: jobNo });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.booking[bookingIndex]) return res.status(404).json({ error: 'Booking not found' });

    job.booking.splice(bookingIndex, 1);
    await job.save();

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a booking confirmation by index
router.delete('/api/job-booking/:jobNo/confirmations/:confirmationIndex', async (req, res) => {
  try {
    const { jobNo, confirmationIndex } = req.params;

    const job = await Job.findOne({ job_no: jobNo });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.bookingConfirmation[confirmationIndex])
      return res.status(404).json({ error: 'Confirmation not found' });

    job.bookingConfirmation.splice(confirmationIndex, 1);
    await job.save();

    res.json({ message: 'Booking confirmation deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
