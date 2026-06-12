// scripts/checkHashtag.js   →   node scripts/checkHashtag.js plumbumprompt
const prisma = require("../db");
async function main() {
  const name = process.argv[2];
  const rows = await prisma.hashtag.findMany({
    where: name ? { name: { equals: name.toLowerCase() } } : undefined,
    select: { id: true, name: true, isReserved: true, created: true },
    take: 20,
  });
  console.table(rows);
}
main().catch(console.error).finally(() => prisma.$disconnect());