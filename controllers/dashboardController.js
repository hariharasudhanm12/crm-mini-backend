// Dashboard controller aggregating CRM metrics and recent activities
const express = require("express");
const router = express.Router();
const moment = require("moment-timezone");
const Lead = require("../models/Lead");
const Task = require("../models/Task");

// Get dashboard summary API
router.get("/summary", async (req, res) => {
  try {
    const tz = process.env.TIMEZONE || "Asia/Kolkata";
    const todayStart = moment.tz(tz).startOf("day").toDate();
    const todayEnd = moment.tz(tz).endOf("day").toDate();

    const [leadAgg, taskAgg, recentLeads, upcomingTasks] = await Promise.all([
      Lead.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalLeads: { $sum: 1 },
            qualifiedLeads: {
              $sum: { $cond: [{ $eq: ["$status", "Qualified"] }, 1, 0] },
            },
          },
        },
      ]),
      Task.aggregate([
        {
          $group: {
            _id: null,
            tasksDueToday: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$dueDate", todayStart] },
                      { $lte: ["$dueDate", todayEnd] },
                      { $ne: ["$status", "Done"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            completedTasks: {
              $sum: {
                $cond: [{ $eq: ["$status", "Done"] }, 1, 0],
              },
            },
          },
        },
      ]),
      Lead.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("assignedTo", "name")
        .populate("company", "name"),
      Task.find({
        dueDate: { $gte: todayStart },
        status: { $ne: "Done" },
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate("lead", "name")
        .populate("assignedTo", "name"),
    ]);

    const totalLeads = leadAgg.length > 0 ? leadAgg[0].totalLeads : 0;
    const qualifiedLeads = leadAgg.length > 0 ? leadAgg[0].qualifiedLeads : 0;
    const tasksDueToday = taskAgg.length > 0 ? taskAgg[0].tasksDueToday : 0;
    const completedTasks = taskAgg.length > 0 ? taskAgg[0].completedTasks : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        qualifiedLeads,
        tasksDueToday,
        completedTasks,
        recentLeads,
        upcomingTasks,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
