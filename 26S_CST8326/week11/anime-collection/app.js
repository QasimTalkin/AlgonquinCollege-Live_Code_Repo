const express = require("express");
const path = require("path");
const app = express();

// Parse form data (so req.body works on POSTed forms)
app.use(express.urlencoded({ extended: true }));

// Tell Express to use Pug as the template engine
app.set("view engine", "pug");

// Tell Express where the templates (views) live
app.set("views", path.join(__dirname, "views"));

// Serve static files (CSS, images) from /public
app.use(express.static(path.join(__dirname, "public")));

// Mount the anime routes at the root path
const animeRoutes = require("./routes/anime");
app.use("/", animeRoutes);

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
