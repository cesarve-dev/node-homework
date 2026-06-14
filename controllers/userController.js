const StatusCodes = require("http-status-codes");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only when HTTPS is available
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); // 1 hour expiration
  // Set cookie.  Note that the cookie flags have to be different in production and in test.
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken; // this is needed in the body returned by logon() or register()
};

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

const googleLogon = async (req, res, next) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: "No uthorization code provided." });
  }

  try {
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "postmessage",
    );
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name } = ticket.getPayload();
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (existingUser) {
      const csrfToken = setJwtCookie(req, res, existingUser);
      return res.status(200).json({ name: existingUser.name, csrfToken });
    }

    //add a transanction for new user, similar to register function.
    // const newUser = await prisma.user.create({
    //   data: {
    //     email,
    //     name,
    //     hashedPassword: `google:${googleId}`,
    //   },
    //   select: { id: true, name: true, email: true },
    // });

    const result = await prisma.$transaction(async (tx) => {
      // Create user account (similar to Assignment 6, but using tx instead of prisma)
      const newUser = await tx.user.create({
        data: {
          email: email,
          name: name,
          hashedPassword: `google:${googleId}`,
        },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      // Create 3 welcome tasks using createMany
      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: newUser.id,
          priority: "medium",
        },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // Fetch the created tasks to return them
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return { user: newUser, welcomeTasks };
    });
    const csrfToken = setJwtCookie(req, res, result.user);
    return res.status(201).json({
      user: { name: result.user.name, email: result.user.email },
      csrfToken,
    });
  } catch (err) {
    return next(err);
  }
};

const register = async (req, res, next) => {
  if (!req.body) req.body = {};

  let isPerson = false;
  if (req.body.recaptchaToken) {
    const token = req.body.recaptchaToken;
    const params = new URLSearchParams();
    params.append("secret", process.env.RECAPTCHA_SECRET);
    params.append("response", token);
    params.append("remoteip", req.ip);
    const response = await fetch(
      // might throw an error that would cause a 500 from the error handler
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const data = await response.json();
    if (data.success) isPerson = true;
    delete req.body.recaptchaToken;
    console.log("header:", req.get("X-Recaptcha-Test"));
    console.log("env:", process.env.RECAPTCHA_BYPASS);
  } else if (
    process.env.RECAPTCHA_BYPASS &&
    req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS
  ) {
    // might be a test environment
    isPerson = true;
  }
  if (!isPerson) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "We can't tell if you're a person or a bot.",
    });
  }

  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res
      .status(400)
      .json({ message: "Validation failed", details: error.details });
  }

  let user = null;
  value.hashedPassword = await hashPassword(value.password);
  delete value.password;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create user account (similar to Assignment 6, but using tx instead of prisma)
      const newUser = await tx.user.create({
        data: {
          email: value.email,
          name: value.name,
          hashedPassword: value.hashedPassword,
        },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      // Create 3 welcome tasks using createMany
      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: newUser.id,
          priority: "medium",
        },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // Fetch the created tasks to return them
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return { user: newUser, welcomeTasks };
    });

    const csrfToken = setJwtCookie(req, res, result.user);

    res.status(201).json({
      user: { name: result.user.name, email: result.user.email },
      csrfToken,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
    return;
  } catch (err) {
    // the email might already be registered
    if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      return res.status(400).json({ message: err.message });
    } else {
      return next(err);
    }
  }
};

const logon = async (req, res, next) => {
  const { email, password } = req.body;
  const lowerEmail = email.toLowerCase();
  // const result = await pool.query("SELECT * FROM users WHERE email = $1", [
  //   email,
  // ]);
  const existingUser = await prisma.user.findUnique({
    where: { email: lowerEmail },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      hashedPassword: true,
    },
  });

  if (
    !existingUser ||
    !(await comparePassword(password, existingUser.hashedPassword))
  ) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  const csrfToken = setJwtCookie(req, res, existingUser);

  res.status(StatusCodes.OK).json({
    name: existingUser.name,
    email: existingUser.email,
    csrfToken,
    message: "User verified",
  });
};

const logoff = (req, res) => {
  res.clearCookie("jwt", cookieFlags(req));
  return res.status(StatusCodes.OK).json({ message: "User log off." });
};

module.exports = { register, logon, logoff, googleLogon };
