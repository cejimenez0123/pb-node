// // middleware/optionalAuth.js
// const passport = require("passport");

// function optionalAuth(req, res, next) {
//   passport.authenticate("bearer", { session: false }, (err, user) => {
//     req.user = user || null; // no error, no 401 — just attach if present
//     next();
//   })(req, res, next);
// }

// module.exports = optionalAuth;

// middleware/optionalAuth.js
const jwt = require("jsonwebtoken");

module.exports = async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      req.user = null; // or { profiles: [] }
      return next();
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Adapt to your token shape
    req.user = {
      id: payload.userId,          // or whatever you use
      profiles: payload.profiles || [], 
    };

    next();
  } catch (err) {
    req.user = null;
    next();
  }
};