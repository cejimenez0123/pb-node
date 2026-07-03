const prisma = require("../db");

// middleware/requireModeration.js
async function requireModerator(req, res, next) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user.profiles[0].id },
      select: {  isAdmin: true },
    });
console.log("requireModerator profile:", profile);
    if ( !profile?.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    next();
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Authorization check failed" });
  }
}

module.exports = requireModerator;