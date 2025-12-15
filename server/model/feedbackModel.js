// models/feedbackModel.js
import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['bug', 'suggestion', 'improvement', 'feature-request', 'other'],
    required: true
  },
  module: {
    type: String,
  enum: [
  'general',
  'shipment',
  'container',
  'invoice',
  'product',
  'e-sanchit',
  'charges',
  'financial',
  'operation',
  'tracking-completed',
  'audit-trail'
],
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'closed', 'wont-fix'],
    default: 'pending'
  },
  attachments: [{
    type: String
  }],
  submittedBy: {
    type: String, // Store username directly
    required: true
  },
  submittedByEmail: {
    type: String
  },
  adminNotes: {
    type: String
  },
  resolvedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

feedbackSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('ExFeedback', feedbackSchema);
