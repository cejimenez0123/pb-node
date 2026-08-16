const prisma = require('../db');

async function main() {
  const unverifiedUsers = await prisma.user.findMany({
    where: { verified: false }, // adjust field name to match your schema
    select: { email: true },
  });

  const emails = unverifiedUsers.map((user) => user.email);

  console.log(emails);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());