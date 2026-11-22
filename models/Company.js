// Company model representing client organizations and businesses
const mongoose = require("mongoose");
const { addIdTransform } = require("../utils/helpers");

const INDUSTRIES = [
  "IT",
  "Healthcare",
  "Finance",
  "Education",
  "Manufacturing",
  "Retail",
  "Other",
];

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    industry: {
      type: String,
      required: true,
      enum: INDUSTRIES,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

addIdTransform(companySchema);

const Company = mongoose.model("Company", companySchema);

module.exports = Company;
module.exports.INDUSTRIES = INDUSTRIES;
