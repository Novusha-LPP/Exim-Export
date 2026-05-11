import mongoose from 'mongoose';

const DistrictSchema = new mongoose.Schema({
  districtCode: {
    type: String,
    trim: true,
    required: true
  },
  districtName: {
    type: String,
    trim: true,
    required: true
  },
  stateName: {
    type: String,
    trim: true
  },
  stateCode: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, { timestamps: true });

// Indexes for better query performance
DistrictSchema.index({ districtCode: 1 });
DistrictSchema.index({ districtName: 1 });
DistrictSchema.index({ districtName: 'text', districtCode: 'text' });
DistrictSchema.index({ stateCode: 1 });

export default mongoose.model('DistrictCode', DistrictSchema);
