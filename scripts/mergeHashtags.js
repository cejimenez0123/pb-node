// scripts/mergeHashtags.js
//
//   node scripts/mergeHashtags.js list            → show all tags + usage, spot dupes
//   node scripts/mergeHashtags.js list poe         → only tags containing "poe"
//   node scripts/mergeHashtags.js merge <fromId> <toId>   → merge first into second
//

const prisma = require("../db");


async function list(filter) {
  const tags = await prisma.hashtag.findMany({
    where: filter ? { name: { contains: filter, mode: "insensitive" } } : undefined,
    include: {
      _count: { select: { stories: true, collections: true, comments: true, followers: true } },
    },
  });

  // sort by total usage so the canonical (most-used) version is obvious
  tags.sort((a, b) => total(b) - total(a));

  console.log(`\n${tags.length} hashtag(s):\n`);
  for (const t of tags) {
    const c = t._count;
    console.log(
      `${t.id}  #${t.name.padEnd(20)} ` +
      `stories:${c.stories}  collections:${c.collections}  comments:${c.comments}  followers:${c.followers}`
    );
  }
  console.log("");
}

function total(t) {
  const c = t._count;
  return c.stories + c.collections + c.comments + c.followers;
}

async function merge(fromId, toId) {
  if (!fromId || !toId) throw new Error("Usage: merge <fromId> <toId>");
  if (fromId === toId)  throw new Error("Cannot merge a hashtag into itself");

  const [from, to] = await Promise.all([
    prisma.hashtag.findUnique({ where: { id: fromId } }),
    prisma.hashtag.findUnique({ where: { id: toId } }),
  ]);
  if (!from) throw new Error(`fromId ${fromId} not found`);
  if (!to)   throw new Error(`toId ${toId} not found`);

  console.log(`\nMerging #${from.name} → #${to.name} ...\n`);

  const moved = { stories: 0, collections: 0, comments: 0, followers: 0 };
  const deduped = { stories: 0, collections: 0, comments: 0, followers: 0 };

  // helper: for join tables keyed by an auto id (story / collection / comment)
  async function mergeJoin(model, scopeField) {
    const links = await prisma[model].findMany({ where: { hashtagId: fromId } });
    for (const link of links) {
      const dupe = await prisma[model].findFirst({
        where: { hashtagId: toId, [scopeField]: link[scopeField], profileId: link.profileId },
      });
      if (dupe) {
        await prisma[model].delete({ where: { id: link.id } });
        deduped[keyFor(model)]++;
      } else {
        await prisma[model].update({ where: { id: link.id }, data: { hashtagId: toId } });
        moved[keyFor(model)]++;
      }
    }
  }

  await mergeJoin("hashtagStory", "storyId");
  await mergeJoin("hashtagCollection", "collectionId");
  await mergeJoin("hashtagComment", "commentId");

  // followers use the composite unique key (hashtagId, followerId)
  const followers = await prisma.hashtagFollower.findMany({ where: { hashtagId: fromId } });
  for (const f of followers) {
    const dupe = await prisma.hashtagFollower.findFirst({
      where: { hashtagId: toId, followerId: f.followerId },
    });
    const where = { hashtagId_followerId: { hashtagId: fromId, followerId: f.followerId } };
    if (dupe) {
      await prisma.hashtagFollower.delete({ where });
      deduped.followers++;
    } else {
      await prisma.hashtagFollower.update({ where, data: { hashtagId: toId } });
      moved.followers++;
    }
  }

  await prisma.hashtag.delete({ where: { id: fromId } });

  console.log("Moved:   ", moved);
  console.log("Deduped: ", deduped);
  console.log(`\nDone. #${from.name} deleted, everything now lives on #${to.name}.\n`);
}

function keyFor(model) {
  return { hashtagStory: "stories", hashtagCollection: "collections", hashtagComment: "comments" }[model];
}

async function main() {
  const [, , cmd, a, b] = process.argv;
  if (cmd === "list") await list(a);
  else if (cmd === "merge") await merge(a, b);
  else console.log("Usage:\n  node scripts/mergeHashtags.js list [filter]\n  node scripts/mergeHashtags.js merge <fromId> <toId>");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });