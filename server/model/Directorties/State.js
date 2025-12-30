import mongoose from 'mongoose';

const StateSchema = new mongoose.Schema({
  stateName: {
    type: String,
    unique: true
  },
  tinNumber: {
    type: String, // Or Number if you want integer, but 01-like values are easier in string
    length: 2
  },
  stateCode: {
    type: String,
    unique: true,
    length: 2
  }
}, {
  timestamps: true
});

export default mongoose.model('State', StateSchema);
