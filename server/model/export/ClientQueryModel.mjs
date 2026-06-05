import mongoose from "mongoose";

const clientReplySchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    repliedBy: { type: String, required: true }, // username or client name
    senderType: { type: String, enum: ["client", "admin"], required: true },
    repliedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const clientQuerySchema = new mongoose.Schema(
  {
    // Reference to the job
    job_no: { type: String, required: true, index: true },
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: "ExportJob" },

    // Client details
    client_id: { type: String }, // optional client identification
    client_name: { type: String }, // name of the client raising the query

    // Query details
    subject: { type: String, required: true },
    message: { type: String, required: true },

    // Status: open, resolved, rejected
    status: {
      type: String,
      enum: ["open", "resolved", "rejected"],
      default: "open",
      index: true,
    },

    // Resolution details
    resolvedBy: { type: String }, // username of admin resolving
    resolvedAt: { type: Date },
    resolutionNote: { type: String },

    // Replies/conversation thread
    replies: [clientReplySchema],

    // Track if the communication was seen by either side
    seenByAdmin: { type: Boolean, default: false },
    seenByClient: { type: Boolean, default: true },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Compound index for efficient filtering
clientQuerySchema.index({ client_id: 1, status: 1 });
clientQuerySchema.index({ job_no: 1, status: 1 });

const ClientQueryModel = mongoose.model("ClientQuery", clientQuerySchema);

export default ClientQueryModel;
