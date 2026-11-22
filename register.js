require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const moment = require("moment-timezone");
const User = require("./models/User");

const TZ = process.env.TZ_NAME || "Asia/Kolkata";

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);

    await User.deleteMany({});

    const password = await bcrypt.hash("password123", 10);

    // current time in IST, stored as a JS Date (MongoDB saves it in UTC)
    const createdAt = moment.tz(TZ).format("DD MMM YYYY, hh:mm A z");

    await User.insertMany([
        { name: "John", email: "john@mail.com", password, createdAt },
        { name: "Priya", email: "priya@mail.com", password, createdAt },
        { name: "Admin", email: "admin@mail.com", password, createdAt },
    ]);

    console.log(
        "Users Saved at",
        moment.tz(TZ).format("DD MMM YYYY, hh:mm A z")
    );
    process.exit();
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});