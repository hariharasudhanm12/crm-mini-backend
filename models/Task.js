// Task model representing assigned follow-up items
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const { addIdTransform } = require("../utils/helpers");

const TASK_STATUSES = ["Pending", "To Do", "In Progress", "Done"];

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

addIdTransform(taskSchema);

// Additional toJSON transform to format dueDate in TIMEZONE as yyyy-mm-dd
const existingTransform = taskSchema.get("toJSON")?.transform;
taskSchema.set("toJSON", {
  transform: (doc, ret) => {
    if (existingTransform) {
      ret = existingTransform(doc, ret);
    }
    if (ret.dueDate) {
      const tz = process.env.TIMEZONE || "Asia/Kolkata";
      ret.dueDate = moment.tz(ret.dueDate, tz).format("YYYY-MM-DD");
    }
    return ret;
  },
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
module.exports.TASK_STATUSES = TASK_STATUSES;
