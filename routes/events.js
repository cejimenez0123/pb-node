// const express = require('express');
// const prisma = require("../db");
// const getOfficialProfileId = require('../utils/getOfficialProfileId');
// const client = require('../utils/algoliaClient');
// const indexNames = require('../utils/indexNames');

// const router = express.Router();

// module.exports = function (authMiddleware) {

//   const EVENT_STORY_STATUS = "fragment"; // set to your "published event" StoryStatus

//   // html body stored in story.data, built from the transformed event
//   function escapeHtml(value = "") {
//   return String(value).replace(/[&<>"']/g, (char) => ({
//     "&": "&amp;",
//     "<": "&lt;",
//     ">": "&gt;",
//     '"': "&quot;",
//     "'": "&#39;",
//   }[char]));
// }

// function buildEventStoryData(event) {
//   const parts = [];

//   if (event.description) {
//     parts.push(`<p>${escapeHtml(event.description)}</p>`);
//   }

//   const meta = [];

//   // Support Google Calendar's native start format and your transformed format.
//   const start =
//     event.start?.dateTime ||
//     event.start?.date ||
//     event.startTime ||
//     "";

//   if (start) {
//     meta.push(`
//       <li>
//         <strong>When:</strong>
//         <time class="event-start" datetime="${escapeHtml(start)}">
//           ${escapeHtml(start)}
//         </time>
//       </li>
//     `);
//   }

//   if (event.location) {
//     meta.push(`<li><strong>Where:</strong> ${escapeHtml(event.location)}</li>`);
//   }

//   if (event.area) {
//     meta.push(`<li><strong>Area:</strong> ${escapeHtml(event.area)}</li>`);
//   }

//   if (event.organizerLink) {
//     meta.push(`
//       <li>
//         <a href="${escapeHtml(event.organizerLink)}" target="_blank" rel="noopener">
//           More info
//         </a>
//       </li>
//     `);
//   }

//   if (event.googleLink) {
//     meta.push(`
//       <li>
//         <a href="${escapeHtml(event.googleLink)}" target="_blank" rel="noopener">
//           Google Calendar
//         </a>
//       </li>
//     `);
//   }

//   if (meta.length) {
//     parts.push(`<ul>${meta.join("")}</ul>`);
//   }

//   return parts.join("\n");
// }
//   // find-or-create hashtags by name, then ensure HashtagStory links
//   async function attachHashtags(storyId, hashtags = []) {
//     for (const raw of hashtags) {
//       const name = String(raw || "").replace(/^#/, "").trim();
//       if (!name) continue;
//       try {
//         let tag = await prisma.hashtag.findFirst({
//           where: { name: { equals: name, mode: "insensitive" } },
//           select: { id: true },
//         });
//         if (!tag) tag = await prisma.hashtag.create({ data: { name }, select: { id: true } });

//         const exists = await prisma.hashtagStory.findFirst({
//           where: { storyId, hashtagId: tag.id },
//           select: { id: true },
//         });
//         if (!exists) await prisma.hashtagStory.create({ data: { storyId, hashtagId: tag.id } });
//       } catch (e) {
//         console.warn(`attachHashtags: skipped "${name}" -`, e.message);
//       }
//     }
//   }
// async function upsertEventStory(event, authorId) {
//   const googleCalendarId = event.googleCalendarId || event.id;

//   if (!googleCalendarId) {
//     throw new Error("Event missing googleCalendarId / id");
//   }

//   const existing = await prisma.story.findFirst({
//     where: { googleCalendarId },
//   });

//   if (existing) {
//     return { story: existing, created: false };
//   }

//   const officialProfileId = await getOfficialProfileId();

//   const story = await prisma.story.create({
//     data: {
//       title: event.summary || event.shortSummary || "Untitled event",
//       description: event.description || "",
//       data: buildEventStoryData(event),
//       isPrivate: false,
//       commentable: true,
//       type: "html",
//       status: EVENT_STORY_STATUS,
//       googleCalendarId,
//       author: {
//         connect: { id: officialProfileId },
//       },
//     },
//   });

//   await client.saveObject({
//     indexName: indexNames.story,
//     body: {
//       area: event.area || "",
//       objectID: story.id,
//       title: story.title,
//       type: "event",
//     },
//   });

//   return { story, created: true };
// }


      

//   // find this profile's events collection (create one if they don't have it yet)
//   async function getProfileEventsCollectionId(profileId) {
//     const link = await prisma.profileToCollection.findFirst({
//       where: { profileId, type: "events" },
//       select: { collectionId: true },
//     });
//     if (link?.collectionId) return link.collectionId;

