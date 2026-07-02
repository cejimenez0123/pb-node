// scripts/backfillVerifiedUsers.js
const prisma = require("../db"); // adjust path to match your actual db import

async function main() {
  const usersWithProfiles = await prisma.user.findMany({
    where: {
   
      profiles: { some: {} }, // has at least one profile
    },
    select: { id: true, email: true },
  });

  console.log(`Found ${usersWithProfiles.length} unverified users with existing profiles.`);

  if (usersWithProfiles.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  const result = await prisma.user.updateMany({
    where: {
      id: { in: usersWithProfiles.map(u => u.id) },
    },
    data: { verified: true },
  });

  console.log(`Updated ${result.count} users to verified: true.`);
  usersWithProfiles.forEach(u => console.log(`  - ${u.email}`));
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });