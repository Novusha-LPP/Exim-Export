import mongoose from 'mongoose';

const UQCSchema = new mongoose.Schema({
  uqc: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 10,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9]{1,10}$/.test(v);
      },
      message: 'UQC must be 1-10 uppercase alphanumeric characters'
    }
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  }
}, { timestamps: true });

// Indexes for better query performance
UQCSchema.index({ uqc: 1 }, { unique: true });
UQCSchema.index({ type: 1 });
UQCSchema.index({ description: 'text', uqc: 'text' });

export default mongoose.model('UQC', UQCSchema);
