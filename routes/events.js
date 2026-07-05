const express = require('express');
const prisma = require("../db");
const getOfficialProfileId = require('../utils/getOfficialProfileId');
const client = require('../utils/algoliaClient');
const indexNames = require('../utils/indexNames');

const router = express.Router();

module.exports = function (authMiddleware) {

  const EVENT_STORY_STATUS = "fragment"; // set to your "published event" StoryStatus

  // html body stored in story.data, built from the transformed event
  function buildEventStoryData(event) {
    const parts = [];
    if (event.description) parts.push(`<p>${event.description}</p>`);

    const meta = [];
    if (event.startTime)     meta.push(`<li><strong>When:</strong> ${event.startTime}</li>`);
    if (event.location)      meta.push(`<li><strong>Where:</strong> ${event.location}</li>`);
    if (event.area)          meta.push(`<li><strong>Area:</strong> ${event.area}</li>`);
    if (event.organizerLink) meta.push(`<li><a href="${event.organizerLink}" target="_blank" rel="noopener">More info</a></li>`);
    if (event.googleLink)    meta.push(`<li><a href="${event.googleLink}" target="_blank" rel="noopener">Google Calendar</a></li>`);
    if (meta.length) parts.push(`<ul>${meta.join("")}</ul>`);

    return parts.join("\n");
  }

  // find-or-create hashtags by name, then ensure HashtagStory links
  async function attachHashtags(storyId, hashtags = []) {
    for (const raw of hashtags) {
      const name = String(raw || "").replace(/^#/, "").trim();
      if (!name) continue;
      try {
        let tag = await prisma.hashtag.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
          select: { id: true },
        });
        if (!tag) tag = await prisma.hashtag.create({ data: { name }, select: { id: true } });

        const exists = await prisma.hashtagStory.findFirst({
          where: { storyId, hashtagId: tag.id },
          select: { id: true },
        });
        if (!exists) await prisma.hashtagStory.create({ data: { storyId, hashtagId: tag.id } });
      } catch (e) {
        console.warn(`attachHashtags: skipped "${name}" -`, e.message);
      }
    }
  }

  // create the shared story the first time this googleCalendarId is seen,
  // otherwise reuse the existing one
  async function upsertEventStory(event, authorId) {
    const googleCalendarId = event.googleCalendarId || event.id;
    if (!googleCalendarId) throw new Error("event missing googleCalendarId / id");

    const existing = await prisma.story.findFirst({ where: { googleCalendarId } });
    if (existing) return { story: existing, created: false };
    const officialProfileId = await getOfficialProfileId();
    const story = await prisma.story.create({
      data: {
        title: event.summary || event.shortSummary || "Untitled event",
        description: event.description || "",
        data: buildEventStoryData(event),
        isPrivate: false,
        commentable: true,
        type: "html",
        status: EVENT_STORY_STATUS,
        googleCalendarId,
        ...(authorId ? { author: { connect: { id: officialProfileId } } } : {}),
      },
    });
  
      
    // }})
    client.saveObject({indexName:indexNames.story,body:{
  area:evvent.area,
  objectID:story.id,
  title:story.id,
  type:"event"
}})
    return { story, created: true };
  }

  // find this profile's events collection (create one if they don't have it yet)
  async function getProfileEventsCollectionId(profileId) {
    const link = await prisma.profileToCollection.findFirst({
      where: { profileId, type: "events" },
      select: { collectionId: true },
    });
    if (link?.collectionId) return link.collectionId;

    // no events collection yet — make one and register it for this profile
    const collection = await prisma.collection.create({
      data: { title: "Events", type: "book", profileId, isPrivate: false },
      select: { id: true },
    });
    await prisma.profileToCollection.create({
      data: { profileId, collectionId: collection.id, type: "events" },
    });
    return collection.id;
  }

  // --- route -------------------------------------------------------------
  // body: { event }  — the single transformed event from the browser
  router.post("/save", authMiddleware, async (req, res) => {
    try {
      const event = req.body?.event;
      if (!event) return res.status(400).json({ error: "No event provided" });

      const profileId = req.user.profiles[0].id;

      // create the shared story on first-ever save; reuse otherwise
      const { story, created } = await upsertEventStory(event, profileId);
      if (created) await attachHashtags(story.id, event.hashtags);

      // link into THIS profile's events collection (idempotent)
      const collectionId = await getProfileEventsCollectionId(profileId);
      const alreadyLinked = await prisma.storyToCollection.findFirst({
        where: { storyId: story.id, collectionId },
        select: { id: true },
      });

      let linked = false;
      if (!alreadyLinked) {
        await prisma.storyToCollection.create({
          data: { storyId: story.id, collectionId, profileId },
        });
        linked = true;
      }

      res.json({
        story,
        created,          // true only the very first time anyone saved this event
        linked,           // true if it was newly added to this profile's collection
        alreadySaved: !linked,
      });
    } catch (error) {
      console.log("POST /events/save error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};