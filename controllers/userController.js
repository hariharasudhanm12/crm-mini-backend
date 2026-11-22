// User controller providing workspace user directory
const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Get users API
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ name: 1 });
    const data = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
