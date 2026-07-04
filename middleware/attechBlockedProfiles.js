
const prisma = require("../db");

async function attachBlockedProfiles(req, res, next) {
  try {
    const profileId = req.user?.profiles?.[0]?.id;

    if (!profileId) {
      req.blockedProfileIds = [];
    //   console.log("attachBlockedProfiles: no profileId, blockedProfileIds = []");
      return next();
    }

    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerProfileId: profileId },
          { blockedProfileId: profileId },
        ],
      },
      select: { blockerProfileId: true, blockedProfileId: true },
    });

    // console.log("attachBlockedProfiles: blocks from DB =", blocks);

    const ids = new Set();
    blocks.forEach((b) => {
      ids.add(b.blockerProfileId === profileId ? b.blockedProfileId : b.blockerProfileId);
    });

    req.blockedProfileIds = [...ids];
  
    next();
  } catch (error) {
    console.log("attachBlockedProfiles error:", error);
    req.blockedProfileIds = []; // fail open — don't break the request over a filtering lookup
    next();
  }
}

module.exports = attachBlockedProfiles;