const StatusCodes = require("http-status-codes");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require("../validation/userSchema");
const pool = require("../db/pg-pool");
const prisma = require("../db/prisma");

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
  delete value.password;

  try {
    user = await prisma.user.create({
      data: {
        name: value.name,
        email: value.email,
        hashedPassword: value.hashed_password,
      },
      select: { name: true, email: true, id: true }, // specify the column values to return
    });
  } catch (err) {
    // the email might already be registered
    if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      return res.status(400).json({ message: err.message });
    } else {
      return next(err);
    }
  }
  global.user_id = user.id;

  res.status(StatusCodes.CREATED).json({ name: user.name, email: user.email });
};

const logon = async (req, res, next) => {
  const { email, password } = req.body;
  const lowerEmail = email.toLowerCase();
  // const result = await pool.query("SELECT * FROM users WHERE email = $1", [
  //   email,
  // ]);
  const existingUser = await prisma.user.findUnique({
    where: { email: lowerEmail },
  });

  if (
    !existingUser ||
    !(await comparePassword(password, existingUser.hashedPassword))
  ) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  global.user_id = existingUser.id;
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
