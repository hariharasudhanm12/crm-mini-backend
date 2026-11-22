// Lead controller handling CRUD operations, search, filters, and soft delete
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const User = require("../models/User");
const Company = require("../models/Company");
const { getPagination, escapeRegex, isValidEmail } = require("../utils/helpers");

// Validates lead request body returning an error string or null
const validateLeadBody = async (body) => {
  const { name, email, phone, status, assignedTo, company } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return "Name must be at least 2 characters";
  }

  if (!email || !isValidEmail(email)) {
    return "Enter a valid email address";
  }

  if (phone && typeof phone === "string" && phone.trim()) {
    const phoneRegex = /^[0-9+\s-]{7,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      return "Phone must be 7 to 15 digits, spaces, + and -";
    }
  }

  if (status && !Lead.LEAD_STATUSES.includes(status)) {
    return "Invalid status";
  }

  if (assignedTo) {
    if (!mongoose.isValidObjectId(assignedTo)) {
      return "Assigned user not found";
    }
    const userExists = await User.findById(assignedTo);
    if (!userExists) {
      return "Assigned user not found";
    }
  }

  if (company) {
    if (!mongoose.isValidObjectId(company)) {
      return "Company not found";
    }
    const companyExists = await Company.findById(company);
    if (!companyExists) {
      return "Company not found";
    }
  }

  return null;
};

// Get leads API
router.get("/", async (req, res) => {
  try {
    const filter = { isDeleted: false };

    if (req.query.all === "true") {
      const leads = await Lead.find(filter).sort({ name: 1 });
      return res.status(200).json({
        success: true,
        data: leads,
      });
    }

    if (req.query.status && req.query.status !== "All") {
      if (!Lead.LEAD_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }
      filter.status = req.query.status;
    }

    if (req.query.search && typeof req.query.search === "string" && req.query.search.trim()) {
      const searchRegex = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const { page, limit, skip } = getPagination(req.query);

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("assignedTo", "name")
        .populate("company", "name"),
      Lead.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      success: true,
      data: leads,
      total,
      page,
      totalPages,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Create lead API
router.post("/", async (req, res) => {
  try {
    const validationError = await validateLeadBody(req.body);
    if (validationError) {
      if (validationError === "Assigned user not found" || validationError === "Company not found") {
        return res.status(404).json({ success: false, message: validationError });
      }
      return res.status(400).json({ success: false, message: validationError });
    }

    const normalizedEmail = req.body.email.toLowerCase().trim();
    const existing = await Lead.findOne({ email: normalizedEmail, isDeleted: false });
    if (existing) {
      return res.status(409).json({ success: false, message: "A lead with this email already exists" });
    }

    const newLead = await Lead.create({
      name: req.body.name.trim(),
      email: normalizedEmail,
      phone: req.body.phone && typeof req.body.phone === "string" ? req.body.phone.trim() : "",
      status: req.body.status || "New",
      assignedTo: req.body.assignedTo || null,
      company: req.body.company || null,
      isDeleted: false,
    });

    const populated = await Lead.findById(newLead._id)
      .populate("assignedTo", "name")
      .populate("company", "name");

    return res.status(201).json({
      success: true,
      message: "Lead saved",
      data: populated,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "A lead with this email already exists" });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update lead API
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const lead = await Lead.findOne({ _id: id, isDeleted: false });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const validationError = await validateLeadBody(req.body);
    if (validationError) {
      if (validationError === "Assigned user not found" || validationError === "Company not found") {
        return res.status(404).json({ success: false, message: validationError });
      }
      return res.status(400).json({ success: false, message: validationError });
    }

    const normalizedEmail = req.body.email.toLowerCase().trim();
    const existing = await Lead.findOne({
      _id: { $ne: id },
      email: normalizedEmail,
      isDeleted: false,
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "A lead with this email already exists" });
    }

    lead.name = req.body.name.trim();
    lead.email = normalizedEmail;
    lead.phone = req.body.phone && typeof req.body.phone === "string" ? req.body.phone.trim() : "";
    if (req.body.status) lead.status = req.body.status;
    lead.assignedTo = req.body.assignedTo || null;
    lead.company = req.body.company || null;

    await lead.save();

    const populated = await Lead.findById(lead._id)
      .populate("assignedTo", "name")
      .populate("company", "name");

    return res.status(200).json({
      success: true,
      message: "Lead saved",
      data: populated,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "A lead with this email already exists" });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete lead API (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const lead = await Lead.findOne({ _id: id, isDeleted: false });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    lead.isDeleted = true;
    await lead.save();

    return res.status(200).json({
      success: true,
      message: "Lead deleted",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
