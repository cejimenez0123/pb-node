const prisma = require("../db");
const BearerStrategy = require('passport-http-bearer').Strategy;
const jwt = require('jsonwebtoken');
function setUpPassportLocal(passport){
passport.use(new BearerStrategy(async (token, done) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.uId;
    const user = await prisma.user.findFirst({ where: { uId: userId } });
    
    if (!user) {
      return done(null, false); // Invalid token or user not found
    }
    done(null,user);
  } catch (error) {
    done(error); // Handle errors gracefullyc
  }
}))
passport.serializeUser((user, done) => {
  done(null, user.id); // Store only user ID in session (important for CSRF protection)
});

passport.deserializeUser((id, done) => {
  prisma.user.findUnique({ where: { id } }) // Fetch user data from DB
    .then(user => done(null, user))
    .catch(error => done(error));
});

}

function checkIfAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      next();
    } else {
      return res.redirect("/login");
    }
  }

module.exports = { checkIfAuthenticated,setUpPassportLocal}