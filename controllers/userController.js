const StatusCodes = require("http-status-codes");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require("../validation/userSchema");
const pool = require("../db/pg-pool");

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

const register = async (req, res, next) => {
  if (!req.body) req.body = {};
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res
      .status(400)
      .json({ message: "Validation failed", details: error.details });
  }

  let user = null;
  value.hashed_password = await hashPassword(value.password);

  try {
    user = await pool.query(
      `INSERT INTO users (email, name, hashed_password) 
      VALUES ($1, $2, $3) RETURNING id, email, name`,
      [value.email, value.name, value.hashed_password],
    ); // note that you use a parameterized query
  } catch (e) {
    // the email might already be registered
    if (e.code === "23505") {
      return res.status(400).json({ message: e.message });
    }
    return next(e); // all other errors get passed to the error handler
  }
  global.user_id = user.rows[0].id;

  res
    .status(StatusCodes.CREATED)
    .json({ name: user.rows[0].name, email: user.rows[0].email });
};

const logon = async (req, res, next) => {
  const { email, password } = req.body;
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  const existingUser = result.rows[0];

  if (
    !existingUser ||
    !(await comparePassword(password, existingUser.hashed_password))
  ) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  global.user_id = result.rows[0].id;
  res.status(StatusCodes.OK).json({
    message: "User verified",
    name: existingUser.name,
    email: existingUser.email,
  });
};

const logoff = (req, res) => {
  global.user_id = null;
  return res.status(StatusCodes.OK).json({ message: "User log off." });
};

module.exports = { register, logon, logoff };
