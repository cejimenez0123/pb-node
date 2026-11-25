const prisma = require('../db');
async function main() {

        await prisma.user.updateMany({data:{
            applicationStatus:"APPROVED"
        }})
}


main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());