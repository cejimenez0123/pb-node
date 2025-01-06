// const prisma = require("../db");
// const BearerStrategy = require('passport-http-bearer').Strategy;
// const jwt = require('jsonwebtoken');

// function setUpPassportLocal(passport){
// passport.use(new BearerStrategy(async (token, done) => {
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
//     const user = await prisma.user.findFirst({ where: { id:{
//       equals:decoded.userId
//     }} });
    
//     if (!user) {
//       return done(null, false); // Invalid token or user not found
//     }

//     done(null,user);
//   } catch (error) {
//     done(error); // Handle errors gracefullyc
//   }
// }))
// passport.serializeUser((user, done) => {
//   done(null, user.id); // Store only user ID in session (important for CSRF protection)
// });

// passport.deserializeUser((id, done) => {
//   prisma.user.findUnique({ where: { id } }) // Fetch user data from DB
//     .then(user => done(null, user))
//     .catch(error => done(error));
// });

// }

// function checkIfAuthenticated(req, res, next) {
//     if (req.isAuthenticated()) {
//       next();
//     } else {
//       return res.redirect("/login");
//     }
//   }

// module.exports = { checkIfAuthenticated,setUpPassportLocal}
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
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

// Auth middleware

// Ensure user is authenticated for protected routes
function checkIfAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    return res.redirect('/login');
  }
}
// function authMiddleware(req, res, next) {
//   passport.authenticate('bearer', { session: false }, (err, user, info) => {
//     if (err) return next(err); // Handle errors gracefully
//     if (!user) return res.status(401).json({ error: 'Unauthorized' });
//     req.user = user; 
//     next();
//   })(req, res, next);
// }

module.exports = {setUpPassportLocal, checkIfAuthenticated };
