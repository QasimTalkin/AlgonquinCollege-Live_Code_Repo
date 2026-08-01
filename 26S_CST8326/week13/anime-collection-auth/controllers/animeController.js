const fs = require("fs");
const path = require("path");

// Where our "database" file lives
const dataPath = path.join(__dirname, "..", "data", "anime.json");

// MODEL: read the JSON file into memory once, when the server starts
let animeList = JSON.parse(fs.readFileSync(dataPath, "utf8"));
let nextId = Math.max(0, ...animeList.map(a => a.id)) + 1;

// GET /  → show the whole collection (public — anyone can browse)
exports.index = (req, res) => {
    res.render("index", {
        title: "My Anime Collection",
        anime: animeList
    });
};

// GET /anime/:id  → show one anime's details (public)
exports.details = (req, res) => {
    const anime = animeList.find(a => a.id === Number(req.params.id));
    if (!anime) {
        return res.status(404).render("index", {
            title: "Not found",
            anime: animeList
        });
    }
    res.render("details", { title: anime.title, anime });
};

// GET /add  → show the "add" form (protected by requireLogin in the router)
exports.addForm = (req, res) => {
    res.render("add", { title: "Add anime" });
};

// POST /add  → create a new anime, then go back to the list (protected)
exports.create = (req, res) => {
    const anime = {
        id: nextId++,
        title: req.body.title,
        rating: Number(req.body.rating)
    };
    animeList.push(anime);
    res.redirect("/");
};

// POST /anime/:id/delete  → remove an anime, then go back (protected)
exports.remove = (req, res) => {
    animeList = animeList.filter(a => a.id !== Number(req.params.id));
    res.redirect("/");
};
