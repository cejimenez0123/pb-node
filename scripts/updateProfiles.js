const prisma = require('../db');

async function main() {
    await prisma.user.updateMany({where:{applicationStatus:{
        equals:"PENDING"
    }
    },data:{
        applicationStatus:"APPROVED"
    }})

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());