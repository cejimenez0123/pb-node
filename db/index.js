const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
console.log('Prisma initialized');
module.exports = prisma