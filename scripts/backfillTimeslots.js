const prisma = require("../db");


async function main() {
  // MongoDB: updateMany where the field doesn't exist yet
  const result = await prisma.$runCommandRaw({
    update: 'Profile',
    updates: [
      {
        q: { writingSprintSlots: { $exists: false } },
        u: { $set: { writingSprintSlots: [] } },
        multi: true,
      },
    ],
  });

  console.log('Backfill result:', JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());