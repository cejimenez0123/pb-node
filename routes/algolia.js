const express = require('express');
const router = express.Router()
const {algoliasearch }= require("algoliasearch");
const { de } = require('@faker-js/faker');
const prisma = require('../db');
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
  const { q,profileId} = req.query;
  // const userId = req.user?.id;

  if (!q) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }
  const defaultIndexes = ["profile", "story", "collection", "hashtag"];

  let mine = false
  const numericKeys = Object.keys(req.query).filter(k => /^\d+$/.test(k));
  const arrayFilters = numericKeys.map(k => {
    let index = req.query[k]
     switch(index){
          case "profiles":return"profile"
           case "hashtags":return"hashtag"
            case "collections":return"collection"
             case "stories":return"story"
             case "personal":{
mine = true
             }
             default:return index
        }
   
  })
  let nonDefaultFilters = arrayFilters.filter(arr=>!defaultIndexes.includes(arr))

 
 

   const defaultFilters = arrayFilters.filter(arr=>defaultIndexes.includes(arr))
  const indexes = defaultFilters.length > 0 ? defaultFilters : defaultIndexes;

  try {
   
      if(mine&&profileId && profileId.length>0){
    let results = []
  
      if(arrayFilters.includes("collection")){
      let cols =await  prisma.collection.findMany({where:{
           profileId:{equals:profileId}
          ,title:{
            contains:q
          }}})
          
      results = [...results,...cols.map(col=>{
            col["type"]="collection"
            col["objectID"]=col.id
            return col
          })]
      }
        if(arrayFilters.includes("story")){
      let stors =await  prisma.story.findMany({where:{AND:[
       { title:{
          contains:q,
        }}
      ,{
           authorId:{equals:profileId}
          }]}})
         
      results = [...results,...stors.map(st=>{
              st["type"]="story"
              st["objectID"]=st.id
              return st
          })]
      }
      if(!arrayFilters.includes("collection")&&!arrayFilters.includes("story")){
        results = await Promise.all([
          
          prisma.collection.findMany({where:{
          profileId:{equals:profileId}
        }})
        
        ,prisma.story.findMany({where:{
          authorId:{
            equals:profileId
          }
        }})])}
    
     res.json({ results: results.flat() });
     return
  }
    const resultsPerIndex = await Promise.all(
      indexes.map(async (indexName) => {
        const hits = await client.search([{ indexName, query: q }]);

        let items = hits.results[0].hits.map(hit => ({
          ...hit,
          type: indexName,
        }));

        // mine=true → only return user content
        if (mine === "true" && userId) {
          items = items.filter(item => item.userId === userId);
        }

        return items;
      })
    );

    const flattened = resultsPerIndex.flat();

    res.json({ results: flattened });
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