const bcrypt = require("bcryptjs");

// A tiny in-memory "users table". In a real app these would live in a
// database (Week 12 — MongoDB). We NEVER store the raw password: we hash it
// with bcrypt. Here we hash the demo password once, at startup.
//
//   demo account →  username: sensei   password: anime123
//
const users = [
    { username: "sensei", passwordHash: bcrypt.hashSync("anime123", 10) }
];

// GET /login  → show the login form
exports.showLogin = (req, res) => {
    res.render("login", { title: "Log in", error: null });
};

// POST /login  → check the credentials, then start a session
exports.login = (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);

    // compareSync hashes the typed password and checks it against the stored
    // hash — we never decrypt anything.
    if (user && bcrypt.compareSync(password, user.passwordHash)) {
        req.session.user = { username: user.username };   // ← now logged in
        return res.redirect("/");
    }

    // wrong username or password → re-show the form with an error
    res.status(401).render("login", {
        title: "Log in",
        error: "Wrong username or password."
    });
};

// POST /logout  → destroy the session, then go home
exports.logout = (req, res) => {
    req.session.destroy(() => res.redirect("/"));
};
