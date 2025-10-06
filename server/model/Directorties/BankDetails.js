import mongoose from 'mongoose';

const bankDetailsSchema = new mongoose.Schema({
  bankName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  branch: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^\d{9,18}$/.test(v);
      },
      message: 'Account Number must be 9-18 digits'
    }
  },
  ifscCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
      },
      message: 'Invalid IFSC Code format (e.g., SBIN0001234)'
    }
  },
  swiftCode: {
    type: String,
    sparse: true,
    unique: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v);
      },
      message: 'Invalid SWIFT Code format (8 or 11 characters)'
    }
  },
  bankAddress: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Closed'],
    default: 'Active'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bankDetailsSchema.index({ bankName: 'text', branch: 'text', ifscCode: 'text' });
bankDetailsSchema.index({ bankName: 1 });
bankDetailsSchema.index({ ifscCode: 1 }, { unique: true });
bankDetailsSchema.index({ accountNumber: 1 }, { unique: true });
bankDetailsSchema.index({ status: 1 });
bankDetailsSchema.index({ createdAt: -1 });

export default mongoose.model('BankDetails', bankDetailsSchema);
