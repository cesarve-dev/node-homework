const { StatusCodes } = require("http-status-codes");

const notFound = (req, res) => {
  if (!res.headersSent) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .send(`You can't do a ${req.method} for ${req.url}`);
  }
};

module.exports = notFound;
