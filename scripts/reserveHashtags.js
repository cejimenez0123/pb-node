// scripts/reserveHashtags.js
//   node scripts/reserveHashtags.js plumbumprompt prompt
// Flags the named tags as reserved (admin-only to attach).
const prisma = require("../db");

async function main() {
  const names = process.argv.slice(2).map(n => n.toLowerCase());
  if (!names.length) throw new Error("Pass one or more hashtag names");

  const result = await prisma.hashtag.updateMany({
    where: { name: { in: names } },
    data: { isReserved: true },
  });
  console.log(`Reserved ${result.count} tag(s): ${names.map(n => "#" + n).join(", ")}`);
}

main().catch(e => { console.error(e); process.exitCode = 1; })
      .finally(() => prisma.$disconnect());