import mongoose from 'mongoose';

const EDILocationSchema = new mongoose.Schema({
  locationCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 10,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9]{2,10}$/.test(v);
      },
      message: 'Location Code must be 2-10 uppercase alphanumeric characters'
    }
  },
  category: {
    type: String,
    trim: true,
    maxlength: 100  // Allow custom categories up to 100 characters
  },
  locationName: {
    type: String,
    trim: true,
    maxlength: 200
  },
  ediOnlineDate: {
    type: Date,
    validate: {
      validator: function(v) {
        return v instanceof Date && !isNaN(v);
      },
      message: 'EDI Online Date must be a valid date'
    }
  }
}, { timestamps: true });

// Indexes for better query performance
EDILocationSchema.index({ locationCode: 1 }, { unique: true });
EDILocationSchema.index({ category: 1 });
EDILocationSchema.index({ locationName: 'text', locationCode: 'text' });
EDILocationSchema.index({ ediOnlineDate: 1 });

export default mongoose.model('EDILocation', EDILocationSchema);
