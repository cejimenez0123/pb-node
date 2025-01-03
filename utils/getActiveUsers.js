import prisma from "../db"
module.exports = getActiveUsers = async () => {
    try{
    const users = await prisma.user.findMany({
      where: { isActive: true },
    });
    return users;

}catch(error){
    res.json({error})
}
  }