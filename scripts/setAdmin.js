// scripts/setAdmin.js
//   node scripts/setAdmin.js sol@plumbum.com         → grant
//   node scripts/setAdmin.js sol@plumbum.com --revoke → revoke

const prisma = require("../db");


async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");
  if (!email) throw new Error("Pass the user's email");

  // adjust the relation if your User→Profile shape differs
  const user = await prisma.user.findFirst({
    where: { email: { equals: email } },
    include: { profiles: true },
  });
  if (!user) throw new Error(`No user with email ${email}`);

  const profile = user.profiles[0];
  await prisma.profile.update({
    where: { id: profile.id },
    data: { isAdmin: !revoke },
  });
  console.log(`${revoke ? "Revoked" : "Granted"} admin: ${email} (profile ${profile.id})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());