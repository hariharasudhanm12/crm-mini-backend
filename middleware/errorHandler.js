// Global 404 and centralized error handler middleware

// 404 handler for unmatched routes
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error(err.message || err);

  // Check for bad JSON syntax error from express.json()
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ success: false, message: "Invalid JSON body" });
  }

  const statusCode = err.status || 500;
  const message = statusCode === 500 ? "Server error" : err.message || "Server error";

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
