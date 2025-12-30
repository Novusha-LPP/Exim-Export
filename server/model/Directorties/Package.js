import mongoose from 'mongoose';

const PackageSchema = new mongoose.Schema({
  packageCode: {
    type: String,
    uppercase: true,
    trim: true,
    maxlength: 20,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9]{1,20}$/.test(v);
      },
      message: 'Package Code must be 1-20 uppercase alphanumeric characters'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, { timestamps: true });

// Indexes for better query performance
PackageSchema.index({ packageCode: 1 }, { unique: true });
PackageSchema.index({ description: 'text', packageCode: 'text' });

export default mongoose.model('Package', PackageSchema);
