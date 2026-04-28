const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const dogsRouter = require("./routes/dogs");
const { StatusCodes } = require("http-status-codes");
// const { ValidationError } = require("../error.js");

const app = express();

// Your middleware here
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

app.use((req, res, next) => {
  const date = new Date().toISOString();
  console.log(`[${date}]: ${req.method} ${req.path} (${req.requestId})`);
  next();
});

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  if (req.method === "POST" && !req.is("application/json")) {
    return res.status(400).json({
      error: "Content-Type must be application/json",
      requestId: req.requestId,
    });
  }

  next();
});

app.use("/images", express.static(path.join(__dirname, "public", "images")));

app.use("/", dogsRouter); // Do not remove this line

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 400 && statusCode < 500) {
    console.warn(`WARN: ${error.name} ${error.message}`);
  } else {
    console.error(`ERROR: Error ${error.message}`);
  }

  return res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal Server Error" : error.message,
    requestId: req.requestId,
  });
});

app.use((req, res) => {
  return res
    .status(404)
    .json({ error: "Route not found", requestId: req.requestId });
});

const server = app.listen(3000, () =>
  console.log("Server listening on port 3000"),
);

module.exports = server;
