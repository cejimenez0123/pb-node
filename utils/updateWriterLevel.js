const prisma = require("../db")

const updateWriterLevel = async (userId, newLimit) => {
    await prisma.profile.update({
      where: { id: userId },
      data: { writerLevel: newLimit },
    });
  };

 module.exports = updateWriterLevel