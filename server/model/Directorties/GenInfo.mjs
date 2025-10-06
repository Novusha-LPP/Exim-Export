import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const genInfoSchema = new Schema({
  organizationName: {
    type: String,
    required: [true, 'Organization name is required'],
    maxlength: [255, 'Organization name cannot exceed 255 characters'],
    trim: true
  },
  shortName: {
    type: String,
    required: [false, 'Short name is required'],
    maxlength: [50, 'Short name cannot exceed 50 characters'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Organization type is required'],
    enum: {
      values: ['Shipper', 'Consignee', 'Agent', 'Carrier', 'Other'],
      message: 'Type must be one of: Shipper, Consignee, Agent, Carrier, Other'
    }
  },
  panNo: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
      },
      message: 'PAN number must be in format: ABCTY1234D'
    }
  },
  gstin: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'GSTIN must be in valid format'
    }
  },
  ieCode: {
    type: String,
    maxlength: [20, 'IE Code cannot exceed 20 characters'],
    trim: true
  },
  branchCode: {
    type: String,
    maxlength: [20, 'Branch Code cannot exceed 20 characters'],
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['Active', 'Inactive'],
      message: 'Status must be either Active or Inactive'
    },
    default: 'Active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
genInfoSchema.index({ organizationName: 'text', shortName: 'text' });
genInfoSchema.index({ type: 1 });
genInfoSchema.index({ status: 1 });
genInfoSchema.index({ createdAt: -1 });

export default model('GenInfo', genInfoSchema);
