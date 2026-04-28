const { StatusCodes } = require("http-status-codes");

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = StatusCodes.BAD_REQUEST;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = StatusCodes.NOT_FOUND;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = StatusCodes.UNAUTHORIZED;
  }
}

module.exports = { ValidationError, NotFoundError, UnauthorizedError };
