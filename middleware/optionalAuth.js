// middleware/optionalAuth.js
const passport = require("passport");

function optionalAuth(req, res, next) {
  passport.authenticate("bearer", { session: false }, (err, user) => {
    req.user = user || null; // no error, no 401 — just attach if present
    next();
  })(req, res, next);
}

module.exports = optionalAuth;