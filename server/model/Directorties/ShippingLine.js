import mongoose from 'mongoose';

const ShippingLineSchema = new mongoose.Schema({
  shippingLineCode: {
    type: String,
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
    trim: true,
    maxlength: 200
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  }
}, { timestamps: true });


export default mongoose.model('ShippingLine', ShippingLineSchema);
