
 // scripts/deleteUserData.js

const prisma = require("../db");
const { algoliasearch } = require("algoliasearch");
const fs = require("fs");
const path = require("path");

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

const ALGOLIA_INDEXES = {
  profile: "profile",
  story: "story",
  collection: "collection",
};

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const args = process.argv.slice(2);

const targetId = args.find(
  (arg) => !arg.startsWith("--")
);

const confirmed = args.includes("--confirm");

const retryArg = args.find((arg) =>
  arg.startsWith("--retry-algolia=")
);

const retryManifest = retryArg
  ? retryArg.split("=").slice(1).join("=")
  : null;

const manifestDirectory = path.join(
  __dirname,
  "deletion-manifests"
);

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function log(message) {
  console.log(`[deleteUserData] ${message}`);
}

function requireValidId(id) {
  if (!id || !OBJECT_ID_REGEX.test(id)) {
    throw new Error(
      "Provide a valid 24-character MongoDB ObjectId."
    );
  }
}

function ensureAlgoliaConfig() {
  if (
    !process.env.ALGOLIA_APP_ID ||
    !process.env.ALGOLIA_ADMIN_API_KEY
  ) {
    throw new Error(
      "Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_API_KEY."
    );
  }

  Object.values(ALGOLIA_INDEXES).forEach((index) => {
    if (!index) {
      throw new Error("Missing Algolia index configuration.");
    }
  });
}

async function deleteMany(model, where, label) {
  const result = await prisma[model].deleteMany({ where });

  if (result.count > 0) {
    log(`${label}: ${result.count} deleted`);
  }

  return result.count;
}

function saveManifest(manifest) {
  fs.mkdirSync(manifestDirectory, { recursive: true });

  fs.writeFileSync(
    manifest.filePath,
    JSON.stringify(manifest, null, 2)
  );
}

async function deleteAlgoliaRecords(manifest) {
  const records = [
    {
      indexName: ALGOLIA_INDEXES.profile,
      objectIDs: manifest.profileIds,
      label: "profiles",
    },
    {
      indexName: ALGOLIA_INDEXES.story,
      objectIDs: manifest.storyIds,
      label: "stories",
    },
    {
      indexName: ALGOLIA_INDEXES.collection,
      objectIDs: manifest.collectionIds,
      label: "collections",
    },
  ];

  for (const record of records) {
    const objectIDs = [...new Set(record.objectIDs)];

    if (!objectIDs.length) continue;

    await client.deleteObjects({
      indexName: record.indexName,
      objectIDs,
    });

    log(
      `Algolia ${record.label}: ${objectIDs.length} deleted`
    );
  }
}

// --------------------------------------------------
// ALGOLIA RECOVERY
// --------------------------------------------------

