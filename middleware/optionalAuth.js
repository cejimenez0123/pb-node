
// const jwt = require("jsonwebtoken");

// module.exports = async function optionalAuth(req, res, next) {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader?.startsWith("Bearer ")) {
//       req.user = null; // or { profiles: [] }
//       return next();
//     }

//     const token = authHeader.split(" ")[1];
//     const payload = jwt.verify(token, process.env.JWT_SECRET);

//     // Adapt to your token shape
//     req.user = {
//       id: payload.userId,          // or whatever you use
//       profiles: payload.profiles || [], 
//     };

//     next();
//   } catch (err) {
//     req.user = null;
//     next();
//   }
// };
const jwt = require("jsonwebtoken");
const prisma = require("../db");

module.exports = async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const profiles = await prisma.profile.findMany({
      where: { userId: payload.userId },
      select: { id: true },
    });

    req.user = {
      id: payload.userId,
      profiles,
    };
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};