// scripts/clearDeviceTokens.js
require('dotenv').config({ path: '../.env' });
const prisma = require('../db');

async function main() {
  const result = await prisma.deviceToken.deleteMany({});
  console.log(`Deleted ${result.count} stale tokens`);
}

main().catch(console.error).finally(() => prisma.$disconnect());