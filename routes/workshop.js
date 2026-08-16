const express = require('express');
const prisma = require("../db");
const router = express.Router()
const{ generate} =require("random-words");
const shuffle = require('../utils/shuffle');
const { default: notifyUser } = require('../utils/notifyUser');
const sendNotification = require('../utils/sendNotifications');
const Paths = require('../utils/Paths');
const haversineDistance = require('../utils/haversineDistance');
const attachBlockedProfiles = require('../middleware/attechBlockedProfiles');
// const attachBlockedProfiles = require('../middleware/attechBlockedProfiles');




// Create or join a collection and add users and stories, max 6 users per collection
async function createOrJoinGroupCollection({ group, profile, story }) {
  // Check existing collections for any with roles matching group members (simulate find)
  // For simplicity, create a new collection here
  
  // Create a new collection (workshop)
  const newCollection = await prisma.collection.create({
    data: {
      title: generate({ min: 3, max: 6,join:" " }),
      type: "feedback",
      profileId: profile.id,
    
      followersAre: "writer",
      locationId: profile.locationId,
    },
  });

  // Add roles (users) to collection up to 6 max
  const limitedGroup = group.slice(0, 6);
  await Promise.all(
    limitedGroup.map(p =>
      prisma.roleToCollection.create({
        data: {
          role: "editor",
          profileId: p.id,
          collectionId: newCollection.id,
        },
      })
    )
  );

  // Add story to collection if provided
  if (story) {
    await prisma.storyToCollection.create({
      data: {
        storyId: story.id,
        collectionId: newCollection.id,
        profileId: profile.id,
      },
    });
    await prisma.story.update({
      where: { id: story.id },
      data:{
        status:"workshop",
      }
 
    });
  }

  // Return the filled collection including roles and stories for response
  return prisma.collection.findFirst({
    where: { id: newCollection.id },
    include: {
      roles: { include: { profile: true } },
      storyIdList: { include: { story: { include: { author: true } } } },
      location: true,
      profile: true,
    },
  });
}

// Create a solo collection for the single user
async function createSoloCollection({ profile, story }) {
  // Similar to above, but only the single user added
  
  const soloCollection = await prisma.collection.create({
    data: {
      title: generate({ min: 3, max: 6,join:" " }),
      type: "feedback",
      profileId: profile.id,
      followersAre: "writer",
      locationId: profile.locationId,
      isOpenCollaboration: false,
    },
  });

  await prisma.roleToCollection.create({
    data: {
      role: "editor",
      profileId: profile.id,
      collectionId: soloCollection.id,
    },
  });

  if (story) {
    
    await prisma.storyToCollection.create({
      data: {
        storyId: story.id,
        collectionId: soloCollection.id,
        profileId: profile.id,
      },
    });
    await prisma.story.update({
      where: { id: story.id },
      data: { status:"workshop" },
    });
  }

  return prisma.collection.findFirst({
    where: { id: soloCollection.id },
    include: {
      roles: { include: { profile: true } },
      storyIdList: { include: { story: { include: { author: true } } } },
      location: true,
      profile: true,
    },
  });
}
function groupUsersByProximity({ profile, items = [], radius = 50 }) {
  const groups = [];
  let ungrouped = [...items];

  while (ungrouped.length > 0) {
    const base = ungrouped.shift();
    const group = [base];

    ungrouped = ungrouped.filter(other => {
      if (!base.location || !other.location) return true;

      const distance = haversineDistance(base.location, other.location);

      if (distance <= radius) {
        group.push(other);
        return false;
      }
      return true;
    });

    groups.push(group);
  }

  return groups;
}
const createNewWorkshopCollection = async ({ profile, isGlobal = false }) => {
  const colName = generate({ min: 3, max: 6, join: " " });

  const role = await prisma.roleToCollection.create({
    data: {
      role: "owner",
      profile: { connect: { id: profile.id } },
      collection: {
        create: {
          title: colName,
          isPrivate: true,
          purpose: "Let's get feedback",
          isOpenCollaboration: false,
          type: "feedback",
          isGlobal, // ✅ IMPORTANT
          profile: { connect: { id: profile.id } },
          ...(profile.location && !isGlobal && {
            location: { connect: { id: profile.location.id } },
          }),
        },
      },
    },
    include: {
      collection: {
        include: {
          roles: true,
          storyIdList: true,
          location: true,
        },
      },
      profile: true,
    },
  });

  return role.collection; // ✅ FIXED
};

