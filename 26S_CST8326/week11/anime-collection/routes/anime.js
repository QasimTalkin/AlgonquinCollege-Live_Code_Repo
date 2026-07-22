const express = require("express");
const router = express.Router();
const animeController = require("../controllers/animeController");

// Each route points at a controller function (the "C" in MVC).
// The router only decides WHICH function runs for WHICH URL + method.

router.get("/", animeController.index);                    // list all
router.get("/add", animeController.addForm);               // show add form
router.post("/add", animeController.create);               // handle add form
router.get("/anime/:id", animeController.details);         // show one
router.post("/anime/:id/delete", animeController.remove);  // delete one

module.exports = router;
