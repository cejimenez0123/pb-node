const prisma = require("../db")
const calculateStoryLimit = (user, engagementData) => {
  const { collections, comments, helpfulComments, isSubscribed } = engagementData;

  // Points calculation
  const collectionPoints = collections * 6;
  const commentPoints = comments * 2.5;
  const helpfulPoints = helpfulComments * 5;
  const subscriptionBoost = isSubscribed ? 0.5 : 0;

  // Base limit
  const baseLimit = 8;

  // Calculate total points
  const totalPoints = collectionPoints + commentPoints + helpfulPoints;

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
