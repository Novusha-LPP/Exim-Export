import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema({
  currency_code: {
    type: String,
  },
  currency_name: {
    type: String,
  },
  unit: {
    type: Number,
    default: 1.0,
  },
  import_rate: {
    type: Number,
  },
  export_rate: {
    type: Number,
  }
});

const currencyRateSchema = new mongoose.Schema({
  notification_number: {
    type: String,
    index: true,
  },
  effective_date: {
    type: String,
  },
  exchange_rates: [exchangeRateSchema],
  meta: {
    parsed_currency_count: Number,
    raw_lines_detected: Number,
    total_lines: Number,
  },
  pdf_filename: String,
  scraped_at: {
    type: Date,
    default: Date.now,
  },
  is_active: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

// Index for faster queries
currencyRateSchema.index({ notification_number: 1, effective_date: 1 });

const CurrencyRate = mongoose.model('CurrencyRate', currencyRateSchema);

export default CurrencyRate;
