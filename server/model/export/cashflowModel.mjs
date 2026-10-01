import mongoose from "mongoose";

// Team Members for Expense Made By dropdown
const cashflowTeamMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const CashflowTeamMemberModel = mongoose.model(
  "CashflowTeamMember",
  cashflowTeamMemberSchema
);

export const DEFAULT_TEAM_MEMBERS = [
  "ANURAG",
  "DURGESH",
  "KAPIL",
  "BALVIR",
  "KIRIT",
  "PARAS",
];

// Manual Cashflow Entries (Balance Additions & Manual Expenses)
const cashflowEntrySchema = new mongoose.Schema(
  {
    entryType: {
      type: String,
      enum: ["BALANCE_ADD", "MANUAL_EXPENSE"],
      required: true,
      index: true,
    },
    postingDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    invoiceDate: {
      type: String,
      trim: true,
      default: "",
    },
    jobRefNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    partyName: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    chargeHead: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    particular: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },
    expenseMadeBy: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByName: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export const CashflowEntryModel = mongoose.model(
  "CashflowEntry",
  cashflowEntrySchema
);

export default {
  CashflowTeamMemberModel,
  CashflowEntryModel,
  DEFAULT_TEAM_MEMBERS,
};
