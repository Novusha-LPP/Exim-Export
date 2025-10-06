import mongoose from 'mongoose';

const StateSchema = new mongoose.Schema({
  stateName: {
    type: String,
    required: true,
    unique: true
  },
  tinNumber: {
    type: String, // Or Number if you want integer, but 01-like values are easier in string
    required: true,
    length: 2
  },
  stateCode: {
    type: String,
    required: true,
    unique: true,
    length: 2
  }
}, {
  timestamps: true
});

export default mongoose.model('State', StateSchema);
