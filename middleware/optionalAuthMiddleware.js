function optionalAuthMiddleware(req, res, next) {
  passport.authenticate(
    "bearer",
    { session: false },
    (err, user) => {
      if (err) return next(err);

      // A visitor without a valid user remains a guest.
      if (user) {
        req.user = user;
      }

      next();
    }
  )(req, res, next);
}
module.exports = optionalAuthMiddleware