async function retryAlgoliaCleanup() {
  ensureAlgoliaConfig();

  const manifestPath = path.resolve(retryManifest);

  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Deletion manifest not found: ${manifestPath}`
    );
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8")
  );

  if (manifest.databaseCompleted !== true) {
    throw new Error(
      "Database deletion was not marked complete. " +
      "Do not retry Algolia cleanup until database cleanup has been verified."
    );
  }

  log("Retrying Algolia cleanup...");

  await deleteAlgoliaRecords(manifest);

  fs.unlinkSync(manifestPath);

  log("Algolia recovery completed successfully.");
  log("Deletion manifest removed.");
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
  // Allow recovery without supplying a target ID.
  if (retryManifest) {
    await retryAlgoliaCleanup();
    return;
  }

  requireValidId(targetId);

  log(`Looking up ID: ${targetId}`);

  // --------------------------------------------------
  // 1. FIND USER AND PROFILE
  // --------------------------------------------------

  const [userMatch, profileMatch] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        email: true,
      },
    }),

    prisma.profile.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        userId: true,
      },
    }),
  ]);

  if (userMatch && profileMatch) {
    throw new Error(
      "ID matches both a User and Profile. " +
      "Resolve the ambiguity before deleting."
    );
  }

  if (!userMatch && !profileMatch) {
    throw new Error(
      "No User or Profile found with that ID."
    );
  }

  let user = userMatch;

  const primaryProfile = profileMatch;

  if (primaryProfile?.userId) {
    user = await prisma.user.findUnique({
      where: { id: primaryProfile.userId },
      select: {
        id: true,
        email: true,
      },
    });
  }

  // --------------------------------------------------
  // 2. GET ALL ASSOCIATED PROFILES
  // --------------------------------------------------

  const associatedProfiles = user
    ? await prisma.profile.findMany({
        where: { userId: user.id },
        select: { id: true },
      })
    : [];

  const profileIds = [
    ...new Set([
      ...associatedProfiles.map((p) => p.id),
      ...(primaryProfile ? [primaryProfile.id] : []),
    ]),
  ];

  const userId = user?.id || null;

  if (!profileIds.length && !userId) {
    throw new Error("No associated records found.");
  }

  log(`User: ${userId || "none"}`);
  log(`Profiles found: ${profileIds.length}`);

  // --------------------------------------------------
  // 3. COLLECT OWNED STORIES AND COLLECTIONS
  // --------------------------------------------------

  const [stories, collections] = await Promise.all([
    profileIds.length
      ? prisma.story.findMany({
          where: {
            authorId: { in: profileIds },
          },
          select: { id: true },
        })
      : [],

    profileIds.length
      ? prisma.collection.findMany({
          where: {
            profileId: { in: profileIds },
          },
          select: {
            id: true,
            chatId: true,
          },
        })
      : [],
  ]);

  const storyIds = stories.map((story) => story.id);

  const collectionIds = collections.map(
    (collection) => collection.id
  );

  log(`Stories found: ${storyIds.length}`);
  log(`Collections found: ${collectionIds.length}`);

  // --------------------------------------------------
  // 4. COLLECT COMMENTS AND DESCENDANT REPLIES
  // --------------------------------------------------

  const commentLayers = [];
  const allCommentIds = new Set();

  if (profileIds.length) {
    let current = await prisma.comment.findMany({
      where: {
        OR: [
          { profileId: { in: profileIds } },
          ...(storyIds.length
            ? [{ storyId: { in: storyIds } }]
            : []),
        ],
      },
      select: { id: true },
    });

    while (current.length > 0) {
      const layer = current.filter(
        (comment) => !allCommentIds.has(comment.id)
      );

      if (!layer.length) break;

      layer.forEach((comment) =>
        allCommentIds.add(comment.id)
      );

      commentLayers.push(
        layer.map((comment) => comment.id)
      );

      current = await prisma.comment.findMany({
        where: {
          parentId: {
            in: layer.map((comment) => comment.id),
          },
        },
        select: { id: true },
      });
    }
  }

  log(`Comments/replies found: ${allCommentIds.size}`);

  // --------------------------------------------------
  // 5. DRY RUN
  // --------------------------------------------------

  if (!confirmed) {
    console.log("\n=================================");
    console.log("DRY RUN - NOTHING DELETED");
    console.log("=================================");

    console.log({
      userId,
      profileIds,
      storyCount: storyIds.length,
      collectionCount: collectionIds.length,
      commentCount: allCommentIds.size,
    });

    console.log("\nTo permanently delete, run:");

    console.log(
      `node scripts/deleteUserData.js ${targetId} --confirm`
    );

    return;
  }

// node scripts/deleteUserData.js [userID] --confirm    .  `

  // Validate before touching the database.
  ensureAlgoliaConfig();

  // --------------------------------------------------
  // 6. CREATE RECOVERY MANIFEST
  // --------------------------------------------------

  const manifestPath = path.join(
    manifestDirectory,
    `${targetId}-${Date.now()}.json`
  );

  const manifest = {
    targetId,
    userId,
    profileIds,
    storyIds,
    collectionIds,
    databaseCompleted: false,
    createdAt: new Date().toISOString(),
    filePath: manifestPath,
  };

  saveManifest(manifest);

  log(`Recovery manifest created: ${manifestPath}`);

  // --------------------------------------------------
  // 7. DELETE COMMENTS AND HASHTAG RELATIONS
  // --------------------------------------------------

  if (profileIds.length) {
    await deleteMany(
      "hashtagComment",
      {
        OR: [
          ...(allCommentIds.size
            ? [{
                commentId: {
                  in: [...allCommentIds],
                },
              }]
            : []),
          {
            profileId: { in: profileIds },
          },
        ],
      },
      "Hashtag comments"
    );

    // Delete deepest replies first.
    for (const layer of [...commentLayers].reverse()) {
      await deleteMany(
        "comment",
        { id: { in: layer } },
        "Comments and replies"
      );
    }
  }

  // --------------------------------------------------
  // 8. DELETE PROFILE RELATIONSHIPS
  // --------------------------------------------------

  if (profileIds.length) {
    await deleteMany("photo",{OR:[
   {profileId:{in:profileIds}}
    ]})
    await deleteMany(
      "report",
      {
        OR: [
          { reporterProfileId: { in: profileIds } },
          { reportedProfileId: { in: profileIds } },
        ],
      },
      "Reports"
    );

    await deleteMany(
      "block",
      {
        OR: [
          { blockerProfileId: { in: profileIds } },
          { blockedProfileId: { in: profileIds } },
        ],
      },
      "Blocks"
    );

    await deleteMany(
      "follow",
      {
        OR: [
          { followerId: { in: profileIds } },
          { followingId: { in: profileIds } },
        ],
      },
      "Follows"
    );

    await deleteMany(
      "hashtagFollower",
      {
        followerId: { in: profileIds },
      },
      "Hashtag followers"
    );

    await deleteMany(
      "notification",
      {
        profileId: { in: profileIds },
      },
      "Notifications owned by profiles"
    );

    await deleteMany(
      "deviceToken",
      {
        profileId: { in: profileIds },
      },
      "Device tokens"
    );

    await deleteMany(
      "message",
      {
        senderId: { in: profileIds },
      },
      "Messages sent"
    );

    await deleteMany(
      "userStoryLike",
      {
        profileId: { in: profileIds },
      },
      "Story likes"
    );

    await deleteMany(
      "userStoryHistory",
      {
        profileId: { in: profileIds },
      },
      "Story history"
    );

    await deleteMany(
      "userCollectionHistory",
      {
        profileId: { in: profileIds },
      },
      "Collection history"
    );

    await deleteMany(
      "profileToCollection",
      {
        profileId: { in: profileIds },
      },
      "Profile collection associations"
    );

    await deleteMany(
      "roleToStory",
      {
        profileId: { in: profileIds },
      },
      "Story permissions"
    );

    await deleteMany(
      "roleToCollection",
      {
        profileId: { in: profileIds },
      },
      "Collection permissions"
    );

    await deleteMany(
      "hashtagStory",
      {
        profileId: { in: profileIds },
      },
      "Hashtag story associations"
    );

    await deleteMany(
      "hashtagCollection",
      {
        profileId: { in: profileIds },
      },
      "Hashtag collection associations"
    );

    await deleteMany(
      "storyToCollection",
      {
        profileId: { in: profileIds },
      },
      "Story collection associations"
    );

    await deleteMany(
      "collectionToCollection",
      {
        profileId: { in: profileIds },
      },
      "Collection associations"
    );
  }

  // --------------------------------------------------
  // 9. DELETE REFERENCES TO OWNED STORIES
  // --------------------------------------------------

  if (storyIds.length) {
    await deleteMany(
      "dailyPrompt",
      {
        storyId: { in: storyIds },
      },
      "Daily prompts"
    );

    await deleteMany(
      "hashtagStory",
      {
        storyId: { in: storyIds },
      },
      "Story hashtags"
    );

    await deleteMany(
      "userStoryLike",
      {
        storyId: { in: storyIds },
      },
      "Likes on owned stories"
    );

    await deleteMany(
      "userStoryHistory",
      {
        storyId: { in: storyIds },
      },
      "History on owned stories"
    );

    await deleteMany(
      "roleToStory",
      {
        storyId: { in: storyIds },
      },
      "Story roles"
    );

    await deleteMany(
      "storyToCollection",
      {
        storyId: { in: storyIds },
      },
      "Story collection links"
    );
  }

  // --------------------------------------------------
  // 10. DELETE REFERENCES TO OWNED COLLECTIONS
  // --------------------------------------------------

  if (collectionIds.length) {
    await deleteMany(
      "hashtagCollection",
      {
        collectionId: { in: collectionIds },
      },
      "Collection hashtags"
    );

    await deleteMany(
      "storyToCollection",
      {
        collectionId: { in: collectionIds },
      },
      "Collection story links"
    );

    await deleteMany(
      "collectionToCollection",
      {
        OR: [
          {
            parentCollectionId: {
              in: collectionIds,
            },
          },
          {
            childCollectionId: {
              in: collectionIds,
            },
          },
        ],
      },
      "Nested collection links"
    );

    await deleteMany(
      "roleToCollection",
      {
        collectionId: { in: collectionIds },
      },
      "Collection roles"
    );

    await deleteMany(
      "profileToCollection",
      {
        collectionId: { in: collectionIds },
      },
      "Collection favorites"
    );

    await deleteMany(
      "userCollectionHistory",
      {
        collectionId: { in: collectionIds },
      },
      "Collection history references"
    );
  }

  // --------------------------------------------------
  // 11. CLEAN UP NOTIFICATIONS
  // --------------------------------------------------

  const deletedEntityIds = [
    ...profileIds,
    ...storyIds,
    ...collectionIds,
  ];

  if (deletedEntityIds.length) {
    await deleteMany(
      "notification",
      {
        entityId: {
          in: deletedEntityIds,
        },
      },
      "Notifications referencing deleted entities"
    );
  }

  // Remove deleted profiles from actorIds on
  // notifications belonging to other profiles.

  if (profileIds.length) {
    const remainingNotifications =
      await prisma.notification.findMany({
        where: {
          actorIds: {
            hasSome: profileIds,
          },
        },
        select: {
          id: true,
          actorIds: true,
        },
      });

    for (const notification of remainingNotifications) {
      const actorIds = notification.actorIds.filter(
        (id) => !profileIds.includes(id)
      );

      await prisma.notification.update({
        where: { id: notification.id },
        data: { actorIds },
      });
    }

    log(
      `Notification actor references cleaned: ${remainingNotifications.length}`
    );
  }

  // --------------------------------------------------
  // 12. DELETE OWNED STORIES
  // --------------------------------------------------

  if (storyIds.length) {
    await deleteMany(
      "story",
      {
        id: { in: storyIds },
      },
      "Stories"
    );
  }

  // --------------------------------------------------
  // 13. DELETE OWNED COLLECTIONS
  // --------------------------------------------------

  if (collectionIds.length) {
    await deleteMany(
      "collection",
      {
        id: { in: collectionIds },
      },
      "Collections"
    );
  }

  // --------------------------------------------------
  // 14. DELETE USER REFERRALS AND GROUP MEMBERSHIPS
  // --------------------------------------------------

  if (userId) {
    const referrals = await prisma.referral.findMany({
      where: {
        createdById: userId,
      },
      select: {
        id: true,
      },
    });

    const referralIds = referrals.map(
      (referral) => referral.id
    );

    if (referralIds.length) {
      // Remove references from users referred by this user.
      await prisma.user.updateMany({
        where: {
          referredById: {
            in: referralIds,
          },
        },
        data: {
          referredById: null,
        },
      });

      await deleteMany(
        "referralUse",
        {
          referralId: { in: referralIds },
        },
        "Referral usage"
      );
    }

    // Remove referral usage belonging to target user.
    await deleteMany(
      "referralUse",
      {
        userId,
      },
      "User referral usage"
    );

    await deleteMany(
      "referral",
      {
        createdById: userId,
      },
      "Referrals created"
    );

    await deleteMany(
      "userGroup",
      {
        userId,
      },
      "User group memberships"
    );
  }

  // --------------------------------------------------
  // 15. DELETE PROFILES
  // --------------------------------------------------

  if (profileIds.length) {
    await deleteMany(
      "profile",
      {
        id: { in: profileIds },
      },
      "Profiles"
    );
  }

  // --------------------------------------------------
  // 16. DELETE USER
  // --------------------------------------------------

  if (userId) {
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    log("User deleted.");
  }

  // --------------------------------------------------
  // 17. MARK DATABASE CLEANUP COMPLETE
  // --------------------------------------------------

  manifest.databaseCompleted = true;
  manifest.completedAt = new Date().toISOString();

  saveManifest(manifest);

  log("Database cleanup completed.");

  // --------------------------------------------------
  // 18. DELETE ALGOLIA RECORDS
  // --------------------------------------------------

  try {
    await deleteAlgoliaRecords(manifest);

    // Only remove manifest when every index succeeds.
    fs.unlinkSync(manifestPath);

    log("Algolia cleanup completed.");
    log("Recovery manifest removed.");
  } catch (error) {
    console.error(
      "\nAlgolia cleanup failed. Database deletion succeeded."
    );

    console.error(error);

    console.log("\nRecovery manifest preserved:");
    console.log(manifestPath);

    console.log("\nRetry Algolia cleanup using:");

    console.log(
      `node scripts/deleteUserData.js --retry-algolia="${manifestPath}"`
    );

    throw new Error(
      "Database deleted, but Algolia cleanup requires recovery."
    );
  }

  // --------------------------------------------------
  // 19. COMPLETE
  // --------------------------------------------------

  console.log("\n=================================");
  console.log("ACCOUNT DELETION COMPLETED");
  console.log("=================================");

  console.log({
    userId,
    profilesDeleted: profileIds.length,
    storiesDeleted: storyIds.length,
    collectionsDeleted: collectionIds.length,
    commentsDeleted: allCommentIds.size,
    algolia: "cleaned",
  });
}

// --------------------------------------------------
// EXECUTION
// --------------------------------------------------

main()
  .catch((error) => {
    console.error("\nDeletion error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
