import mongoose from 'mongoose';

const SchemeSchema = new mongoose.Schema({
  schemeCode: {
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
      message: 'Scheme Code must be 1-10 uppercase alphanumeric characters'
    }
  },
  schemeDescription: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  }
}, { timestamps: true });

// Indexes for better query performance
SchemeSchema.index({ schemeCode: 1 }, { unique: true });
SchemeSchema.index({ schemeDescription: 'text', schemeCode: 'text' });

export default mongoose.model('Scheme', SchemeSchema);
