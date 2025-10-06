import mongoose from 'mongoose';

const AirlineCodeSchema = new mongoose.Schema({
  alphanumericCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 10
  },
  numericCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 10
  },
  airlineName: {
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

export default mongoose.model('AirlineCode', AirlineCodeSchema);
