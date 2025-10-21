
const passport = require('passport');
const prisma = require('../db');
const BearerStrategy = require('passport-http-bearer').Strategy;
const jwt = require('jsonwebtoken');

// Set up Passport with Bearer strategy
function setUpPassportLocal(passport) {
  passport.use(
    new BearerStrategy(async (token, done) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify JWT

        // Find user in the database
        const user = await prisma.user.findFirst({
          where: { id: decoded.userId },include:{
            profiles:true
          }
        });
      
        if (!user) {
          return done(null, false); // Invalid token or user not found
        }

        done(null, user);
      } catch (error) {
        done(error); // Handle errors gracefully
      }
    })
  );

  passport.serializeUser((user, done) => {

    done(null, user.id); // Store only user ID in session
  });

  passport.deserializeUser(async (id, done) => {
    try {
    
      const user = await prisma.user.findUnique({ where: { id },include:{
        profiles:true
      }});
console.log("passport user",user)
      done(null, user);
    } catch (error) {
      console.log("passport err",err)
      done(error);
    }
  });
}

function checkIfAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    return res.redirect('/login');
  }
}

module.exports = {setUpPassportLocal, checkIfAuthenticated };
