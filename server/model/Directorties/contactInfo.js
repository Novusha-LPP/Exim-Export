import mongoose from 'mongoose';

const contactInfoSchema = new mongoose.Schema({
  addressLine1: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  addressLine2: {
    type: String,
    trim: true,
    maxlength: 255
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  pincode: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{6}$/.test(v);
      },
      message: 'Pincode must be 6 digits'
    }
  },
  contactPerson: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  phoneNo: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10,15}$/.test(v.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Invalid phone number format'
    }
  },
  mobileNo: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Mobile number must be 10 digits'
    }
  },
  emailId: {
    type: String,
    sparse: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  website: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website must start with http:// or https://'
    }
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
contactInfoSchema.index({ contactPerson: 'text', addressLine1: 'text', emailId: 'text' });
contactInfoSchema.index({ city: 1 });
contactInfoSchema.index({ state: 1 });
contactInfoSchema.index({ status: 1 });
contactInfoSchema.index({ createdAt: -1 });

export default mongoose.model('ContactInfo', contactInfoSchema);
