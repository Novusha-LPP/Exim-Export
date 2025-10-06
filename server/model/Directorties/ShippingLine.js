import mongoose from 'mongoose';

const ShippingLineSchema = new mongoose.Schema({
  shippingLineCode: {
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
      message: 'Shipping Line Code must be 2-10 uppercase alphanumeric characters'
    }
  },
  shippingName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  }
}, { timestamps: true });

// Indexes for better query performance
ShippingLineSchema.index({ shippingLineCode: 1 }, { unique: true });
ShippingLineSchema.index({ shippingName: 'text', location: 'text' });
ShippingLineSchema.index({ location: 1 });
ShippingLineSchema.index({ status: 1 });

export default mongoose.model('ShippingLine', ShippingLineSchema);
