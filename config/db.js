const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log("MongoDB connected successfully");
    } catch (err) {
        console.error("MongoDB initial connection error:", err.message);
        console.warn("Tip: Check MongoDB Atlas Network Access IP whitelist (0.0.0.0/0). Retrying connection in background...");
    }
};

mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected! Attempting to reconnect...");
});

mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected successfully");
});

mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection event error:", err.message);
});

module.exports = connectDB;
