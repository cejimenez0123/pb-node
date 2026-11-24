const verificationToken = jwt.sign(
  {
    type: "referral-email-verification",
    referralId,
    email: normalizedEmail,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "30m",
    jwtid: crypto.randomUUID(),
  }
);
module.exports = verificationToken