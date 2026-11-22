// Task controller handling CRUD operations and status ownership verification
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const Task = require("../models/Task");
const Lead = require("../models/Lead");
const User = require("../models/User");
const { getPagination } = require("../utils/helpers");

// Validates task request body returning an error string or null
const validateTaskBody = async (body) => {
  const { title, lead, dueDate, assignedTo, status } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return { status: 400, message: "Title is required" };
  }

  if (!lead || !mongoose.isValidObjectId(lead)) {
    return { status: 400, message: "Invalid lead id" };
  }

  const existingLead = await Lead.findOne({ _id: lead, isDeleted: false });
  if (!existingLead) {
    return { status: 404, message: "Lead not found" };
  }

  const tz = process.env.TIMEZONE || "Asia/Kolkata";
  if (!dueDate || !moment.tz(dueDate, "YYYY-MM-DD", true, tz).isValid()) {
    return { status: 400, message: "Enter a valid due date (yyyy-mm-dd)" };
  }

  if (!assignedTo || !mongoose.isValidObjectId(assignedTo)) {
    return { status: 400, message: "Invalid assignedTo id" };
  }

  const existingUser = await User.findById(assignedTo);
  if (!existingUser) {
    return { status: 404, message: "Assigned user not found" };
  }

  if (status && !Task.TASK_STATUSES.includes(status)) {
    return { status: 400, message: "Invalid status" };
  }

  return null;
};

// Get tasks API
router.get("/", async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [tasks, total] = await Promise.all([
      Task.find()
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("lead", "name")
        .populate("assignedTo", "name"),
      Task.countDocuments(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      success: true,
      data: tasks,
      total,
      page,
      totalPages,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Create task API
router.post("/", async (req, res) => {
  try {
    const error = await validateTaskBody(req.body);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const tz = process.env.TIMEZONE || "Asia/Kolkata";
    const parsedDueDate = moment.tz(req.body.dueDate, "YYYY-MM-DD", true, tz).startOf("day").toDate();

    const task = await Task.create({
      title: req.body.title.trim(),
      lead: req.body.lead,
      dueDate: parsedDueDate,
      assignedTo: req.body.assignedTo,
      status: req.body.status || "Pending",
    });

    const populated = await Task.findById(task._id)
      .populate("lead", "name")
      .populate("assignedTo", "name");

    return res.status(201).json({
      success: true,
      message: "Task saved",
      data: populated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update task status API (PATCH)
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const { status } = req.body;
    if (!status || !Task.TASK_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Authorization check: only assigned user can change status
    if (String(task.assignedTo) !== req.user.id) {
      return res.status(403).json({ success: false, message: "Only the assigned user can update this task" });
    }

    task.status = status;
    await task.save();

    const populated = await Task.findById(task._id)
      .populate("lead", "name")
      .populate("assignedTo", "name");

    return res.status(200).json({
      success: true,
      message: "Task status updated",
      data: populated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update task API (PUT)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const error = await validateTaskBody(req.body);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    // If status changed, verify assigned user ownership
    if (req.body.status && req.body.status !== task.status) {
      if (req.user.id !== String(task.assignedTo)) {
        return res.status(403).json({ success: false, message: "Only the assigned user can update this task" });
      }
    }

    const tz = process.env.TIMEZONE || "Asia/Kolkata";
    task.title = req.body.title.trim();
    task.lead = req.body.lead;
    task.dueDate = moment.tz(req.body.dueDate, "YYYY-MM-DD", true, tz).startOf("day").toDate();
    task.assignedTo = req.body.assignedTo;
    if (req.body.status) task.status = req.body.status;

    await task.save();

    const populated = await Task.findById(task._id)
      .populate("lead", "name")
      .populate("assignedTo", "name");

    return res.status(200).json({
      success: true,
      message: "Task saved",
      data: populated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete task API
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await Task.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Task deleted",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
