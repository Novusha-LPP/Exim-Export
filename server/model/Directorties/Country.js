import mongoose from 'mongoose';

const CountrySchema = new mongoose.Schema({
  countryCode: {
    type: String,
    trim: true,
    maxlength: 3,
    validate: {
      validator: function(v) {
        return /^[A-Z]{2,3}$/.test(v);
      },
      message: 'Country Code must be 2-3 uppercase letters'
    }
  },
  countryName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, { timestamps: true });

// Indexes for better query performance
CountrySchema.index({ countryCode: 1 }, { unique: true });
CountrySchema.index({ countryName: 1 }, { unique: true });
CountrySchema.index({ countryName: 'text', countryCode: 'text' });

export default mongoose.model('Country', CountrySchema);
