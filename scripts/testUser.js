// scripts/createTestUser.js
// Usage: node scripts/createTestUser.js [suffix]
// e.g. node scripts/createTestUser.js 42
//      → creates testuser_42@example.com with password "test"


const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const createNewProfileUser = require("../utils/createNewProfileUser");
const prisma = require("../db");



const SUFFIX = process.argv[2] || Math.random().toString(36).slice(2, 7);
// const EMAIL = `testuser_${SUFFIX}@example.com`;
const EMAIL = `testuser@example.com`;
const PASSWORD = "test";
const USERNAME = `testuser`;
// const USERNAME = `testuser_${SUFFIX}`;
const PREFERRED_NAME = `Test User ${SUFFIX}`;

async function main() {
  console.log("Creating test user:", { EMAIL, USERNAME });

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { profiles: true },
  });

  if (existingUser) {
    if (existingUser.profiles.length > 0) {
      console.log("User already exists with profile:");
      const profile = existingUser.profiles[0];
      const token = jwt.sign(
        { userId: existingUser.id, profileId: profile.id },
        process.env.JWT_SECRET || "dev-secret"
      );
      console.log({
        userId: existingUser.id,
        profileId: profile.id,
        email: existingUser.email,
        username: profile.username,
        token,
      });
   
      return;
    } else {
      console.log("User exists but has no profile; deleting to recreate...");
      await prisma.user.delete({ where: { id: existingUser.id } });
    }
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  // 3. Create user
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      password: hashedPassword,
      preferredName: PREFERRED_NAME,
      verified: true,
      subscription: "basic",
      emailFrequency: 1,
    },
    include: { profiles: true },
  });

  console.log("User created:", { id: user.id, email: user.email });

  // 4. Create profile using your existing helper
  // Adjust fields to match your helper signature.
  const profile = await createNewProfileUser({
    username: USERNAME,
    profilePicture: null,
    selfStatement: "Test account for blocking/reporting tests.",
    isPrivate: false,
    userId: user.id,
    writingSprintSlots: [],
  });

  console.log("Profile created:", { id: profile.id, username: profile.username });

  // 5. Create a JWT like your login route does
  const token = jwt.sign(
    { userId: user.id, profileId: profile.id },
    process.env.JWT_SECRET || "dev-secret"
  );

  console.log("\n=== TEST USER READY ===");
  console.log("Email:", EMAIL);
  console.log("Password:", PASSWORD);
  console.log("Username:", USERNAME);
  console.log("User ID:", user.id);
  console.log("Profile ID:", profile.id);
  console.log("JWT token:", token);
  console.log("======================\n");


}


main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());