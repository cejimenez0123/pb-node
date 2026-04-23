const express = require('express');
const prisma = require("../db");
const updateWriterLevelMiddleware = require('../middleware/updateWriterLevelMiddleware');
const { default: notifyUser } = require('../utils/notifyUser');

const router = express.Router();

module.exports = function (authMiddleware) {
  const protected = [authMiddleware, updateWriterLevelMiddleware];

  // ── GET /comments?storyId=xxx ─────────────────────────────────────────────
  // Public — used by DataElement to hydrate annotation highlights
  router.get("/", async (req, res) => {
    try {
      const { storyId } = req.query;
      if (!storyId) return res.status(400).json({ error: "storyId required" });

      const comments = await prisma.comment.findMany({
        where: {
          storyId,
        OR: [
    { parentId: { isSet: false } },  // field not set (MongoDB)
    { parentId:{equals: null} },               // field is explicitly null
  ],
          
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
      console.log(err);
      res.status(500).json({ error: err });
    }
  });

  // ── POST /comments ────────────────────────────────────────────────────────
  router.post("/", ...protected, async (req, res) => {
    try {
      const { profileId, storyId, text, parentId, anchorText } = req.body;
      const currentuser = req.user.profiles[0];

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

      // Re-fetch with children included so the client gets the full shape
      const comment = await prisma.comment.findFirst({
        where: { id: com.id },
        include: {
          profile:  true,
          children: { include: { profile: true } },
        },
      });

      await notifyUser({
        profileId,
        type:     "COMMENT",
        title:    "New feedback on your piece",
        body:     "Someone left a comment",
        entityId: comment.id,
        actorId:  currentuser.id,
      });

      res.json({ comment });
    } catch (err) {
      console.log(err);
      res.status(409).json({ error: err });
    }
  });

  // ── PATCH /comments/:id ───────────────────────────────────────────────────
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
  router.get("/helpful", async (req, res) => {
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