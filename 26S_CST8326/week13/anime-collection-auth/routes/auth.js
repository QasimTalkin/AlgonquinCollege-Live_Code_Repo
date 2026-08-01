const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");

// The login/logout feature lives in its own router file.
router.get("/login", auth.showLogin);    // show the form
router.post("/login", auth.login);        // handle the form → start session
router.post("/logout", auth.logout);      // end the session

module.exports = router;
