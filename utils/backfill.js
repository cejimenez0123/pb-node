// const prisma = require("../db");
// const DEFAULT_COLLECTIONS = {
//   home: {
//     title: "Home",
//     purpose: "Add collections here to keep up with their updates",
//     isOpenCollaboration: false,
//     isPrivate: true,
//   },
//   portfolio: {
//     title: "Portfolio",
//     purpose: "Showcase your work and collaborations",
//     isOpenCollaboration: false,
//     isPrivate: true,
//   },
//   events: {
//     title: "Events",
//     purpose: "Keep track of events you're attending or hosting",
//     isOpenCollaboration: false,
//     isPrivate: true,
//   },
//   archive: {
//     title: "Archive",
//     purpose: "Save things for later",
//     isOpenCollaboration: false,
//     isPrivate: true,
//   },
// };
// async function addDefaultCollections(
//   profileId,
//   types = ["home", "portfolio", "events", "archive"]
// ) {
//   // Find which of these types already exist so we never duplicate
//   const existing = await prisma.profileToCollection.findMany({
//     where: { profileId, type: { in: types } },
//     select: { type: true },
//   });
//   const existingTypes = new Set(existing.map((e) => e.type));
//   const missing = types.filter((t) => !existingTypes.has(t));

//   if (missing.length === 0) return { profileId, added: [] };

//   const added = [];
//   for (const type of missing) {
//     const col = await prisma.collection.create({
//       data: {
//         ...DEFAULT_COLLECTIONS[type],
//         profile: { connect: { id: profileId } },
//       },
//     });

//     try {
//       await prisma.profileToCollection.create({
//         data: {
//           type,
//           collection: { connect: { id: col.id } },
//           profile: { connect: { id: profileId } },
//         },
//       });
//       added.push(type);
//     } catch (err) {
//       // Link failed — delete the orphan collection so a re-run starts clean
//       await prisma.collection.delete({ where: { id: col.id } }).catch(() => {});
//       throw err;
//     }
//   }

//   return { profileId, added };
// }

// const doProfileBackfill = async () => {
//   const profiles = await prisma.profile.findMany({
//     where: {
//       isActive: true,
//     },
//     select: { id: true },
//   });

//   for (const { id } of profiles) {
//     try {
//       const result = await addDefaultCollections(id);
//       console.log(`Profile ${id}: added collections: ${result.added.join(", ")}`);
//     } catch (err) {
//       console.error(`Profile ${id}: failed to add collections -`, err);
//     }
//   }
// }
// module.exports = doProfileBackfill