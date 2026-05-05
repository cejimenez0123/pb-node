// const { algoliasearch } = require("algoliasearch");
// const prisma = require("../db")
// const client = algoliasearch(
//   process.env.ALGOLIA_APP_ID,
//   process.env.ALGOLIA_ADMIN_API_KEY
// );

// const INDEX_CONFIG = [
//   {
//     indexName: "story",
//     fetcher: (ids) =>
//       prisma.story.findMany({ where: { id: { in: ids } }, select: { id: true } }),
//   },
//   {
//     indexName: "collection",
//     fetcher: (ids) =>
//       prisma.collection.findMany({ where: { id: { in: ids } }, select: { id: true } }),
//   },
//   {
//     indexName: "profile",
//     fetcher: (ids) =>
//       prisma.profile.findMany({ where: { id: { in: ids } }, select: { id: true } }),
//   },
//   {
//     indexName: "hashtag",
//     fetcher: (ids) =>
//       prisma.hashtag.findMany({ where: { id: { in: ids } }, select: { id: true } }),
//   },
// ];

// async function cleanupIndex({ indexName, fetcher }) {
//   console.log(`\n[${indexName}] Starting cleanup...`);

//   let page = 0;
//   const hitsPerPage = 1000;
//   const orphanedIDs = [];

//   // Browse every record in the index
//   while (true) {
//     const { results } = await client.search([
//       {
//         indexName,
//         query: "",
//         params: { hitsPerPage, page, attributesToRetrieve: ["objectID"] },
//       },
//     ]);

//     const hits = results[0].hits;
//     if (!hits.length) break;

//     const ids = hits.map((h) => h.objectID);

//     // Check which IDs still exist in Prisma
//     const existing = await fetcher(ids);
//     const existingIDs = new Set(existing.map((r) => r.id));

//     for (const id of ids) {
//       if (!existingIDs.has(id)) {
//         orphanedIDs.push(id);
//       }
//     }

//     console.log(`[${indexName}] Page ${page}: ${hits.length} records checked, ${orphanedIDs.length} orphans so far`);

//     if (hits.length < hitsPerPage) break;
//     page++;
//   }

//   // Delete orphans in batches of 1000
//   if (orphanedIDs.length === 0) {
//     console.log(`[${indexName}] ✓ Clean — no orphans found`);
//     return 0;
//   }

//   console.log(`[${indexName}] Deleting ${orphanedIDs.length} orphaned records...`);

//   for (let i = 0; i < orphanedIDs.length; i += 1000) {
//     const batch = orphanedIDs.slice(i, i + 1000);
//     await client.deleteObjects({ indexName, objectIDs: batch });
//   }

//   console.log(`[${indexName}] ✓ Deleted ${orphanedIDs.length} orphans`);
//   return orphanedIDs.length;
// }

// async function main() {
//   console.log("=== Algolia One-Time Cleanup ===");
//   const summary = {};

//   for (const config of INDEX_CONFIG) {
//     try {
//       summary[config.indexName] = await cleanupIndex(config);
//     } catch (err) {
//       console.error(`[${config.indexName}] ERROR:`, err.message);
//       summary[config.indexName] = "failed";
//     }
//   }

//   console.log("\n=== Summary ===");
//   for (const [index, count] of Object.entries(summary)) {
//     console.log(`  ${index}: ${count === "failed" ? "❌ failed" : `${count} orphans deleted`}`);
//   }

// }
// main()
// module.exports = main