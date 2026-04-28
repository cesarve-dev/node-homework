const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const dogsRouter = require("./routes/dogs");
const { StatusCodes } = require("http-status-codes");

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

app.use(express.json({ limit: "1kb" }));

app.use((req, res, next) => {
  if (req.method === "POST" && !req.is("application/json")) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Content-type must be application/json",
      requestId: req.requestId,
    });
  }

  next();
});

app.use("/images", express.static(path.join(__dirname, "public", "images")));

app.use("/", dogsRouter); // Do not remove this line

app.use((error, req, res, next) => {
  if (!error.statusCode) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "An internal server error occurred.",
      requestId: req.requestId,
    });
  }

  return res
    .status(error.statusCode)
    .json({ error: error.message, requestId: req.requestId });
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
