const express = require('express');
const router = express.Router()
const {algoliasearch }= require("algoliasearch");
const optionalAuth = require('../middleware/optionalAuth');
const prisma = require('../db');
module.exports = function (authMiddleware){
const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

router.post("/save", async (req, res) => {
  try {
    const { indexName, object } = req.body;
    if (!indexName || !object || typeof object !== "object") {
      return res.status(400).json({ message: "Missing indexName or invalid 'object'." });
    }

    const result = await client.saveObject({
      indexName,
      body: object, // v5 wraps the record in `body`
    });
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error saving object:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { indexName } = req.query; // or req.body, your call
    if (!id || !indexName) {
      return res.status(400).json({ message: "Missing objectID or indexName." });
    }

    const result = await client.deleteObject({ indexName, objectID: id });
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error deleting object:", error);
    res.status(500).json({ error: error.message });
  }
});
router.get(
  "/search",
  optionalAuth,
  async (req, res) => {
    const { q = "" } = req.query;

    const defaultIndexes = [
      "profile",
      "story",
      "collection",
      "hashtag",
    ];

    try {
      const numericKeys = Object.keys(req.query)
        .filter((key) => /^\d+$/.test(key))
        .sort((a, b) => Number(a) - Number(b));

      const filterAliases = {
        profiles: "profile",
        stories: "story",
        collections: "collection",
        hashtags: "hashtag",
      };

      const requestedFilters = numericKeys
        .map((key) => req.query[key])
        .map((filter) => filterAliases[filter] || filter)
        .filter((filter) =>
          defaultIndexes.includes(filter)
        );

      const indexes =
        requestedFilters.length > 0
          ? [...new Set(requestedFilters)]
          : defaultIndexes;

      const resultsPerIndex = await Promise.all(
        indexes.map(async (indexName) => {
          const response = await client.search([
            {
              indexName,
              query: q.trim(),
            
            },
            
          ]);

          return response.results[0].hits.map((hit) => ({
            ...hit,
            type: indexName,
          }));
        })
      );

      res.json({
        results: resultsPerIndex.flat(),
      });
    } catch (error) {
      console.error("Algolia search error:", error);

      res.status(500).json({
        error: "Search failed",
      });
    }
  }
);

 

router.get(
  "/search/my-work", authMiddleware, async (req, res) => {
    try {
      const profileId = req.user?.profiles?.[0]?.id;

      if (!profileId) {
        return res.status(401).json({
          error: "Authenticated profile not found.",
        });
      }

      const query =
        typeof req.query.q === "string"
          ? req.query.q.trim()
          : "";

      // Support the same numeric filter convention
      // as the existing /search endpoint.
      const numericKeys = Object.keys(req.query)
        .filter((key) => /^\d+$/.test(key))
        .sort((a, b) => Number(a) - Number(b));

      const filterAliases = {
        stories: "story",
        collections: "collection",
      };

      const requestedFilters = numericKeys
        .map((key) => req.query[key])
        .map((filter) => filterAliases[filter] || filter)
        .filter((filter) =>
          ["story", "collection"].includes(filter)
        );

      const indexes =
        requestedFilters.length > 0
          ? [...new Set(requestedFilters)]
          : ["story", "collection"];

      /*
       * 1. Find all rooms accessible to this profile.
       *
       * Access:
       * - Original room owner
       * - Approved room membership
       * - Public rooms
       */
      const collections =
        indexes.includes("collection")
          ? await prisma.collection.findMany({
              where: {
                OR: [
                  {
                    profileId,
                  },
                  {
                    roles: {
                      some: {
                        profileId,
                        approved: true,
                      },
                    },
                  },
                  {
                    isPrivate: false,
                  },
                ],

                ...(query
                  ? {
                      OR: [
                        {
                          title: {
                            contains: query,
                            mode: "insensitive",
                          },
                        },
                        {
                          purpose: {
                            contains: query,
                            mode: "insensitive",
                          },
                        },
                      ],
                    }
                  : {}),
              },

              select: {
                id: true,
                title: true,
                purpose: true,
                type: true,
                isPrivate: true,
                profileId: true,
                created: true,
                updated: true,
                profile: {
                  select: {
                    username: true,
                  },
                },
              },
            })
          : [];

      const collectionIds = collections.map(
        (collection) => collection.id
      );

      /*
       * 2. Find all stories accessible to this profile.
       *
       * Access:
       * - Story author
       * - Approved RoleToStory membership
       * - Stories in accessible rooms
       * - Public stories
       */
      const storyAccess = [
        {
          authorId: profileId,
        },
        {
          betaReaders: {
            some: {
              profileId,
              approved: true,
            },
          },
        },
        {
          isPrivate: false,
        },
      ];

      if (collectionIds.length > 0) {
        storyAccess.push({
          collections: {
            some: {
              collectionId: {
                in: collectionIds,
              },
            },
          },
        });
      }

      const stories =
        indexes.includes("story")
          ? await prisma.story.findMany({
              where: {
                AND: [
                  {
                    OR: storyAccess,
                  },

                  ...(query
                    ? [
                        {
                          OR: [
                            {
                              title: {
                                contains: query,
                                mode: "insensitive",
                              },
                            },
                            {
                              description: {
                                contains: query,
                                mode: "insensitive",
                              },
                            },
                          ],
                        },
                      ]
                    : []),
                ],
              },

              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                status: true,
                isPrivate: true,
                authorId: true,
                created: true,
                updated: true,
                author: {
                  select: {
                    username: true,
                    user: {
                      select: {
                        preferredName: true,
                      },
                    },
                  },
                },
              },
            })
          : [];

      /*
       * 3. Normalize results to match /search.
       *
       * Both endpoints return:
       * {
       *   results: [
       *     { ...item, objectID, type }
       *   ]
       * }
       */

      const storyResults = stories.map((story) => ({
        ...story,
        objectID: story.id,
        type: "story",
        authorName:
          story.author?.user?.preferredName ||
          story.author?.username ||
          null,
        authorUsername: story.author?.username || null,
      }));

      const collectionResults = collections.map(
        (collection) => ({
          ...collection,
          objectID: collection.id,
          type: "collection",
          authorUsername:
            collection.profile?.username || null,
        })
      );

      res.json({
        results: [
          ...storyResults,
          ...collectionResults,
        ],
      });
    } catch (error) {
      console.error(
        "My Work search error:",
        error
      );

      res.status(500).json({
        error: "My Work search failed.",
      });
    }
  }
);



router.patch("/update", async (req, res) => {
  try {
    const { objectID, indexName,fields } = req.body;
    if (!objectID || !fields || typeof fields !== "object") {
      return res.status(400).json({ message: "Missing objectID or fields." });
    }

    const result = await client.partialUpdateObject({
      indexName,
      objectID,
      attributesToUpdate:{
    ...fields
      }
  
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error partially updating object:", error);
    res.status(500).json({ error: error.message });
  }
})
return router}