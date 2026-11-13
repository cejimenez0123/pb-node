
const { algoliasearch } = require("algoliasearch");

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

const INDEXES = {
  profile: "profile",
  story: "story",
  collection: "collection",
};

// Add the exact values you want to remove.
// Matching ignores capitalization and surrounding whitespace.
"samba"
const TARGETS = {
  names: [
    "samba"
  ],

  usernames: [
 "samba"
  ],

  titles: [
   "samba"
  ],
};

const confirmed = process.argv.includes("--confirm");

const HITS_PER_PAGE = 1000;

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function log(message) {
  console.log(`[deleteAlgoliaByName] ${message}`);
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

  const hasTargets =
    TARGETS.names.length ||
    TARGETS.usernames.length ||
    TARGETS.titles.length;

  if (!hasTargets) {
    throw new Error(
      "Add at least one name, username, or title to TARGETS."
    );
  }
}

// --------------------------------------------------
// SEARCH AN INDEX FOR EXACT FIELD MATCHES
// --------------------------------------------------

async function findExactMatches({
  indexName,
  field,
  values,
}) {
  const matches = new Map();

  for (const value of values) {
    const query = String(value).trim();

    if (!query) continue;

    log(
      `Searching ${indexName}.${field} for "${query}"...`
    );

    let page = 0;
    let nbPages = 1;

    while (page < nbPages) {
      const response = await client.searchSingleIndex({
        indexName,

        searchParams: {
          query,
          page,
          hitsPerPage: HITS_PER_PAGE,

          attributesToRetrieve: [
            "objectID",
            "name",
            "username",
            "title",
          ],

          typoTolerance: false,
        },
      });

      nbPages = response.nbPages ?? 0;

      for (const hit of response.hits ?? []) {
        const actualValue = hit[field];

        // Search results are candidates. Only retain
        // records whose actual field exactly matches.
        if (
          normalize(actualValue) !== normalize(query)
        ) {
          continue;
        }

        if (!hit.objectID) continue;

        const key = `${indexName}:${hit.objectID}`;

        matches.set(key, {
          indexName,
          objectID: hit.objectID,
          field,
          value: actualValue,
          title: hit.title,
          name: hit.name,
          username: hit.username,
        });
      }

      page += 1;
    }
  }

  return [...matches.values()];
}

// --------------------------------------------------
// COLLECT ALL MATCHES
// --------------------------------------------------

async function findAllMatches() {
  const searches = [
    {
      indexName: INDEXES.profile,
      field: "name",
      values: TARGETS.names,
    },
    {
      indexName: INDEXES.profile,
      field: "username",
      values: TARGETS.usernames,
    },
    {
      indexName: INDEXES.story,
      field: "title",
      values: TARGETS.titles,
    },
    {
      indexName: INDEXES.collection,
      field: "title",
      values: TARGETS.titles,
    },
  ];

  const allMatches = new Map();

  for (const search of searches) {
    if (!search.values.length) continue;

    const results = await findExactMatches(search);

    for (const result of results) {
      const key = `${result.indexName}:${result.objectID}`;
      allMatches.set(key, result);
    }
  }

  return [...allMatches.values()];
}

// --------------------------------------------------
// DELETE MATCHES
// --------------------------------------------------

async function deleteMatches(matches) {
  let deleted = 0;

  for (const match of matches) {
    await client.deleteObject({
      indexName: match.indexName,
      objectID: match.objectID,
    });

    deleted += 1;

    log(
      `Deleted ${match.indexName} record: ${match.objectID}`
    );
  }

  return deleted;
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
  validateConfig();

  log("Starting Algolia search...");

  const matches = await findAllMatches();

  console.log("\n=================================");
  console.log("MATCHING ALGOLIA RECORDS");
  console.log("=================================");

  if (!matches.length) {
    log("No exact matches found.");
    return;
  }

  console.table(
    matches.map((match) => ({
      index: match.indexName,
      objectID: match.objectID,
      field: match.field,
      value: match.value,
      name: match.name || "",
      username: match.username || "",
      title: match.title || "",
    }))
  );

  console.log(`\nTotal records found: ${matches.length}`);

  if (!confirmed) {
    console.log("\nDRY RUN - NOTHING DELETED");

    console.log(
      "\nTo permanently delete these records, run:"
    );

    console.log(
      "node scripts/deleteAlgoliaByName.js --confirm"
    );

    return;
  }

  console.log("\nDeleting matching records...");

  const deleted = await deleteMatches(matches);

  console.log("\n=================================");
  console.log("ALGOLIA CLEANUP COMPLETED");
  console.log("=================================");

  console.log({
    found: matches.length,
    deleted,
  });
}

// --------------------------------------------------
// EXECUTION
// --------------------------------------------------

main().catch((error) => {
  console.error("\nAlgolia deletion failed:", error);
  process.exitCode = 1;
});
