import mongoose from 'mongoose';

const PortSchema = new mongoose.Schema({
  portCode: {
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
      message: 'Port Code must be 2-10 uppercase alphanumeric characters'
    }
  },
  portName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  portDetails: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  }
}, { timestamps: true });

// Indexes for better query performance
PortSchema.index({ portCode: 1 }, { unique: true });
PortSchema.index({ country: 1 });
PortSchema.index({ portName: 'text', portCode: 'text' });

export default mongoose.model('Port', PortSchema);