//     // no events collection yet — make one and register it for this profile
//     const collection = await prisma.collection.create({
//       data: { title: "Events", type: "book", profileId, isPrivate: false },
//       select: { id: true },
//     });
//     await prisma.profileToCollection.create({
//       data: { profileId, collectionId: collection.id, type: "events" },
//     });
//     return collection.id;
//   }
// // Fetch this profile's saved events
// router.get("/save", authMiddleware, async (req, res) => {
//   try {
//     const profileId = req.user.profiles[0].id;

//     const collectionId = await getProfileEventsCollectionId(profileId);

//     const events = await prisma.story.findMany({
//       where: {
//         collections: {
//           some: {
//             collectionId,
//           },
//         },
//         type: "html",
//         status: EVENT_STORY_STATUS,
//       },
//       select: {
//         id: true,
//         title: true,
//         description: true,
//         data: true,
//         type: true,
//         googleCalendarId: true,
//         created: true,
//       },
//       orderBy: {
//         created: "desc",
//       },
//     });

//     res.json(events);
//   } catch (error) {
//     console.error("GET /events error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });


//   return router;
// };

const express = require("express");
const prisma = require("../db");
const getOfficialProfileId = require("../utils/getOfficialProfileId");
const client = require("../utils/algoliaClient");
const indexNames = require("../utils/indexNames");

const router = express.Router();

module.exports = function (authMiddleware) {
  const EVENT_STORY_STATUS = "fragment";

  // Escape external event content before storing it as HTML.
  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }
function parseFormattedEventDate(value) {
  if (!value) return null;

  // Remove HTML and normalize whitespace.
  const text = String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Example: Sun 11/08 10:00 AM
  const match = text.match(
    /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i
  );

  if (!match) return null;

  const [, month, day, suppliedYear, hour, minute, meridiem] = match;

  let year = suppliedYear
    ? Number(suppliedYear)
    : new Date().getFullYear();

  if (year < 100) year += 2000;

  let hours = Number(hour);

  if (meridiem.toUpperCase() === "PM" && hours !== 12) {
    hours += 12;
  }

  if (meridiem.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }

  const date = new Date(
    year,
    Number(month) - 1,
    Number(day),
    hours,
    Number(minute)
  );

  // Reject invalid calendar dates.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  // If no year was supplied and the date has passed,
  // assume the event is scheduled for next year.
  if (!suppliedYear) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDay = new Date(date);
    eventDay.setHours(0, 0, 0, 0);

    if (eventDay < today) {
      date.setFullYear(year + 1);
    }
  }

  return date;
}

function normalizeEventStart(event) {
  const candidates = [
    event.start?.dateTime,
    event.start?.date,
    event.startDateTime,
    event.startISO,
    event.startTime,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const value = String(candidate).trim();

    // Native Google Calendar date-only format.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // Native ISO date-time.
    if (
      /^\d{4}-\d{2}-\d{2}T/.test(value) &&
      !Number.isNaN(Date.parse(value))
    ) {
      return value;
    }

    // Handle the formatted HTML date from your event source.
    const parsed = parseFormattedEventDate(value);

    if (parsed) {
      const pad = (n) => String(n).padStart(2, "0");

      // Preserve the parsed local clock time.
      return (
        `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}` +
        `T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:00`
      );
    }
  }

  return "";
}
function buildEventStoryData(event) {
  const parts = [];

  if (event.description) {
    parts.push(`<p>${escapeHtml(event.description)}</p>`);
  }

  const meta = [];

  const start = normalizeEventStart(event);

  if (start) {
    meta.push(`
      <li>
        <strong>When:</strong>
        <time class="event-start" datetime="${escapeHtml(start)}">
          ${escapeHtml(start)}
        </time>
      </li>
    `);
  }

  if (event.location) {
    meta.push(
      `<li><strong>Where:</strong> ${escapeHtml(event.location)}</li>`
    );
  }

  if (event.area) {
    meta.push(
      `<li><strong>Area:</strong> ${escapeHtml(event.area)}</li>`
    );
  }

  if (event.organizerLink) {
    meta.push(`
      <li>
        <a href="${escapeHtml(event.organizerLink)}" target="_blank" rel="noopener noreferrer">
          More info
        </a>
      </li>
    `);
  }

  if (event.googleLink) {
    meta.push(`
      <li>
        <a href="${escapeHtml(event.googleLink)}" target="_blank" rel="noopener noreferrer">
          Google Calendar
        </a>
      </li>
    `);
  }

  if (meta.length) {
    parts.push(`<ul>${meta.join("")}</ul>`);
  }

  return parts.join("\n");
}

  // Find or create hashtags and link them to a Story.
