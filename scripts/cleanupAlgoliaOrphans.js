
// scripts/cleanupAlgoliaOrphans.js
// node scripts/cleanupAlgoliaOrphans.js --confirm
const prisma = require("../db");
const { algoliasearch } = require("algoliasearch");

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

const INDEXES = [
  {
    indexName: "profile",
    model: "profile",
    label: "Profiles",
  },
  {
    indexName: "story",
    model: "story",
    label: "Stories",
  },
  {
    indexName: "collection",
    model: "collection",
    label: "Collections",
  },
];

const BATCH_SIZE = 1000;

// MongoDB ObjectIds should be 24 hexadecimal characters.
// Non-ObjectId Algolia records are reported but not deleted.
const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const confirmed = process.argv.includes("--confirm");

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function log(message) {
  console.log(`[Algolia Cleanup] ${message}`);
}

function validateConfig() {
  if (
    !process.env.ALGOLIA_APP_ID ||
    !process.env.ALGOLIA_ADMIN_API_KEY
  ) {
    throw new Error(
      "Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_API_KEY."
    );
  }
}

// --------------------------------------------------
// GET ALL DATABASE IDS
// --------------------------------------------------

async function getDatabaseIds(model) {
  const records = await prisma[model].findMany({
    select: {
      id: true,
    },
  });

  return new Set(
    records.map((record) => String(record.id))
  );
}

// --------------------------------------------------
// BROWSE COMPLETE ALGOLIA INDEX
// --------------------------------------------------

async function findOrphans(indexConfig) {
  const {
    indexName,
    model,
    label,
  } = indexConfig;

  log(`Loading MongoDB ${label} IDs...`);

  const databaseIds = await getDatabaseIds(model);

  log(
    `${label} in MongoDB: ${databaseIds.size}`
  );

  const orphanRecords = [];
  const skippedRecords = [];

  let cursor = undefined;
  let totalScanned = 0;

  log(`Browsing Algolia index: ${indexName}`);

  do {
    const browseParams = {
      hitsPerPage: BATCH_SIZE,
    };

    if (cursor) {
      browseParams.cursor = cursor;
    }

    const response = await client.browse({
      indexName,
      browseParams,
    });

    const hits = response.hits || [];

    totalScanned += hits.length;

    for (const hit of hits) {
      const objectID = String(hit.objectID || "");

      if (!objectID) continue;

      // Avoid deleting records whose objectID format
      // does not match the MongoDB ObjectId convention.
      if (!OBJECT_ID_REGEX.test(objectID)) {
        skippedRecords.push({
          objectID,
          reason: "Non-MongoDB ObjectId format",
        });

        continue;
      }

      if (!databaseIds.has(objectID)) {
        orphanRecords.push({
          objectID,
          name: hit.name || "",
          username: hit.username || "",
          title: hit.title || "",
        });
      }
    }

    cursor = response.cursor;

  } while (cursor);

  log(`Algolia records scanned: ${totalScanned}`);
  log(`Orphan records found: ${orphanRecords.length}`);
  log(`Non-ObjectId records skipped: ${skippedRecords.length}`);

  return {
    indexName,
    label,
    totalScanned,
    databaseCount: databaseIds.size,
    orphanRecords,
    skippedRecords,
  };
}

// --------------------------------------------------
// DELETE ORPHANS
// --------------------------------------------------

async function deleteOrphans(indexName, orphanRecords) {
  const objectIDs = orphanRecords.map(
    (record) => record.objectID
  );

  if (!objectIDs.length) return 0;

  let deleted = 0;

  for (
    let i = 0;
    i < objectIDs.length;
    i += BATCH_SIZE
  ) {
    const batch = objectIDs.slice(
      i,
      i + BATCH_SIZE
    );

    await client.deleteObjects({
      indexName,
      objectIDs: batch,
      waitForTasks: true,
    });

    deleted += batch.length;

    log(
      `${indexName}: ${deleted}/${objectIDs.length} deleted`
    );
  }

  return deleted;
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
  validateConfig();

  console.log("\n=================================");
  console.log("ALGOLIA ORPHAN CLEANUP");
  console.log("=================================\n");

  // Scan every index before deleting anything.
  // If any scan fails, no index is modified.

  const results = [];

  for (const indexConfig of INDEXES) {
    const result = await findOrphans(indexConfig);
    results.push(result);
  }

  // --------------------------------------------------
  // REPORT
  // --------------------------------------------------

  console.log("\n=================================");
  console.log("ORPHAN REPORT");
  console.log("=================================\n");

  for (const result of results) {
    console.log(`\n${result.label} (${result.indexName})`);

    console.log({
      databaseRecords: result.databaseCount,
      algoliaRecordsScanned: result.totalScanned,
      orphanRecords: result.orphanRecords.length,
      skippedNonObjectIds: result.skippedRecords.length,
    });

    if (result.orphanRecords.length) {
      console.table(result.orphanRecords);
    }

    if (result.skippedRecords.length) {
      console.log("Skipped records (review separately):");
      console.table(result.skippedRecords);
    }
  }

  const totalOrphans = results.reduce(
    (sum, result) =>
      sum + result.orphanRecords.length,
    0
  );

  console.log("\n=================================");
  console.log(`TOTAL ORPHANS: ${totalOrphans}`);
  console.log("=================================");

  if (!totalOrphans) {
    log("No orphan records found.");
    return;
  }

  // --------------------------------------------------
  // DRY RUN
  // --------------------------------------------------

  if (!confirmed) {
    console.log("\nDRY RUN - NOTHING DELETED");

    console.log(
      "\nReview the orphan report before proceeding."
    );

    console.log(
      "\nTo delete these records, run:"
    );

    console.log(
      "node scripts/cleanupAlgoliaOrphans.js --confirm"
    );

    return;
  }

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  console.log("\nDeleting orphan records...\n");

  let totalDeleted = 0;

  for (const result of results) {
    const deleted = await deleteOrphans(
      result.indexName,
      result.orphanRecords
    );

    totalDeleted += deleted;
  }

  // --------------------------------------------------
  // COMPLETE
  // --------------------------------------------------

  console.log("\n=================================");
  console.log("ALGOLIA CLEANUP COMPLETED");
  console.log("=================================");

  console.log({
    orphanRecordsFound: totalOrphans,
    recordsDeleted: totalDeleted,
    indexesScanned: INDEXES.length,
  });
}

// --------------------------------------------------
// EXECUTION
// --------------------------------------------------

main()
  .catch((error) => {
    console.error("\nAlgolia cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
