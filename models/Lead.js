// Lead model representing sales prospects
const mongoose = require("mongoose");
const { addIdTransform } = require("../utils/helpers");

const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Lost"];

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "New",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Partial unique index allowing duplicate emails only across soft-deleted leads
leadSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

addIdTransform(leadSchema);

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;
module.exports.LEAD_STATUSES = LEAD_STATUSES;
