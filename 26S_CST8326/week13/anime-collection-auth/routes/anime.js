const express = require("express");
const router = express.Router();
const animeController = require("../controllers/animeController");
const requireLogin = require("../middleware/requireLogin");

// Public routes — anyone can browse the collection.
router.get("/", animeController.index);                     // list all
router.get("/anime/:id", animeController.details);          // show one

// Protected routes — requireLogin runs FIRST. If you're not logged in it
// redirects you to /login before the controller ever runs.
router.get("/add", requireLogin, animeController.addForm);              // show add form
router.post("/add", requireLogin, animeController.create);             // handle add form
router.post("/anime/:id/delete", requireLogin, animeController.remove); // delete one

module.exports = router;
