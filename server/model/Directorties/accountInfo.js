import mongoose from 'mongoose';

const accountInfoSchema = new mongoose.Schema({
  accountGroup: {
    type: String,
    required: true,
    enum: [
      'Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses', 
      'Accounts Receivable', 'Accounts Payable', 'Inventory', 
      'Fixed Assets', 'Current Assets', 'Other'
    ]
  },
  creditLimit: {
    type: Number,
    required: true,
    min: [0, 'Credit limit cannot be negative'],
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Credit limit must be a positive number'
    }
  },
  paymentTerms: {
    type: String,
    required: true,
    enum: [
      'Net 30', 'Net 15', 'Net 7', 'Due on Receipt', '2/10 Net 30', 
      'Net 60', 'Net 90', 'COD', 'Prepaid', 'Custom'
    ]
  },
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'EUR', 'INR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SGD'],
    default: 'USD'
  },
  ledgerCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9-]+$/.test(v);
      },
      message: 'Ledger Code must contain only uppercase letters, numbers, and hyphens'
    }
  },
  accountManager: {
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
}, {
  timestamps: true
});

// Indexes for better query performance
accountInfoSchema.index({ ledgerCode: 1 }, { unique: true });
accountInfoSchema.index({ accountGroup: 1 });
accountInfoSchema.index({ currency: 1 });
accountInfoSchema.index({ status: 1 });
accountInfoSchema.index({ accountManager: 'text', ledgerCode: 'text' });
accountInfoSchema.index({ createdAt: -1 });

export default mongoose.model('AccountInfo', accountInfoSchema);
