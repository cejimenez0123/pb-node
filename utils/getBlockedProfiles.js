// utils/getBlockedProfileIds.js

const prisma = require("../db");


async function getBlockedProfileIds(profileId) {
  if (!profileId) return [];

  const blocks = await prisma.block.findMany({
    where: {
      OR: [
        { blockerProfileId: profileId },
        { blockedProfileId: profileId },
      ],
    },
    select: { blockerProfileId: true, blockedProfileId: true },
  });

  const ids = new Set();
  blocks.forEach((b) => {
    ids.add(b.blockerProfileId === profileId ? b.blockedProfileId : b.blockerProfileId);
  });
  return [...ids];
}

module.exports = getBlockedProfileIds;