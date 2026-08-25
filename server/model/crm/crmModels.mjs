/**
 * CRM Models registered on the Import DB connection.
 *
 * These are lightweight mirrors of the CRM schemas defined in
 * eximdev/server/model/crm/ — registered on the Export project's
 * importDbConnection so the Export server can write CRM records
 * directly into the Import database.
 *
 * IMPORTANT: Keep these schemas in sync with the originals in eximdev.
 */
import mongoose from "mongoose";
import importDbConnection from "../importDB.js";

// ─── Lead Schema ────────────────────────────────────────────────────────────────

const allowedServices = [
  "freight forwarding",
  "dgft",
  "e-lock",
  "client",
  "transportation",
  "paramount",
  "rabs",
  "auto rack",
];

const crmLeadSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    company: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: { type: String },
    phone: { type: String },
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "qualified",
        "unqualified",
        "converted",
        "lost",
        "rejected",
        "duplicate",
        "cancelled",
      ],
      default: "new",
    },
    interestedServices: [
      {
        type: String,
        enum: allowedServices,
      },
    ],
    source: {
      type: String,
      default: "Web / Own Generated Lead",
    },
    score: { type: Number, default: 0 },
    grade: { type: String, enum: ["A", "B", "C", "D"], default: "D" },
    crateSize: { type: String },
    shipper: { type: String },
    stuffing: { type: String },
    shippingLine: { type: String },
    shipmentType: { type: String },
    pol: { type: String },
    pod: { type: String },
    containerType: { type: String },
    containerWeight: { type: String },
    containerVolume: { type: String },
    paymentTerm: { type: String },
    detentionFreeDays: { type: String },
    transitTime: { type: String },
    currentFreightIndications: { type: String },
    referralSourceName: { type: String },
    businessVertical: {
      type: String,
      enum: [
        "Paramount",
        "Transportation",
        "Freight Forwarding",
        "Export",
        "Import",
      ],
      default: "Paramount",
    },
    monthlyVolume: { type: String },
    monthlyRevenue: { type: String },
    period: {
      type: String,
      default: () => new Date().toISOString().substring(0, 7),
    },
    convertedAt: { type: Date },
    convertedTo: {
      accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
      },
      contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
      },
      opportunityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Opportunity",
      },
    },
    // ── Cross-reference to Export Freight Forwarding ──
    freightEnquiryRef: { type: String, index: true },
  },
  { timestamps: true }
);

// ─── Account Schema ─────────────────────────────────────────────────────────────

const crmAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    parentAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    healthScore: { type: Number, default: 0 },
    businessVertical: {
      type: String,
      enum: [
        "Paramount",
        "Transportation",
        "Freight Forwarding",
        "Export",
        "Import",
      ],
      default: "Paramount",
    },
  },
  { timestamps: true }
);

// ─── Contact Schema ─────────────────────────────────────────────────────────────

const crmContactSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: { type: String },
    phone: { type: String },
    isPrimary: { type: Boolean, default: false },
    convertedFromLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },
    businessVertical: {
      type: String,
      enum: [
        "Paramount",
        "Transportation",
        "Freight Forwarding",
        "Export",
        "Import",
      ],
      default: "Paramount",
    },
  },
  { timestamps: true }
);

// ─── Opportunity Schema ─────────────────────────────────────────────────────────

const crmOpportunitySchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    primaryContactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    value: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: [
        "lead",
        "qualified",
        "opportunity",
        "sales_visit",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      default: "opportunity",
    },
    forecastCategory: {
      type: String,
      enum: ["pipeline", "best_case", "commit", "closed"],
      default: "pipeline",
    },
    services: [{ type: String }],
    expectedCloseDate: { type: Date },
    probability: { type: Number, min: 0, max: 100, default: 0 },
    crateSize: { type: String },
    shipper: { type: String },
    stuffing: { type: String },
    shippingLine: { type: String },
    shipmentType: { type: String },
    pol: { type: String },
    pod: { type: String },
    containerType: { type: String },
    containerWeight: { type: String },
    containerVolume: { type: String },
    paymentTerm: { type: String },
    detentionFreeDays: { type: String },
    transitTime: { type: String },
    currentFreightIndications: { type: String },
    referralSourceName: { type: String },
    businessVertical: {
      type: String,
      enum: [
        "Paramount",
        "Transportation",
        "Freight Forwarding",
        "Export",
        "Import",
      ],
      default: "Paramount",
    },
    monthlyVolume: { type: String },
    monthlyRevenue: { type: String },
    source: { type: String },
    carry_forward: { type: Boolean, default: false },
    origin_month: { type: String },
    period: {
      type: String,
      default: () => new Date().toISOString().substring(0, 7),
    },
    closeReason: { type: String },
    closeNotes: { type: String },
    stageHistory: [
      {
        stage: { type: String },
        enteredAt: { type: Date, default: Date.now },
        exitedAt: { type: Date },
      },
    ],
    remarks: [
      {
        text: String,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        userName: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    convertedFromLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },
    plannedVisits: [
      {
        visitDate: { type: Date },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date },
        isCancelled: { type: Boolean, default: false },
        cancelledAt: { type: Date },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // ── Cross-reference to Export Freight Forwarding ──
    freightEnquiryRef: { type: String, index: true },
    // ── Freight Forwarding operational data synced from Export ──
    freightData: {
      pipelineStage: { type: String }, // Enquiry, Draft BL, SOB, Billing, etc.
      enquiryNo: { type: String },
      successNo: { type: String },
      sourceJobNo: { type: String },
      portOfLoading: { type: String },
      portOfDestination: { type: String },
      consignmentType: { type: String },
      containerSize: { type: String },
      grossWeight: { type: String },
      netWeight: { type: String },
      sailingDate: { type: String },
      etaDate: { type: String },
      arrivalDate: { type: String },
      finalDeliveryDate: { type: String },
      draftBlApproved: { type: Boolean },
      billingCompleted: { type: Boolean },
      shippingLine: { type: String },
      vesselName: { type: String },
      bookingNo: { type: String },
      blNo: { type: String },
      lastSyncedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// ─── Register models on the Import DB connection ────────────────────────────────

const CrmLead = importDbConnection.model("Lead", crmLeadSchema);
const CrmAccount = importDbConnection.model("Account", crmAccountSchema);
const CrmContact = importDbConnection.model("Contact", crmContactSchema);
const CrmOpportunity = importDbConnection.model(
  "Opportunity",
  crmOpportunitySchema
);

export { CrmLead, CrmAccount, CrmContact, CrmOpportunity };
