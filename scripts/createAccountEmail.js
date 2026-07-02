const prisma = require('../db');
const approvalTemplate = require('../html/approvalTemplate')
var email = "thebutterflyprojectnyc@proton.me"
async function main() {
const user = prisma.user.findFirst({where: {email: email}}).then((user) => {
  if (!user) {
    console.error(`No user found with email: ${email}`);
    return;
  }
  const emailContent = approvalTemplate(user);
  console.log(emailContent);
}).catch((error) => {
  console.error('Error fetching user:', error);
});

}


main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());