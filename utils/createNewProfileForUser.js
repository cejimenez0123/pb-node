

// const prisma = require("../db");
// const findProfile = require("./findProfile");

// module.exports = async function createNewProfileForUser({
//   username,
//   selfStatement,
//   isPrivate,
//   userId,
//   writingSprintSlots,
// }) {
//   const profile = await prisma.profile.create({
//     data: {
//       username: username?.toLowerCase(),
//       profilePictureId: null,
//       profilePic: null,
//       selfStatement,
//       isPrivate,
//       writingSprintSlots,
//       user: {
//         connect: {
//           id: userId,
//         },
//       },
//     },
//   });

//   console.log(
//     "Created profile for userId:",
//     userId,
//     "Profile ID:",
//     profile.id
//   );

//   const collections = [
//     {
//       title: "Portfolio",
//       purpose: "Showcase your work and collaborations",
//       isPrivate: false,
//       type: "portfolio",
//     },
//     {
//       title: "Home",
//       purpose: "Add Collections to home to keep up with updates",
//       isPrivate: true,
//       type: "home",
//     },
//     {
//       title: "Events",
//       purpose: "Add Collections to home to keep up with updates",
//       isPrivate: true,
//       type: "events",
//     },
//     {
//       title: "Archive",
//       purpose: "Save things for later",
//       isPrivate: true,
//       type: "archive",
//     },
//   ];

//   for (const item of collections) {
//     const collection = await prisma.collection.create({
//       data: {
//         title: item.title,
//         purpose: item.purpose,
//         isOpenCollaboration: false,
//         isPrivate: item.isPrivate,
//         profile: {
//           connect: {
//             id: profile.id,
//           },
//         },
//       },
//     });

//     await prisma.profileToCollection.create({
//       data: {
//         collection: {
//           connect: {
//             id: collection.id,
//           },
//         },
//         type: item.type,
//         profile: {
//           connect: {
//             id: profile.id,
//           },
//         },
//       },
//     });
//   }

//   return findProfile(profile.id);
// };


const prisma = require("../db");
const findProfile = require("./findProfile");

module.exports = async function createNewProfileForUser({
  username,
  selfStatement,
  isPrivate,
  userId,
  writingSprintSlots,
}) {
  let profile;
  const createdCollectionIds = [];

  try {
    profile = await prisma.profile.create({
      data: {
        username: username?.toLowerCase(),
        profilePictureId: null,
        profilePic: null,
        selfStatement,
        isPrivate,
        writingSprintSlots,
        user: {
          connect: { id: userId },
        },
      },
    });

    const collections = [
      {
        title: "Portfolio",
        purpose: "Showcase your work and collaborations",
        isPrivate: false,
        type: "portfolio",
      },
      {
        title: "Home",
        purpose: "Add Collections to home to keep up with updates",
        isPrivate: true,
        type: "home",
      },
      {
        title: "Events",
        purpose: "Add Collections to home to keep up with updates",
        isPrivate: true,
        type: "events",
      },
      {
        title: "Archive",
        purpose: "Save things for later",
        isPrivate: true,
        type: "archive",
      },
    ];

    for (const item of collections) {
      const collection = await prisma.collection.create({
        data: {
          title: item.title,
          purpose: item.purpose,
          isOpenCollaboration: false,
          isPrivate: item.isPrivate,
          profile: {
            connect: { id: profile.id },
          },
        },
      });

      createdCollectionIds.push(collection.id);

      await prisma.profileToCollection.create({
        data: {
          collection: {
            connect: { id: collection.id },
          },
          type: item.type,
          profile: {
            connect: { id: profile.id },
          },
        },
      });
    }

    return await findProfile(profile.id);
  } catch (error) {
    // Remove join records before removing the collections.
    if (createdCollectionIds.length > 0) {
      try {
        await prisma.profileToCollection.deleteMany({
          where: {
            collectionId: {
              in: createdCollectionIds,
            },
          },
        });

        await prisma.collection.deleteMany({
          where: {
            id: {
              in: createdCollectionIds,
            },
          },
        });
      } catch (cleanupError) {
        console.error("Profile collection cleanup error:", cleanupError);
      }
    }

    if (profile?.id) {
      try {
        await prisma.profile.delete({
          where: { id: profile.id },
        });
      } catch (cleanupError) {
        console.error("Profile cleanup error:", cleanupError);
      }
    }

    throw error;
  }
};
