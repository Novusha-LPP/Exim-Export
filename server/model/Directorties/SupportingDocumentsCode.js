import mongoose from 'mongoose';

const SupportingDocumentCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 20,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9_-]{1,20}$/.test(v);
      },
      message: 'Code must be 1-20 uppercase alphanumeric characters, hyphens, or underscores'
    }
  },
  name: {
    type: String,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, { timestamps: true });

// Indexes for search
SupportingDocumentCodeSchema.index({ code: 1 }, { unique: true });
SupportingDocumentCodeSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('SupportingDocumentCode', SupportingDocumentCodeSchema);
