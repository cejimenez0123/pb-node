const express = require('express');
const router = express.Router()
const {algoliasearch }= require("algoliasearch");
const optionalAuth = require('../middleware/optionalAuth');
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