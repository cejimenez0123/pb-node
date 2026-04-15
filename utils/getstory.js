const prisma = require("../db");

const getStory = async (storyId)=>{
     const story = await prisma.story.findFirst({
      where: { id: storyId },
      include: {
        author: {
      select: { id: true, username: true },
    },
   
        hashtags: {
          include: { hashtag: true },
        },
        comments: {
          include: { profile: true, parent: true },
        },
        betaReaders: {
          select: {
            id:true,
            profileId: true,
            role:true,
            profile:true
          },
        },
      },
    });
    return story
}
module.exports = getStory