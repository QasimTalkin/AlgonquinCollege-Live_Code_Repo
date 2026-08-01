// A route guard (middleware). Put it in front of any route that should
// only work for logged-in users. If there's a user on the session, let the
// request continue (next()); otherwise bounce them to the login page.
module.exports = function requireLogin(req, res, next) {
    if (req.session.user) return next();
    res.redirect("/login");
};
