const { StatusCodes } = require("http-status-codes");

module.exports = (req, res, next) => {
  if (global.user_id === null) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "unauthorized" });
  }

  next();
};
