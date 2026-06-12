const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_COLLECTIONS = {
  home: {
    title: "Home",
    purpose: "Add collections here to keep up with their updates",
    isOpenCollaboration: false,
    isPrivate: true,
  },
  portfolio: {
    title: "Portfolio",
    purpose: "Showcase your work and collaborations",
    isOpenCollaboration: false,
    isPrivate: true,
  },
  events: {
    title: "Events",
    purpose: "Keep track of events you're attending or hosting",
    isOpenCollaboration: false,
    isPrivate: true,
  },
  archive: {
    title: "Archive",
    purpose: "Save things for later",
    isOpenCollaboration: false,
    isPrivate: true,
  },
};

// ─── Per-profile function (safe to call from createNewProfileForUser too) ─────

/**
 * Adds any missing default collection types to a single profile.
 * Idempotent — safe to re-run; skips types that already have a profileToCollection row.
 * No $transaction (MongoDB standalone doesn't support it).
 * If the profileToCollection link fails after the collection is created,
 * the orphaned collection is deleted so a re-run starts clean.
 */
async function addDefaultCollections(
  profileId,
  types = ["home", "portfolio", "events", "archive"]
) {
  const existing = await prisma.profileToCollection.findMany({
    where: { profileId, type: { in: types } },
    select: { type: true },
  });

  const existingTypes = new Set(existing.map((e) => e.type));
  const missing = types.filter((t) => !existingTypes.has(t));

  if (missing.length === 0) return { profileId, added: [] };

  const added = [];

  for (const type of missing) {
    const col = await prisma.collection.create({
      data: {
        ...DEFAULT_COLLECTIONS[type],
        profile: { connect: { id: profileId } },
      },
    });

    try {
      await prisma.profileToCollection.create({
        data: {
          type,
          collection: { connect: { id: col.id } },
          profile: { connect: { id: profileId } },
        },
      });
      added.push(type);
    } catch (err) {
      // Link failed — delete the orphan so a re-run starts clean
      await prisma.collection.delete({ where: { id: col.id } }).catch(() => {});
      throw err;
    }
  }

  return { profileId, added };
}

// ─── Batch runner ─────────────────────────────────────────────────────────────

async function backfillDefaultCollections() {
  const profiles = await prisma.profile.findMany({ select: { id: true } });

  console.log(`Backfilling ${profiles.length} profiles...`);

  let totalAdded = 0;
  const errors = [];

  for (const { id } of profiles) {
    try {
      const { added } = await addDefaultCollections(id);
      if (added.length > 0) {
        console.log(`  ${id} → added [${added.join(", ")}]`);
        totalAdded += added.length;
      }
    } catch (err) {
      // Continue across all profiles; fix errors and re-run
      console.error(`  ${id} → ERROR: ${err.message}`);
      errors.push({ profileId: id, error: err.message });
    }
  }

  console.log(
    `\nDone. Added ${totalAdded} collections across ${profiles.length} profiles.`
  );

  if (errors.length > 0) {
    console.warn(`\n${errors.length} profile(s) failed:`);
    errors.forEach(({ profileId, error }) =>
      console.warn(`  ${profileId}: ${error}`)
    );
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

backfillDefaultCollections()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

module.exports = { addDefaultCollections, backfillDefaultCollections };