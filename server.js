// Mini CRM Backend Server Entrypoint
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const auth = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
connectDB();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);
app.use(express.json());

// Public health check route
app.get("/", (req, res) => res.send("Mini CRM API running"));

// Public login routes
const loginRoutes = require("./controllers/loginController");
app.use("/usercheck", loginRoutes);

// Protected resource routers with auth middleware
app.use("/users", auth, require("./controllers/userController"));
app.use("/companies", auth, require("./controllers/companyController"));
app.use("/leads", auth, require("./controllers/leadController"));
app.use("/tasks", auth, require("./controllers/taskController"));
app.use("/dashboard", auth, require("./controllers/dashboardController"));

// 404 and Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
