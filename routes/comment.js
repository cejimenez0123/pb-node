const express = require('express');
const prisma = require("../db");
const updateWriterLevelMiddleware = require('../middleware/updateWriterLevelMiddleware');
const { default: notifyUser } = require('../utils/notifyUser');
const Paths = require('../utils/Paths');
const attachBlockedProfiles = require('../middleware/attechBlockedProfiles');
const optionalAuth = require('../middleware/optionalAuth');


const router = express.Router();

module.exports = function (authMiddleware) {
  const protected = [authMiddleware, updateWriterLevelMiddleware,attachBlockedProfiles];
    const withBlocks = [authMiddleware, attachBlockedProfiles];
 const withOptionalBlocks = [optionalAuth, attachBlockedProfiles];
  // ── GET /comments?storyId=xxx ─────────────────────────────────────────────
  // Public — used by DataElement to hydrate annotation highlights
  // router.get("/", withOptionalBlocks,async (req, res) => {
  //   try {
  //     const { storyId } = req.query;
  //     if (!storyId) return res.status(400).json({ error: "storyId required" });

  //     const comments = await prisma.comment.findMany({
  //       where: {
  //         storyId,
  //       OR: [
  //   { parentId: { isSet: false } },  // field not set (MongoDB)
  //   { parentId:{equals: null} },               // field is explicitly null
  // ],
          
  //       },
  //       include: {
  //         profile: true,
          
  //         children: {
  //           include: { profile: true },
  //           orderBy: { created: "asc" },
  //         },
  //       },
  //       orderBy: { created: "asc" },
  //     });

  //     res.json({ comments });
  //   } catch (err) {
      
  //     res.status(500).json({ error: err });
  //   }
  // });
router.get("/", withOptionalBlocks, async (req, res) => {
  try {
    const { storyId } = req.query;
    const blockedProfileIds = req.blockedProfileIds || [];

    if (!storyId) {
      return res.status(400).json({ error: "storyId required" });
    }

    const comments = await prisma.comment.findMany({
      where: {
        storyId,
        OR: [
          { parentId: { isSet: false } },
          { parentId: { equals: null } },
        ],
        ...(blockedProfileIds.length
          ? { profileId: { notIn: blockedProfileIds } }
          : {}),
      },
      include: {
        profile: true,
        children: {
          include: { profile: true },
          orderBy: { created: "asc" },
        },
      },
      orderBy: { created: "asc" },
    });

    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});
router.post("/:id/to-story", ...protected, async (req, res) => {
  try {
    const profileId = req.user.profiles[0].id;
    const { id }    = req.params;
    const { isPrivate = true, status, collectionId } = req.body;

    const VALID_STATUS = ["draft", "fragment", "finished", "workshop"];
    const storyStatus  = VALID_STATUS.includes(status) ? status : "draft";

    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.profileId !== profileId) {
      return res.status(403).json({ error: "You can only promote your own comments" });
    }

    // const text  = (comment.content ?? "").trim();
    // const title = text.length > 60
    //   ? `${text.slice(0, 57).trimEnd()}…`
    //   : text || "Untitled";

    const story = await prisma.story.create({
      data: {
        title:"Untitled", // ← could use comment content as title, but often too long/short
        data:     comment.content,
        isPrivate,
        status:      storyStatus,
        commentable: true,
        author:      { connect: { id: profileId } },
        ...(collectionId && {
          collections: {
            create: {
              collection: { connect: { id: collectionId } },
              profile:    { connect: { id: profileId } },
            },
          },
        }),
      },
      include: { author: true },
    });

    res.json({ story });
  } catch (err) {
    console.error(err);
    res.status(409).json({ error: err });
  }
});
router.post("/", ...protected, async (req, res) => {
  try {
    const { storyId, text, parentId, anchorText } = req.body;
    const currentuser = req.user.profiles[0];
    const profileId = currentuser.id;
    const moderation = checkContent(`${text ?? ""} ${anchorText ?? ""}`);
    if (moderation.flagged) {
      return res.status(400).json({ error: new Error("Content violates community guidelines") });
    }

    const baseData = {
      content:    text,
      anchorText: anchorText ?? "",
      story:      { connect: { id: storyId } },
      profile:    { connect: { id: profileId } },
    };

    const com = await prisma.comment.create({
      data: parentId
        ? { ...baseData, parent: { connect: { id: parentId } } }
        : baseData,
      include: { profile: true },
    });

    const comment = await prisma.comment.findFirst({
      where: { id: com.id },
      include: {
        profile:  true,
        children: { include: { profile: true } },
      },
    });

    const route = Paths.page.createRoute(storyId);

    if (parentId) {
      // Reply — notify the parent comment's author
      const parentComment = await prisma.comment.findUnique({
        where:  { id: parentId },
        select: { profileId: true },
      });

      if (parentComment?.profileId && parentComment.profileId !== profileId) {
        const title = "New reply to your comment";
        const body  = `${currentuser.username ?? "Someone"} replied to your comment`;

        await Promise.all([
          notifyUser({
            profileId: parentComment.profileId,
            type:      "REPLY",
            title,
            body,
            entityId:  storyId,
            actorId:   profileId,
            route,
          }),
          sendNotification(parentComment.profileId, title, body, {
            type:     "REPLY",
            entityId: storyId,
            actorId:  profileId,
            route,
          }).catch((err) =>
            console.error("[sendNotification] REPLY failed:", err)
          ),
        ]);
      }
    } else {
      // Top-level comment — notify the story author
      const story = await prisma.story.findUnique({
        where:  { id: storyId },
        select: { authorId: true },
      });

      if (story?.authorId && story.authorId !== profileId) {
        const title = "New feedback on your piece";
        const body  = `${currentuser.username ?? "Someone"} left a comment`;

        await Promise.all([
          notifyUser({
            profileId: story.authorId,
            type:      "COMMENT",
            title,
            body,
            entityId:  storyId,
            actorId:   profileId,
            route,
          }),
          sendNotification(story.authorId, title, body, {
            type:     "COMMENT",
            entityId: storyId,
            actorId:  profileId,
            route,
          }).catch((err) =>
            console.error("[sendNotification] COMMENT failed:", err)
          ),
        ]);
      }
    }

    res.json({ comment });
  } catch (err) {
    console.log(err);
    res.status(409).json({ error: err });
  }
});
 router.patch("/:id", authMiddleware, async (req, res) => {
    const { text } = req.body;
    const { id }   = req.params;

    try {
      const existing = await prisma.comment.findFirst({
        where:   { id },
        include: { profile: true },
      });

      if (!existing) return res.status(404).json({ message: "Comment not found" });

      if (existing.profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const comment = await prisma.comment.update({
        where:   { id },
        data:    { content: text, updated: new Date() },
        include: {
          profile:  true,
          children: { include: { profile: true } },
        },
      });

      res.json({ comment });
    } catch (err) {
      console.log(err);
      res.status(409).json({ error: err });
    }
  });

  // ── DELETE /comments/:id ──────────────────────────────────────────────────
  router.delete("/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
      const comment = await prisma.comment.findFirst({
        where:   { id },
        include: { profile: true },
      });

      if (!comment) return res.status(404).json({ message: "Comment not found" });

      if (comment.profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Must delete hashtags first (FK constraint)
      await prisma.hashtagComment.deleteMany({
        where: { commentId: id },
      });

      // Delete children before parent (FK constraint — onDelete: NoAction)
      await prisma.comment.deleteMany({
        where: { parentId: id },
      });

      await prisma.comment.delete({ where: { id } });

      res.json({ comment, message: "Deleted Successfully" });
    } catch (err) {
      console.log(err);
      res.status(409).json({ error: err });
    }
  });

  // ── GET /comments/helpful ─────────────────────────────────────────────────
  // Must be defined BEFORE /:id routes to avoid "helpful" matching as an id
  router.get("/helpful", withOptionalBlocks,async (req, res) => {
    try {
      const comments = await prisma.comment.findMany({
        where:   { hashtags: { some: {} } },
        include: {
          hashtags: true,
          profile:  true,
        },
        orderBy: { updated: "desc" },
      });

      // Sort by hashtag count descending
      const sorted = [...comments].sort(
        (a, b) => b.hashtags.length - a.hashtags.length
      );

      res.json({ comments: sorted });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: err });
    }
  });

  return router;
};