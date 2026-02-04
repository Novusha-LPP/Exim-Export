import mongoose from "mongoose";

const auditTrailSchema = new mongoose.Schema({
  // Document information
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  documentType: {
    type: String,
    index: true
  }, // e.g., 'Job', 'User', etc.

  // Job specific identifiers for easier tracking
  job_no: { type: String, index: true },
  year: { type: String, index: true },

  // User information
  userId: {
    type: String, // Changed from ObjectId to String to support username-based IDs
    index: true
  },
  username: {
    type: String,
    index: true
  },
  userRole: { type: String },

  // Action details
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'BULK_CREATE_UPDATE', 'BULK_OPERATION'],
    index: true
  },

  // Change details
  changes: [{
    fieldPath: { type: String }, // Full dot notation path
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    changeType: {
      type: String,
      enum: ['ADDED', 'MODIFIED', 'REMOVED', 'BULK_CREATE_UPDATE', 'BULK_OPERATION'],
    }
  }],

  // Request details
  endpoint: { type: String }, // API endpoint that made the change
  method: { type: String }, // HTTP method
  ipAddress: { type: String },
  userAgent: { type: String },

  // Metadata
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Additional context
  reason: { type: String }, // Optional reason for change
  sessionId: { type: String },
}, {
  timestamps: true
});

// Compound indexes for efficient querying
auditTrailSchema.index({ documentId: 1, timestamp: -1 });
auditTrailSchema.index({ job_no: 1, year: 1, timestamp: -1 });
auditTrailSchema.index({ username: 1, timestamp: -1 });
auditTrailSchema.index({ action: 1, timestamp: -1 });

const AuditTrailModel = mongoose.model("ExportAuditTrail", auditTrailSchema);
export default AuditTrailModel;
