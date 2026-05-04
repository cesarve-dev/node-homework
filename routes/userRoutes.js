const express = require("express");

const router = express.Router();
const { register, logon, logoff } = require("../controllers/userController");

router.route("/logon").post(logon);
router.route("/register").post(register);
router.route("/logoff").post(logoff);

module.exports = router;
