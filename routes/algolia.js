const express = require('express');
const router = express.Router()
const {algoliasearch }= require("algoliasearch")
module.exports = function (authMiddleware){
const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

// const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME);




router.post("/save", async (req, res) => {
  try {
    const { object } = req.body;
    if (!object || typeof object !== "object") {
      return res.status(400).json({ message: "Missing or invalid 'object'." });
    }

    const result = await index.saveObject(object);
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error saving object:", error);
    res.status(500).json({ error: error.message });
  }
});


router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Missing objectID in URL." });
    }

    const result = await index.deleteObject(id);
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error deleting object:", error);
    res.status(500).json({ error: error.message });
  }
});
router.get("/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  const indexes = ["profile", "story", "collection", "hashtag"];

  try {
    // Perform search for each index separately
    const resultsPerIndex = await Promise.all(
      indexes.map(async (indexName) => {
        const hits = await client.search([{ indexName, query }]);
        console.log("git",hits)
        return hits.results[0].hits.map(hit => ({ ...hit, type: indexName }));
      })
    );


    // Flatten all results into a single array
    const flattenedResults = resultsPerIndex.flat();

    res.json({ results: flattenedResults });
  } catch (error) {
    console.error("Algolia search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});


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