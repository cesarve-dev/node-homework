const StatusCodes = require("http-status-codes");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require("../validation/userSchema");

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

const register = async (req, res) => {
  if (!req.body) req.body = {};
  const { error, value } = userSchema.validate(req.body);
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
  const { name, email, password } = value;
  const hashedPass = await hashPassword(password);
  const newUser = { name, email, hashedPass };
  global.users.push(newUser);
  global.user_id = newUser;

  res.status(StatusCodes.CREATED).json({ name, email });
};

const logon = async (req, res) => {
  const { email, password } = req.body;
  const existingUser = global.users.find((user) => user.email === email);

  if (
    !existingUser ||
    !(await comparePassword(password, existingUser.hashedPass))
  ) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  global.user_id = existingUser;
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
