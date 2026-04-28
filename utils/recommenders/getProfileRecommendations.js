const prisma = require("../../db");

async function getProfileRecommendations(profileId, limit = 10) {
  const LIMIT = parseInt(limit);

  const sourceProfile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      following: { select: { followingId: true } },
      profileToCollections: { select: { collectionId: true } },
      followedHashtags: { select: { hashtagId: true } },
      hashtags: { select: { hashtagId: true } },
    },
  });

  if (!sourceProfile) return [];

  const followingIds = new Set(sourceProfile.following.map((f) => f.followingId));
  const collectionIds = new Set(sourceProfile.profileToCollections.map((p) => p.collectionId));
  const hashtagIds = new Set([
    ...sourceProfile.followedHashtags.map((h) => h.hashtagId),
    ...sourceProfile.hashtags.map((h) => h.hashtagId),
  ]);

  const candidates = await prisma.profile.findMany({
    where: {
      id: { notIn: [profileId, ...Array.from(followingIds)] },
      isActive: true,
    },
    include: {
      following: { select: { followingId: true } },
      profileToCollections: { select: { collectionId: true } },
      followedHashtags: { select: { hashtagId: true } },
      hashtags: { select: { hashtagId: true } },
    },
  });

  const W_MUTUAL_FOLLOW = 40;
  const W_FOLLOWED_BY   = 35;
  const W_COLLECTION    = 25;
  const W_HASHTAG       = 15;
  const W_DIVERSITY     = 10;

  const scoredCandidates = candidates.map((candidate) => {
    let score = 0;

    const candidateFollowingIds = new Set(candidate.following.map((f) => f.followingId));
    const mutualFollowOverlap = [...followingIds].filter((id) => candidateFollowingIds.has(id)).length;
    score += mutualFollowOverlap * W_MUTUAL_FOLLOW;

    const isFollowedByNetwork = [...followingIds].some((id) => candidateFollowingIds.has(id)) ? 1 : 0;
    score += isFollowedByNetwork * W_FOLLOWED_BY;

    const candidateCollectionIds = new Set(candidate.profileToCollections.map((p) => p.collectionId));
    const sharedCollections = [...collectionIds].filter((id) => candidateCollectionIds.has(id)).length;
    score += sharedCollections * W_COLLECTION;

    const candidateHashtagIds = new Set([
      ...candidate.followedHashtags.map((h) => h.hashtagId),
      ...candidate.hashtags.map((h) => h.hashtagId),
    ]);
    const sharedHashtags = [...hashtagIds].filter((id) => candidateHashtagIds.has(id)).length;
    score += sharedHashtags * W_HASHTAG;

    const totalOverlap = mutualFollowOverlap + sharedCollections + sharedHashtags;
    if (totalOverlap === 0) score += W_DIVERSITY;

    return { profile: candidate, score };
  });

  const mainstream = scoredCandidates.filter((c) => c.score > W_DIVERSITY);
  const wildcards  = scoredCandidates.filter((c) => c.score === W_DIVERSITY);

  return [
    ...mainstream.sort((a, b) => b.score - a.score).slice(0, LIMIT - 2),
    ...wildcards.sort(() => Math.random() - 0.5).slice(0, 2),
  ]
    .slice(0, LIMIT)
    .map(({ profile, score }) => {
      const { following, profileToCollections, followedHashtags, hashtags, ...safe } = profile;
      return { ...safe, _score: score };
    });
}

module.exports = getProfileRecommendations;