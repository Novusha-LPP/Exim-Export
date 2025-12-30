import mongoose from 'mongoose';

const CurrencySchema = new mongoose.Schema({
  currencyCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 3,
    validate: {
      validator: function(v) {
        return /^[A-Z]{3}$/.test(v);
      },
      message: 'Currency code must be 3 uppercase letters (ISO 4217)'
    }
  },
  currencyDescription: {
    type: String,
    trim: true,
    maxlength: 100
  },
  countryCode: {
    type: String,
    uppercase: true,
    trim: true,
    maxlength: 2,
    validate: {
      validator: function(v) {
        return /^[A-Z]{2}$/.test(v);
      },
      message: 'Country code must be 2 uppercase letters (ISO 3166-1)'
    }
  },
  schNo: {
    type: String,
    trim: true,
    maxlength: 20
  },
  standardCurrency: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Indexes for better query performance
CurrencySchema.index({ currencyCode: 1 }, { unique: true });
CurrencySchema.index({ countryCode: 1 });
CurrencySchema.index({ standardCurrency: 1 });
CurrencySchema.index({ currencyDescription: 'text', currencyCode: 'text' });

export default mongoose.model('Currency', CurrencySchema);
