// Company controller handling CRUD operations and associated leads
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Company = require("../models/Company");
const Lead = require("../models/Lead");
const { getPagination, escapeRegex, isValidUrl } = require("../utils/helpers");

// Get companies API
router.get("/", async (req, res) => {
  try {
    if (req.query.all === "true") {
      const companies = await Company.find().sort({ name: 1 });
      return res.status(200).json({
        success: true,
        data: companies,
      });
    }

    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (req.query.search && typeof req.query.search === "string" && req.query.search.trim()) {
      const searchRegex = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = [{ name: searchRegex }, { location: searchRegex }];
    }

    const [companies, total] = await Promise.all([
      Company.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Company.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      success: true,
      data: companies,
      total,
      page,
      totalPages,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Create company API
router.post("/", async (req, res) => {
  try {
    const { name, industry, location, website } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Company name is required" });
    }

    if (!industry || typeof industry !== "string" || !Company.INDUSTRIES.includes(industry.trim())) {
      return res.status(400).json({ success: false, message: "Choose a valid industry" });
    }

    if (!location || typeof location !== "string" || !location.trim()) {
      return res.status(400).json({ success: false, message: "Location is required" });
    }

    if (website && typeof website === "string" && website.trim()) {
      if (!isValidUrl(website.trim())) {
        return res.status(400).json({ success: false, message: "Enter a valid website URL" });
      }
    }

    const newCompany = await Company.create({
      name: name.trim(),
      industry: industry.trim(),
      location: location.trim(),
      website: website && typeof website === "string" ? website.trim() : "",
    });

    return res.status(201).json({
      success: true,
      message: "Company saved",
      data: newCompany,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get company leads API
router.get("/:id/leads", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const leads = await Lead.find({ company: id, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name");

    return res.status(200).json({
      success: true,
      data: leads,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update company API
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const { name, industry, location, website } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Company name is required" });
    }

    if (!industry || typeof industry !== "string" || !Company.INDUSTRIES.includes(industry.trim())) {
      return res.status(400).json({ success: false, message: "Choose a valid industry" });
    }

    if (!location || typeof location !== "string" || !location.trim()) {
      return res.status(400).json({ success: false, message: "Location is required" });
    }

    if (website && typeof website === "string" && website.trim()) {
      if (!isValidUrl(website.trim())) {
        return res.status(400).json({ success: false, message: "Enter a valid website URL" });
      }
    }

    const updated = await Company.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        industry: industry.trim(),
        location: location.trim(),
        website: website && typeof website === "string" ? website.trim() : "",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Company saved",
      data: updated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete company API
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Refuse delete when company has non-deleted leads
    const leadCount = await Lead.countDocuments({ company: id, isDeleted: false });
    if (leadCount > 0) {
      return res.status(409).json({ success: false, message: "Cannot delete a company that still has leads" });
    }

    await Company.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Company deleted",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
