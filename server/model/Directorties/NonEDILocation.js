import mongoose from 'mongoose';

const NonEDILocationSchema = new mongoose.Schema({
  locationCode: {
    type: String,
    required: true,
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
    required: true,
    trim: true,
    maxlength: 100
  },
  locationName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v instanceof Date && !isNaN(v);
      },
      message: 'End Date must be a valid date'
    }
  }
}, { timestamps: true });

// Indexes for better query performance
NonEDILocationSchema.index({ locationCode: 1 }, { unique: true });
NonEDILocationSchema.index({ category: 1 });
NonEDILocationSchema.index({ locationName: 'text', locationCode: 'text' });
NonEDILocationSchema.index({ endDate: 1 });

export default mongoose.model('NonEDILocation', NonEDILocationSchema);
