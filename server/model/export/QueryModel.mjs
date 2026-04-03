import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    repliedBy: { type: String, required: true }, // username
    repliedByName: { type: String }, // full name
    repliedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const querySchema = new mongoose.Schema(
  {
    // Reference to the job
    job_no: { type: String, required: true, index: true },
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: "ExportJob" },

    // Which field the query is about
    fieldName: { type: String, required: true },
    fieldLabel: { type: String }, // human-readable label

    // Who raised the query and from which module
    raisedBy: { type: String, required: true }, // username
    raisedByName: { type: String }, // full name
    raisedFromModule: { type: String, required: true }, // e.g. "export-dsr", "export-operation"

    // Who the query is directed to
    targetModule: { type: String, required: true }, // e.g. "export-operation", "export-dsr"

    // Query details
    subject: { type: String, required: true },
    message: { type: String, required: true },
    currentValue: { type: String }, // the current value of the field
    requestedValue: { type: String }, // what they want it changed to

    // Status: open, resolved, rejected
    status: {
      type: String,
      enum: ["open", "resolved", "rejected"],
      default: "open",
      index: true,
    },

    // Resolution details
    resolvedBy: { type: String },
    resolvedByName: { type: String },
    resolvedAt: { type: Date },
    resolutionNote: { type: String },

    // Replies/conversation thread
    replies: [replySchema],

    // Track if the communication was seen by either side
    seenByTarget: { type: Boolean, default: false },
    seenBySender: { type: Boolean, default: true },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Compound index for efficient filtering
querySchema.index({ targetModule: 1, status: 1 });
querySchema.index({ raisedBy: 1, status: 1 });

const QueryModel = mongoose.model("Query", querySchema);

export default QueryModel;
