import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const exportHandoverSchema = new Schema({
  exportJobId: { type: String, required: true },
  shippingBillNumber: { type: String, required: true },
  handoverType: { type: String, enum: ['AUTOMATED', 'MANUAL'], default: 'AUTOMATED' },
  documentType: { type: String, required: true },
  handoverDateTime: { type: Date, required: true },
  recipientName: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  remarks: String,
}, { timestamps: true });

const integrationLogSchema = new Schema({
  handoverRecordId: { type: Schema.Types.ObjectId, ref: 'ExportHandover' },
  system: { type: String, enum: ['ODEx', 'MMD3'], required: true },
  requestPayload: Schema.Types.Mixed,
  responsePayload: Schema.Types.Mixed,
  status: { type: String, enum: ['SUCCESS', 'ERROR'] },
  errorMessage: String,
  timestamp: { type: Date, default: Date.now },
});

export const ExportHandover = model('ExportHandover', exportHandoverSchema);
export const IntegrationLog = model('IntegrationLog', integrationLogSchema);
