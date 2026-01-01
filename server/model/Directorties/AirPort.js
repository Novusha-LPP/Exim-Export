import mongoose from 'mongoose';

const AirPortSchema = new mongoose.Schema({
  portCode: {
    type: String,
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
    trim: true,
    maxlength: 200
  },
  portDetails: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, { timestamps: true });

// Indexes for better query performance
AirPortSchema.index({ portCode: 1 }, { unique: true });
AirPortSchema.index({ portName: 'text', portCode: 'text' });

export default mongoose.model('AirPort', AirPortSchema);
