const express = require("express");
const session = require("express-session");
const path = require("path");
const app = express();

// Parse form data (so req.body works on POSTed forms — login, add, delete)
app.use(express.urlencoded({ extended: true }));

// Use Pug as the template engine, and say where the views live
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Serve static files (CSS) from /public
app.use(express.static(path.join(__dirname, "public")));

// ── Sessions ──────────────────────────────────────────────
// This is what lets the server REMEMBER a logged-in user between
// requests. It stores the data server-side and hands the browser a
// small session-id cookie that rides along on every request.
app.use(session({
    secret: "change-me-in-production",  // signs the session-id cookie
    resave: false,
    saveUninitialized: false            // don't create sessions until login
}));

// Make the logged-in user available to EVERY view as `user`.
// (res.locals is merged into the locals of every res.render call.)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ── Routes ────────────────────────────────────────────────
app.use("/", require("./routes/auth"));    // /login, /logout
app.use("/", require("./routes/anime"));   // /, /add, /anime/:id ...

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
