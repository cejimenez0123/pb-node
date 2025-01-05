const prisma = require("../db")
const calculateStoryLimit = require("./calculateStoryLimitMiddleware")
const asyncHandler = require('express-async-handler');
const updateWriterLevelMiddleware = asyncHandler(async (req, res, next) => {
    
  try {  
  const userId = req.user.id;

      // Fetch user profile and engagement data
      const userProfile = await prisma.profile.findFirst({
        where:{userId:{equals:userId}} ,
        include: {
          comments: { where: { 
            hashtags:{
              some:{}
            }
          }}
          ,stories: { where: { isPrivate:{equals:false}}},
        },
      });
  
      // Calculate current engagement metrics
      const reviewCount = await prisma.story.count({
        where: { 
          comments:{
            some:{
              profileId:userId
            }
          }
           },
      });
  
      const commentCount = userProfile.comments.length;
      const helpfulCommentCount = userProfile.comments.filter(c => c.isHelpful).length;
      const publicStoryCount = userProfile.stories.length;
  
      const engagementData = {
        reviews: reviewCount,
        comments: commentCount,
        helpfulComments: helpfulCommentCount,
        isSubscribed: false
      };
  
      const newStoryLimit = calculateStoryLimit(userProfile, engagementData);
      req.engagementData = engagementData
      req.storyLimit = newStoryLimit
      req.user = req.user
      req.profile = userProfile
      // Update writer level only if the new limit differs from the current level
      if (newStoryLimit !== userProfile.writerLevel) {
        await prisma.profile.update({
          where: { id: userProfile.id },
          data: { writerLevel: newStoryLimit },
        });
      }

      
  
      next(); // Continue to the next middleware or route handler
    } catch (error) {
      console.error('Error updating writer level:', error);
      res.status(500).json({ error: 'Internal server error' });
      next(error)
    }
  });
  
module.exports = updateWriterLevelMiddleware