const findCollection= async({id})=>{
  return prisma.collection.findFirst({where:{id:
    {equals:id}},
  include:{
    location:true,
    storyIdList:{
      include:{
        story:{
          include:{
            author:true
          }
        }
      }
    },
    roles:{
      include:{
        profile:true
      }
    }
  }})
}
  function groupStoryByProximity({ profile, items = [], radius = 50 }) {
  const groups = [];
  let ungrouped = [...items];

  while (ungrouped.length > 0) {
    const base = ungrouped.shift();
    const group = [base];

    ungrouped = ungrouped.filter(other => {
      if (!base.author?.location || !other.author?.location) return true;

      const distance = haversineDistance(
        base.author.location,
        other.author.location
      );

      if (distance <= radius) {
        group.push(other);
        return false;
      }
      return true;
    });

    groups.push(group);
  }

  return groups;
}
 function groupItemsByCount({ items = [], groupSize = 6 }) {
  const groups = [];
  let pool = [...items];

  while (pool.length > 0) {
    const group = [];
    const usedAuthors = new Set();

    let i = 0;

    while (group.length < groupSize && i < pool.length) {
      const item = pool[i];

      if (item?.authorId && !usedAuthors.has(item.authorId)) {
        group.push(item);
        usedAuthors.add(item.authorId);
        pool.splice(i, 1);
      } else {
        i++;
      }
    }

    groups.push(group);
  }

  return groups;
}
function groupColsByProximity({ profile, items = [], radius = 50 }) {
  const result = [];

  for (const col of items) {
   if (!col.location || !profile.location) {
  result.push(col); // fallback include
  continue;
}

    const distance = haversineDistance(profile.location, col.location);

    if (distance <= radius) {
      result.push(col);
    }
  }

  return result;
}
module.exports = function (authMiddleware) {
    const withBlocks = [authMiddleware, attachBlockedProfiles];



router.post('/look', withBlocks, async (req, res) => {
  try {
    const { radius: queryRadius = 50, skip: rawSkip = 0, take: rawTake = 10 } = req.query;
    const global = req.query.global === 'true';
    const type = req.query.type || 'feedback';
   const skip = Math.max(0, Number.parseInt(rawSkip, 10) || 0);
const take = Math.min(
  50,
  Math.max(1, Number.parseInt(rawTake, 10) || 10)
);

    const blockedProfileIds = req.blockedProfileIds ?? [];
    const { location: locale } = req.body;
    const profileId = req.user?.profiles?.[0]?.id;

    const profile = profileId
      ? await prisma.profile.findUnique({
          where: { id: profileId },
          include: { location: true },
        })
      : null;

    const blockedFilter =
      blockedProfileIds.length > 0
        ? {
            roles: {
              none: {
                profileId: { in: [profile.id,blockedProfileIds ]},
              },
            },
            profileId: { notIn:[profile.id, blockedProfileIds] },
          }
        : {};
if (global || !profile || (!locale && !profile.location)) {

      const [groups, totalCount] = await Promise.all([
        prisma.collection.findMany({
          where: {
            type,
           
            isGlobal: true,
            ...blockedFilter,
          },
          skip,
          take,
          include: { location: true, roles: { include: { profile: true } } },
        }),
        prisma.collection.count({
          where: {
            type,
            isGlobal: true,
            ...blockedFilter,
          },
        }),
      ]);

      return res.send({
        groups,
        totalCount,
        message: 'Public/global search',
      });
    }

 const location = locale ?? profile.location;
    if (!location) {
      return res.status(400).json({ error: 'Location required for local search' });
    }

 const { latitude, longitude } = location;

if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
  return res.status(400).json({
    error: "Valid latitude and longitude are required for local search",
  });
}
    const userLocation =
      (await prisma.location.findFirst({  where: {
          location_coords: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },})) ||
      (await prisma.location.create({ data: { latitude, longitude } }));

    // await prisma.profile.update({
    //   where: { id: profileId },
    //   data: { locationId: userLocation.id },
//     // });
// await prisma.profile.update({
//   where: { id: profileId },
//   data: { locationId: userLocation.id },
// });



    const collections = await prisma.collection.findMany({
      where: {
        type,
        // isPrivate:false,
        locationId: { not: null },
        isGlobal: false,
        ...blockedFilter,
      },
      include: { location: true, roles: { include: { profile: true } } },
    });

    let groups = [];
    const parsedRadius = Number(queryRadius);
const step = Number.isFinite(parsedRadius) && parsedRadius > 0
  ? parsedRadius
  : 50;
    let rad = step;
    const MAX_RADIUS = step * 3;

    while (groups.length < 5 && rad <= MAX_RADIUS) {
      // groups = filterAvailableCollections({
      //   profile,
      //   collections,
      //   radius: rad,
      //   blockedProfileIds,
      // }) ?? [];
      groups = filterAvailableCollections({
  profile: { ...profile, location },
  collections,
  radius: rad,
  blockedProfileIds,
}) ?? [];
      rad += step;
    }

    if (groups.length < 5 && type === 'feedback') {
      // Seed collection is owned by an admin profile, chosen at random, so
      // it's independent of any one user's search or any single admin account.
      const adminProfiles = await prisma.profile.findMany({
        where: { isAdmin: true },
      });

      if (adminProfiles.length > 0) {
        const adminProfile =
          adminProfiles[Math.floor(Math.random() * adminProfiles.length)];

        const existingSeed = await prisma.collection.findFirst({
          where: {
            type,
            isGlobal: false,
            locationId: userLocation.id,
            profileId: { in: adminProfiles.map((a) => a.id) },
          },
          include: { location: true, roles: { include: { profile: true } } },
        });

        let seedCollection = existingSeed;

        if (!seedCollection) {
          seedCollection = await prisma.collection.create({
            data: {
              title: generate({ min: 3, max: 6, join: ' ' }),
              type,
              profile: { connect: { id: adminProfile.id } },
              location: { connect: { id: userLocation.id } },
              followersAre: "writer",
              roles: {
                create: {
                  role: "editor",
                  profile: { connect: { id: adminProfile.id } },
                },
              },
            },
            include: { location: true, roles: { include: { profile: true } } },
          });

          try {
            const title = "New workshop seeded";
            const body = "A new local workshop was created for a thin search area";
            const route = Paths.collection.createRoute(seedCollection.id);

            await Promise.all(
              adminProfiles.map((a) =>
                Promise.all([
                  notifyUser({
                    profileId: a.id,
                    type: "WORKSHOP_SEEDED",
                    title,
                    body,
                    entityId: seedCollection.id,
                    actorId: adminProfile.id,
                    route,
                  }).catch((err) =>
                    console.error("[notifyUser] WORKSHOP_SEEDED failed:", err)
                  ),
                  sendNotification(a.id, title, body, {
                    type: "WORKSHOP_SEEDED",
                    entityId: seedCollection.id,
                    actorId: adminProfile.id,
                    route,
                  }).catch((err) =>
                    console.error("[sendNotification] WORKSHOP_SEEDED failed:", err)
                  ),
                ])
              )
            );
          } catch (err) {
            console.error("[notify] admin seed notify failed:", err);
          }
        }

       if (
  seedCollection.roles.length < 6 &&
  !blockedProfileIds.includes(seedCollection.profileId) &&
  !seedCollection.roles.some(r => blockedProfileIds.includes(r.profileId))
) {
  groups.push(seedCollection);
}
    
      }
    }

    if (groups.length < 5) {
const candidateGroups = await prisma.collection.findMany({
  where: {
    type,
    isGlobal: true,
    ...blockedFilter,
  },
  include: {  roles: { include: { profile: true } } },
});

const globalGroups = candidateGroups
  .filter(g => g.roles.length <= 5)
  .slice(0, 5 - groups.length);

      groups = [...groups, ...globalGroups];
    }

 return res.send({
  groups,
  totalCount: groups.length,
  message: 'Personalized search',
});
  } catch (error) {
    console.error('LOOK_ERROR', error);
    return res.status(500).json({ error: 'Server error' });
  }
});
router.get("/profile/workshops", withBlocks, async (req, res) => {
  try{
    const profile = req.user.profiles?.[0];
 
    if (!profile) {
      return res.status(400).json({ error: "No profile found for this user" });
    }
  const groups = await prisma.collection.findMany({where:{AND:[
      {roles:{
        some:{
         profileId:{
          equals:profile.id
         }
            
          
        }
      }}
   ,{
    type:{equals:"feedback"}
   } ]},include:{
    storyIdList:{
      include:{
        story:{
          include:{
            author:true
          }
        }
      }
    },
    roles:{
      include:{
        profile:true
      }
    }
   }})
  res.send({groups:groups})
}catch(err){

  res.send({error:err})
  
}
})
//



