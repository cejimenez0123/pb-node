const prisma = require("../../db");


async function getHashtagCollectionRecommendations(hashtagIds, skip = 0, take = 20, excludeCollectionIds = []) {
  if (!hashtagIds?.length) return { items: [], totalCount: 0 };

  // Fetch all public collections that have at least one of these hashtags
  const candidates = await prisma.collection.findMany({
    where: {
      isPrivate: false,
      isGlobal: true,
      id: { notIn: excludeCollectionIds },
      hashtags: {
        some: {
          hashtagId: { in: hashtagIds },
        },
      },
    },
    include: {
      hashtags:    { select: { hashtagId: true } },
      favedBy:     { select: { profileId: true } },
      storyIdList: { select: { storyId: true } },
      profile: {
        select: { id: true, username: true, profilePic: true },
      },
    },
  });

  // Fetch diversity wildcards — public collections with none of these hashtags
  const matchedIds = candidates.map((c) => c.id);
  const wildcardPool = await prisma.collection.findMany({
    where: {
      isPrivate: false,
      isGlobal: true,
      id: { notIn: [...excludeCollectionIds, ...matchedIds] },
      hashtags: {
        none: {
          hashtagId: { in: hashtagIds },
        },
      },
    },
    take: 10, // small pool, we shuffle and pick 2
    include: {
      hashtags:    { select: { hashtagId: true } },
      favedBy:     { select: { profileId: true } },
      storyIdList: { select: { storyId: true } },
      profile: {
        select: { id: true, username: true, profilePic: true },
      },
    },
  });

  const W_HASHTAG  = 40; // per overlapping hashtag
  const W_POPULAR  = 10; // member count signal
  const W_DIVERSITY = 8; // wildcard

  const hashtagSet = new Set(hashtagIds);

  const scoredMainstream = candidates.map((collection) => {
    let score = 0;

    // 1. Hashtag overlap — more shared hashtags = higher score
    const colHashtagIds = new Set(collection.hashtags.map((h) => h.hashtagId));
    const overlap = [...colHashtagIds].filter((id) => hashtagSet.has(id)).length;
    score += overlap * W_HASHTAG;

    // 2. Popularity — normalize, cap contribution
    const memberCount = collection.favedBy.length;
    score += Math.min(memberCount / 10, 1) * W_POPULAR;

    return { collection, score };
  });

  const scoredWildcards = wildcardPool
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
    .map((collection) => ({ collection, score: W_DIVERSITY }));

  const ranked = [
    ...scoredMainstream.sort((a, b) => b.score - a.score),
    ...scoredWildcards,
  ];

  const totalCount = ranked.length;

  const items = ranked
    .slice(skip, skip + take)
    .map(({ collection, score }) => {
      const { hashtags, favedBy, storyIdList, ...safe } = collection;
      return {
        ...safe,
        _score:      score,
        memberCount: favedBy.length,
        storyCount:  storyIdList.length,
      };
    });

  return { items, totalCount };
}

module.exports = getHashtagCollectionRecommendations;