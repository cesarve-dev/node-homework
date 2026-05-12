const { StatusCodes } = require("http-status-codes");

const errorHandlerMiddleware = (err, req, res, next) => {
  console.error(
    "Internal server error: ",
    err.constructor.name,
    JSON.stringify(err, ["name", "message", "stack"]),
  );

  if (err.code === "ECONNREFUSED" && err.port === 5432) {
    // the postgresql port
    console.log(
      "The database connection was refused.  Is your database service running?",
    );
  }

  if (!res.headersSent) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
};

module.exports = errorHandlerMiddleware;