router.post("/group/join", withBlocks, async (req, res) => {
  try {
    const { story,  location } = req.body;
    const profileId = req.user?.profiles[0]?.id;
if (!profileId) {
  return res.status(401).json({ error: "Authenticated profile required" });
}
const profile = await prisma.profile.findFirst({where:{
  id:{equals:profileId}
}})
    const storyId = story?.id ?? null;
    const radius = parseFloat(req.query.radius) || 50;
    const isGlobal = req.query.global == 'true';
    const blockedProfileIds = req.blockedProfileIds ?? [];

    if (!profile?.id) {
      return res.status(400).json({ error: "Profile required" });
    }

    const prof = await prisma.profile.findUnique({
      where: { id: profile.id },
      include: { location: true },
    });
if (story?.id) {
  await assertStoryOwnership({
    storyId: story.id,
    profileId,
  });
}
    if (!prof) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // ─── LOCATION RESOLUTION ─────────────────────────
    let resolvedLocation = prof.location;
const hasCoordinates =
  Number.isFinite(location?.latitude) &&
  Number.isFinite(location?.longitude);
    if (hasCoordinates) {
      resolvedLocation = await prisma.location.upsert({
        where: {
          location_coords: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },
        update: {
          latitude: location.latitude,
          longitude: location.longitude,
          city: location?.name?.split(",")[0] || "Unknown",
        },
        create: {
          latitude: location.latitude,
          longitude: location.longitude,
          city: location?.name?.split(",")[0] || "Unknown",
        },
      });
    }
if (hasCoordinates && resolvedLocation?.id) {
  await prisma.profile.update({
    where: { id: prof.id },
    data: {
      locationId: resolvedLocation.id,
    },
  });

  prof.location = resolvedLocation;
}
    if (!isGlobal && !resolvedLocation?.id) {
      return res.json({
        joined: false,
        error: "Location required to join or create local groups.",
      });
    }

    // ─── FIND COLLECTIONS ─────────────────────────
    let availableCollections = [];

    if (isGlobal) {
      const blockedCollectionFilter = getBlockedCollectionFilter(blockedProfileIds);
      const collections = await prisma.collection.findMany({
        where: {
  AND: [
    { type: "feedback" },
    { isGlobal: true },

    {
      roles: {
        none: {
          profileId: prof.id,
        },
      },
    },
    {
      profileId: {
        notIn: [
          prof.id,
          process.env.PLUMBUM_PROFILE_ID,
          ...blockedProfileIds,
        ].filter(Boolean),
      },
    },
    blockedCollectionFilter,
  ],
},
        include: {
          location: true,
          childCollections: { include: { childCollection: true } },
          roles: { include: { profile: true } },
          storyIdList: {
            include: { story: { include: { author: true } } },
          },
        },
      });

      availableCollections = collections.filter(col => col.roles.length < 6);
    } else {
      const profWithLocation = { ...prof, location: resolvedLocation };

  const allCollections = await getEligibleCollections({
  profileId: prof.id,
  blockedProfileIds,
});

       availableCollections = filterAvailableCollections({
        profile: profWithLocation,
        collections: allCollections,
        radius,
        blockedProfileIds,
      });
    }

    // ─── JOIN EXISTING ─────────────────────────
    if (availableCollections.length > 0) {
      const col =
        availableCollections[
          Math.floor(Math.random() * availableCollections.length)
        ];

      if (isGlobal) {
       
await addProfileToCollection({
  profileId: prof.id,
  collection: col,
  role: "writer",
});
        if (storyId) {
          await createStoryToCollection({
            storyId,
            collectionId: col.id,
            profileId: prof.id,
          });

          await prisma.story.update({
            where: { id: storyId },
            data: { status: "workshop" },
          });
        }

        const workshopCollection = await prisma.collection.findFirst({
          where: { id: col.id },
          include: {
            roles: { include: { profile: true } },
            storyIdList: {
              include: { story: { include: { author: true } } },
            },
          },
        });

        try {
          const existingMembers = col.roles.filter(r => r.profileId !== prof.id);
          const title = "New member joined";
          const body  = "Someone joined your workshop";
          const route = Paths.collection.createRoute(col.id);

          await Promise.all(
            existingMembers.map((r) =>
              Promise.all([
                notifyUser({
                  profileId: r.profileId,
                  type: "WORKSHOP_JOIN",
                  title,
                  body,
                  entityId: col.id,
                  actorId: prof.id,
                  route,
                }).catch((err) =>
                  console.error("[notifyUser] WORKSHOP_JOIN failed:", err)
                ),
                sendNotification(r.profileId, title, body, {
                  type: "WORKSHOP_JOIN",
                  entityId: col.id,
                  actorId: prof.id,
                  route,
                }).catch((err) =>
                  console.error("[sendNotification] WORKSHOP_JOIN failed:", err)
                ),
              ])
            )
          );
        } catch (err) {
          console.error("[notify] existing members WORKSHOP_JOIN failed:", err);
        }

        return res.json({
          joined: true,
          created: false,
          collection: workshopCollection,
        });
      } else {

const roleRecord = await addProfileToCollection({
  profileId: prof.id,
  collection: col,
  role: "editor",
});

        if (storyId) {
          await attachStory({
            storyId,
            collectionId: col.id,
            profileId: prof.id,
          });
        }

        // Notify existing members — same defensive pattern as the global branch above.
        try {
          const existingMembers = col.roles.filter(r => r.profileId !== prof.id);
          const title = "New member joined";
          const body  = "Someone joined your workshop";
          const route = Paths.collection.createRoute(col.id);

          await Promise.all(
            existingMembers.map((r) =>
              Promise.all([
                notifyUser({
                  profileId: r.profileId,
                  type: "WORKSHOP_JOIN",
                  title,
                  body,
                  entityId: col.id,
                  actorId: prof.id,
                  route,
                }).catch((err) =>
                  console.error("[notifyUser] WORKSHOP_JOIN failed:", err)
                ),
                sendNotification(r.profileId, title, body, {
                  type: "WORKSHOP_JOIN",
                  entityId: col.id,
                  actorId: prof.id,
                  route,
                }).catch((err) =>
                  console.error("[sendNotification] WORKSHOP_JOIN failed:", err)
                ),
              ])
            )
          );
        } catch (err) {
          console.error("[notify] existing members WORKSHOP_JOIN failed:", err);
        }

        return res.json({
          joined: true,
          created: false,
          collection: roleRecord.collection,
        });
      }
    }

    // ─── CREATE NEW ─────────────────────────
    let newCollection;

    if (isGlobal) {
      newCollection = await createNewWorkshopCollection({
        profile: prof,
        isGlobal,
      });

      if (!newCollection) {
        return res
          .status(500)
          .json({ error: "Failed to create workshop collection" });
      }

      await prisma.roleToCollection.upsert({
        where: {
          profileId_collectionId: {
            profileId: prof.id,
            collectionId: newCollection.id,
          },
        },
        update: {
          role: "owner",
        },
        create: {
          profileId: prof.id,
          collectionId: newCollection.id,
          role: "owner",
        },
      });

      if (storyId) {
        await createStoryToCollection({
          storyId,
          collectionId: newCollection.id,
          profileId: prof.id,
        });

        await prisma.story.update({
          where: { id: storyId },
          data: { status: "workshop" },
        });
      }

      const stories = await prisma.story.findMany({
        where: {
          status: "workshop",
          authorId: { not: prof.id },
        },
        include: {
          author: {
            include: {
              location: true,
            },
          },
        },
        orderBy: {
          updated: "desc",
        },
      });

      const shuffled = shuffle(stories);
      const selectedStories = pickUniqueAuthors(shuffled, 6);

      let addedCount = 0;

      for (const s of selectedStories) {
        if (addedCount >= 6) break;

        const existing = await prisma.storyToCollection.findFirst({
          where: {
            storyId: s.id,
            collectionId: newCollection.id,
          },
        });

        if (existing) continue;

        await prisma.roleToStory.upsert({
          where: {
            profileId_storyId: {
              profileId: prof.id,
              storyId: s.id,
            },
          },
          create: {
            role: "commenter",
            storyId: s.id,
            profileId: prof.id,
          },
          update: {
            storyId: s.id,
            profileId: prof.id,
            role: "commenter",
          },
        });

        await prisma.roleToCollection.upsert({
          where: {
            profileId_collectionId: {
              profileId: s.authorId,
              collectionId: newCollection.id,
            },
          },
          update: {},
          create: {
            collectionId: newCollection.id,
            profileId: s.authorId,
            role: "writer",
          },
        });

        try {
          const title = "Added to a new workshop";
          const body  = "Your story was added to a new workshop — come say hi";
          const route = Paths.collection.createRoute(newCollection.id);

          await Promise.all([
            notifyUser({
              profileId: s.authorId,
              type: "WORKSHOP_JOIN",
              title,
              body,
              entityId: newCollection.id,
              actorId: prof.id,
              route,
            }).catch((err) =>
              console.error("[notifyUser] WORKSHOP_JOIN failed:", err)
            ),
            sendNotification(s.authorId, title, body, {
              type: "WORKSHOP_JOIN",
              entityId: newCollection.id,
              actorId: prof.id,
              route,
            }).catch((err) =>
              console.error("[sendNotification] WORKSHOP_JOIN failed:", err)
            ),
          ]);
        } catch (err) {
          console.error("[notify] new workshop author notify failed:", err);
        }

        await createStoryToCollection({
          storyId: s.id,
          collectionId: newCollection.id,
        });

        addedCount++;
      }

      if (addedCount === 0) {
        const pool = await getActiveProfilesPool({
  excludeProfileId: prof.id,
  blockedProfileIds,
});
        await notifyFreshWorkshopNeedsWriters({
          collection: newCollection,
          owner: prof,
          recipients: pool,
        }).catch((err) =>
          console.error("[notify] fresh global workshop failed:", err)
        );
      }
    } else {
      if (!resolvedLocation?.id) {
        throw new Error("Invalid location");
      }

      const adminProfiles = await prisma.profile.findMany({
        where: { isAdmin: true },
      });

      const adminProfile = adminProfiles.length
        ? adminProfiles[Math.floor(Math.random() * adminProfiles.length)]
        : null;

      newCollection = await prisma.collection.create({
        data: {
          type: "feedback",
          location: { connect: { id: resolvedLocation.id } },
          title: generate({ min: 3, max: 6, join: " " }),
          isGlobal: false,
          followersAre: "writer",
          profile: { connect: { id: prof.id } },
          roles: {
            create: {
              role: "owner",
              profile: { connect: { id: prof.id } },
            },
          },
        },
        include: {
          roles: { include: { profile: true } },
          location: true,
        },
      });

      if (adminProfile) {
        await prisma.roleToCollection.upsert({
          where: {
            profileId_collectionId: {
              profileId: adminProfile.id,
              collectionId: newCollection.id,
            },
          },
          update: { role: "writer" },
          create: {
            profileId: adminProfile.id,
            collectionId: newCollection.id,
            role: "writer",
          },
        });

        // Admin owner never needs a notify here — an admin was just added
        // as a member, not the workshop's owner. This tells them they were
        // added, same shape as the "existing members" notify elsewhere.
        try {
          const title = "Added to a new workshop";
          const body  = "You were added as the first member of a new local workshop";
          const route = Paths.collection.createRoute(newCollection.id);

          await Promise.all([
            notifyUser({
              profileId: adminProfile.id,
              type: "WORKSHOP_JOIN",
              title,
              body,
              entityId: newCollection.id,
              actorId: prof.id,
              route,
            }).catch((err) =>
              console.error("[notifyUser] WORKSHOP_JOIN failed:", err)
            ),
            sendNotification(adminProfile.id, title, body, {
              type: "WORKSHOP_JOIN",
              entityId: newCollection.id,
              actorId: prof.id,
              route,
            }).catch((err) =>
              console.error("[sendNotification] WORKSHOP_JOIN failed:", err)
            ),
          ]);
        } catch (err) {
          console.error("[notify] admin WORKSHOP_JOIN failed:", err);
        }
      }

      if (storyId) {
        await attachStory({
          storyId,
          collectionId: newCollection.id,
          profileId: prof.id,
        });
      }
const nearby = await getNearbyActiveProfiles({
  location: resolvedLocation,
  radius,
  excludeProfileId: prof.id,
  blockedProfileIds,
});
      // Pull in other nearby writers too, beyond the admin.
      // const nearby = await getNearbyActiveProfiles({
      //   location: resolvedLocation,
      //   radius,
      //   excludeProfileId: prof.id,
      // });
      await notifyFreshWorkshopNeedsWriters({
        collection: newCollection,
        owner: prof,
        recipients: nearby,
      }).catch((err) =>
        console.error("[notify] fresh local workshop failed:", err)
      );
    }

    newCollection = await prisma.collection.findFirst({
      where: { id: newCollection.id },
      include: {
        roles: { include: { profile: true } },
        storyIdList: {
          include: { story: { include: { author: true } } },
        },
      },
    });

    return res.json({
      joined: true,
      created: true,
      collection: newCollection,
    });

  // } catch (error) {
    } catch (error) {
  console.error("GROUP ERROR:", error);

  return res.status(error.statusCode || 500).json({
    error: error.message || "Server error",
  });
}

  // }
});
async function findOrCreateLocation({latitude, longitude,city=""}) {
  // 1. Try to find existing location
 
  let locale = await prisma.location.findFirst({
     where: {
          location_coords: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
     }}
  );

  // 2. If not found, try to create it
  if (!locale) {
    try {
      locale = await prisma.location.create({
        data: { latitude, longitude,city },
      });
    
    } catch (err) {
      // 3. Handle race condition (unique constraint)
      if (err.code === "P2002") {
        locale = await prisma.location.findFirst({
     where: {
          location_coords: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },
        });
        if (!locale) {
          throw new Error(
            "Failed to fetch location after P2002 – this should never happen"
          );
        }
      } else {
        throw err;
      }
    }
  }

  return locale;
}
    router.post('/active-users',authMiddleware, async (req, res) => {
      try {
   
const { story, location } = req.body;

const profileId = req.user?.profiles?.[0]?.id;
if (!profileId) {
  return res.status(401).json({ error: "Authenticated profile required" });
}
const profile = await prisma.profile.findUnique({
  where: { id: profileId },
});

if (!profile) {
  return res.status(404).json({ error: "Profile not found" });
}
       if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
  return res.status(400).json({ error: "Valid location required" });
}
       const userLocation = await findOrCreateLocation({...location})
        const prof = await prisma.profile.update({
          where:{
            id:profile.id
      },data:{
        isActive:true,
        locationId: userLocation.id
      }});

    const profiles = await prisma.profile.findMany({where:{
        isActive:{
          equals:true
        }
      }})
      if (story?.id) {
  await assertStoryOwnership({
    storyId: story.id,
    profileId,
  });
}
      if (story?.id) {
        const stor = await prisma.story.update({where:{id:story.id
        },data:{
          status:"workshop",
         
        }})
          return  res.json({ profile:prof,story:stor,profiles});
      }else{
        return res.json({ profile:prof,story:null,profiles});
      }
    
      } catch (error) {
  console.error("ACTIVE_USERS_ERROR", error);

return res.status(error.statusCode || 500).json({
  error: error.message || "Server error",
});
      }
    });
  


    return router;}
    async function getNearbyProfiles({ profileId, radius }) {
      return prisma.profile.findMany({
        where: { isActive: true, location: { isNot: null } },
        include: { location: true, stories: { where: { status:"workshop" } } },
      });
    }
    function getBlockedCollectionFilter(blockedProfileIds = []) {
  if (!blockedProfileIds.length) {
    return {};
  }

  return {
    AND: [
      {
        profileId: {
          notIn: blockedProfileIds,
        },
      },
      {
        roles: {
          none: {
            profileId: {
              in: blockedProfileIds,
            },
          },
        },
      },
    ],
  };
}
async function getEligibleCollections({
  profileId,
  blockedProfileIds = [],
}) {
  const excludedOwnerIds = [
    profileId,
    process.env.PLUMBUM_PROFILE_ID,
    ...blockedProfileIds,
  ].filter(Boolean);

  return prisma.collection.findMany({
    where: {
      AND: [
        { type: "feedback" },
        { isGlobal: false },
        { location: { isNot: null } },
        { isOpenCollaboration: { not: true } },
        {
          profileId: {
            notIn: excludedOwnerIds,
          },
        },
        getBlockedCollectionFilter(blockedProfileIds),
      ],
    },
    include: {
      location: true,
      roles: { include: { profile: true } },
      storyIdList: {
        include: {
          story: {
            include: {
              author: true,
            },
          },
        },
      },
    },
  });
}
    // Helper: Find eligible collections by proximity

  function filterAvailableCollections({ profile, collections, radius, blockedProfileIds = [] }) {
  const nearby = groupColsByProximity({
    profile,
    items: collections,
    radius,
  });

  return nearby.filter(
    col =>
      col.roles.length < 6 &&
      !col.roles.some(role => role.profile.id === profile.id) &&
      !col.roles.some(role => blockedProfileIds.includes(role.profile.id))
  );
}
async function addProfileToCollection({
  profileId,
  collection,
  role = "editor",
}) {
  return prisma.roleToCollection.upsert({
    where: {
      profileId_collectionId: {
        profileId,
        collectionId: collection.id,
      },
    },
    update: {},
    create: {
      role,
      profile: { connect: { id: profileId } },
      collection: { connect: { id: collection.id } },
    },
    include: {
      collection: {
        include: {
          roles: { include: { profile: true } },
          location: true,
        },
      },
      profile: true,
    },
  });
}
  async function attachStory({ storyId, collectionId, profileId }) {
      await createStoryToCollection({ storyId, collectionId, profileId });
      await prisma.story.update({ where: { id: storyId }, data: { status:"workshop" } });
    }

