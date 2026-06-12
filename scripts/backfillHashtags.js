// scripts/backfillHashtagCreated.js
const prisma = require("../db");

async function main() {
  const tags = await prisma.hashtag.findMany({
    where: { created: null },
    select: { id: true, name: true },
  });

  for (const t of tags) {
    // first 8 hex chars of an ObjectID = unix seconds of creation
    const seconds = parseInt(t.id.substring(0, 8), 16);
    const created = new Date(seconds * 1000);
    await prisma.hashtag.update({ where: { id: t.id }, data: { created } });
    console.log(`#${t.name.padEnd(16)} → ${created.toISOString()}`);
  }
  console.log(`\nBackfilled ${tags.length} tag(s).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());