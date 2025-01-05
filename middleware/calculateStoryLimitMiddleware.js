const prisma = require("../db")
const asyncHandler = require('express-async-handler');

// const calculateStoryLimit = asyncHandler(async (req, res, next) => {
//   try {
//     console.log("req",req)
//     console.log("Res",res)
//         if (!req.user) {
//       return res.status(401).json({ error: 'User not authenticated' });
//     }
//     const userId = req.user.id; 
  
//     const user = await prisma.profile.findFirst({
//       where:{userId:{equals:userId}},include:{
//             comments: {
//               where: { hashtags:{
//                 some:{}
//               } },
//             },
//             stories: {
//               where: { isPrivate: {equals:false} },
//             }}
//     })
      

//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     // Base story-sharing limit
//     let storyLimit = user.writerLevel * 8; // Example: 8 stories per writer level

//     // Additional shares for helpful comments
//     storyLimit += Math.floor(user.comments.length * 0.2 * 8); // 20% per helpful comment

//     // Check if the user is a premium subscriber
//     if (user.rolesToCollection.some(role => role.role === 'subscriber')) {
//       storyLimit += Math.floor(storyLimit * 0.5); // Add 50% for premium users
//     }

//     // Attach the calculated story limit to the request object
//     req.storyLimit = storyLimit;

//     next(); // Pass control to the next middleware or route handler
//   } catch (error) {
//     console.error('Error in calculateStoryLimitMiddleware:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });
const calculateStoryLimit = (user, engagementData) => {
  const { reviews, comments, helpfulComments, isSubscribed } = engagementData;

  // Points calculation
  const reviewPoints = reviews * 5;
  const commentPoints = comments * 2;
  const helpfulPoints = helpfulComments * 5;
  const subscriptionBoost = isSubscribed ? 0.5 : 0;

  // Base limit
  const baseLimit = 8;

  // Calculate total points
  const totalPoints = reviewPoints + commentPoints + helpfulPoints;

  // Additional stories unlocked
  const additionalStories = Math.floor(totalPoints / 20) * 8;

  // Helpful comments multiplier (20-40%)
  const helpfulBoost = helpfulComments > 0 ? additionalStories * 0.3 : 0;

  // Final story limit
  const limit = baseLimit + additionalStories + helpfulBoost;

  // Apply subscription boost
  return Math.floor(limit * (1 + subscriptionBoost));
};

module.exports = calculateStoryLimit