async function createStoryToCollection({ storyId, collectionId, profileId }) {
  if (!storyId || !collectionId) {
    console.warn("Skipping StoryToCollection insert: missing storyId or collectionId");
    return null;
  }

  return prisma.storyToCollection.upsert({
    where: {
      storyId_collectionId: {
        storyId,
        collectionId,
      },
    },
    update: { profileId },
    create: {
      storyId,
      collectionId,
      profileId,
    },
  });
}

function pickUniqueAuthors(items = [], limit = 6) {
  const result = [];
  const seenAuthors = new Set();

  for (const item of items) {
    if (!item?.id) continue;
    if (!item?.authorId) continue;

    if (seenAuthors.has(item.authorId)) continue;

    seenAuthors.add(item.authorId);
    result.push(item);

    if (result.length >= limit) break;
  }

  return result;
}

async function notifyFreshWorkshopNeedsWriters({ collection, owner, recipients }) {
  if (!recipients.length) return;

  const title = "A new workshop needs writers";
  const body = `${owner.displayName || "Someone"} just started a workshop — join and give feedback`;
  const route = Paths.workshop.reader()

  await Promise.all(
    recipients.map((r) =>
      Promise.all([
        notifyUser({
          profileId: r.id,
          type: "WORKSHOP_NEEDS_WRITERS",
          title,
          body,
          entityId: collection.id,
          actorId: owner.id,
          route,
        }).catch((err) =>
          console.error("[notifyUser] WORKSHOP_NEEDS_WRITERS failed:", err)
        ),
        sendNotification(r.id, title, body, {
          type: "WORKSHOP_NEEDS_WRITERS",
          entityId: collection.id,
          actorId: owner.id,
          route,
        }).catch((err) =>
          console.error("[sendNotification] WORKSHOP_NEEDS_WRITERS failed:", err)
        ),
      ])
    )
  );
}
async function getNearbyActiveProfiles({
  location,
  radius = 50,
  excludeProfileId,
  blockedProfileIds = [],
  cap = 15,
}) {
  if (!location) return [];

  const excludedProfileIds = [
    excludeProfileId,
    ...blockedProfileIds,
  ].filter(Boolean);

  const candidates = await prisma.profile.findMany({
    where: {
      devices: {
        some: {},
      },
      id: {
        notIn: excludedProfileIds,
      },
      location: {
        isNot: null,
      },
    },
    include: {
      location: true,
    },
  });

  const nearby = candidates.filter((candidate) => {
    return haversineDistance(location, candidate.location) <= radius;
  });

  return nearby.slice(0, cap);
}

async function getActiveProfilesPool({
  excludeProfileId,
  blockedProfileIds = [],
  cap = 15,
}) {
  const excludedProfileIds = [
    excludeProfileId,
    ...blockedProfileIds,
  ].filter(Boolean);

  return prisma.profile.findMany({
    where: {
      isActive: true,
      id: {
        notIn: excludedProfileIds,
      },
    },
    take: cap,
  });
}
async function assertStoryOwnership({ storyId, profileId }) {
  if (!storyId) return null;

  const dbStory = await prisma.story.findUnique({
    where: { id: storyId },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!dbStory) {
    const error = new Error("Story not found");
    error.statusCode = 404;
    throw error;
  }

  if (dbStory.authorId !== profileId) {
    const error = new Error("You do not own this story");
    error.statusCode = 403;
    throw error;
  }

  return dbStory;
}