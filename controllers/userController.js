const StatusCodes = require("http-status-codes");

const register = (req, res) => {
  const newUser = { ...req.body };
  global.users.push(newUser);
  global.user_id = newUser;
  // delete newUser.password;
  res.status(StatusCodes.CREATED).json(newUser);
};

const logon = (req, res) => {
  const { email, password } = req.body;
  const existingUser = global.users.find((user) => user.email === email);

  if (!existingUser || existingUser.password !== password) {
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
