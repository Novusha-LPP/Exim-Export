import mongoose from 'mongoose';

const TariffHeadSchema = new mongoose.Schema({
  tariffHead: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 20,
    validate: {
      validator: function(v) {
        return /^\d{4,8}(\.\d{2})?$/.test(v);
      },
      message: 'Invalid Tariff Head format (e.g., 8708.80, 84821000)'
    }
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  uqc: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    maxlength: 10,
    validate: {
      validator: function(v) {
        return /^[A-Z]{2,10}$/.test(v);
      },
      message: 'UQC must be 2-10 uppercase letters'
    }
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Obsolete'],
    default: 'Active'
  }
}, { timestamps: true });

// Indexes for better query performance
TariffHeadSchema.index({ tariffHead: 1 }, { unique: true });
TariffHeadSchema.index({ description: 'text', tariffHead: 'text' });
TariffHeadSchema.index({ uqc: 1 });
TariffHeadSchema.index({ status: 1 });

export default mongoose.model('TariffHead', TariffHeadSchema);