async function attachHashtags(storyId, hashtags = []) {
  for (const raw of hashtags) {
    const name = String(raw || "").replace(/^#/, "").trim();
    if (!name) continue;

    try {
      let tag = await prisma.hashtag.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (!tag) {
        tag = await prisma.hashtag.create({
          data: { name },
          select: { id: true },
        });
      }

      const exists = await prisma.hashtagStory.findFirst({
        where: {
          storyId,
          hashtagId: tag.id,
        },
        select: { id: true },
      });

      if (!exists) {
        await prisma.hashtagStory.create({
          data: {
            story: {
              connect: { id: storyId },
            },
            hashtag: {
              connect: { id: tag.id },
            },
          },
        });
      }
    } catch (error) {
      console.warn(
        `attachHashtags: skipped "${name}" -`,
        error.message
      );
    }
  }
}

  // Create or reuse the shared event Story.
  async function upsertEventStory(event) {
    const googleCalendarId =
      event.googleCalendarId || event.id;

    if (!googleCalendarId) {
      throw new Error("Event missing googleCalendarId / id");
    }

    const existing = await prisma.story.findFirst({
      where: { googleCalendarId },
    });

    // Reuse existing event without overwriting its content.
if (existing) {
  const updatedStory = await prisma.story.update({
    where: { id: existing.id },
    data: {
      data: buildEventStoryData(event),
    },
  });

  return {
    story: updatedStory,
    created: false,
  };
}

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
        author: {
          connect: { id: officialProfileId },
        },
      },
    });

    await client.saveObject({
      indexName: indexNames.story,
      body: {
        area: event.area || "",
        objectID: story.id,
        title: story.title,
        type: "event",
      },
    });

    return {
      story,
      created: true,
    };
  }

  // Find or create this profile's Events collection.
  async function getProfileEventsCollectionId(profileId) {
    const link = await prisma.profileToCollection.findFirst({
      where: {
        profileId,
        type: "events",
      },
      select: {
        collectionId: true,
      },
    });

    if (link?.collectionId) {
      return link.collectionId;
    }

    const collection = await prisma.collection.create({
      data: {
        title: "Events",
        type: "book",
        profileId,
        isPrivate: false,
      },
      select: {
        id: true,
      },
    });

    await prisma.profileToCollection.create({
      data: {
        profileId,
        collectionId: collection.id,
        type: "events",
      },
    });

    return collection.id;
  }

  // -----------------------------------------
  // GET /events/save
  // Fetch this profile's saved events.
  // -----------------------------------------

  router.get("/save", authMiddleware, async (req, res) => {
    try {
      const profileId = req.user.profiles[0].id;

      const collectionId =
        await getProfileEventsCollectionId(profileId);

      const events = await prisma.story.findMany({
        where: {
          collections: {
            some: {
              collectionId,
            },
          },
          type: "html",
          status: EVENT_STORY_STATUS,
        },
        select: {
          id: true,
          title: true,
          description: true,
          data: true,
          type: true,
          googleCalendarId: true,
          created: true,
        },
        orderBy: {
          created: "desc",
        },
      });

      return res.json(events);
    } catch (error) {
      console.error("GET /events/save error:", error);

      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  // -----------------------------------------
  // POST /events/save
  // Save an event to this profile's collection.
  // -----------------------------------------

  router.post("/save", authMiddleware, async (req, res) => {
    try {
      const event = req.body?.event;

      if (!event) {
        return res.status(400).json({
          error: "No event provided",
        });
      }

      const profileId = req.user.profiles[0].id;

      const { story, created } =
        await upsertEventStory(event);

      if (created) {
        await attachHashtags(story.id, event.hashtags);
      }

      const collectionId =
        await getProfileEventsCollectionId(profileId);

      const alreadyLinked =
        await prisma.storyToCollection.findFirst({
          where: {
            storyId: story.id,
            collectionId,
          },
          select: {
            id: true,
          },
        });

      let linked = false;

      if (!alreadyLinked) {
        await prisma.storyToCollection.create({
          data: {
            storyId: story.id,
            collectionId,
            profileId,
          },
        });

        linked = true;
      }

      return res.json({
        story,
        created,
        linked,
        alreadySaved: !linked,
      });
    } catch (error) {
      console.error("POST /events/save error:", error);

      return res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  return router;
};
