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

    const profile = await prisma.profile.findUnique({
          where: { id: profileId },
          include: { location: true },
        })
    

    const blockedFilter =
      blockedProfileIds.length > 0
        ? {
            roles: {
              none: {
                profileId: { in: [profile.id,...blockedProfileIds ]},
              },
            },
            profileId: { notIn:[profile.id,... blockedProfileIds] },
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
    const profile = req.user?.profiles?.[0];
 
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
router.post('/group/join', async (req, res) => {
  try {
    const profileId = req.profile?.id || req.body?.profile?.id;
    const { story, location } = req.body;
    const mode = req.query.mode || "feedback";

    if (!profileId) {
      return res.status(401).json({
        error: "Profile is required",
      });
    }

    if (!["feedback", "reader"].includes(mode)) {
      return res.status(400).json({
        error: "Invalid workshop mode",
      });
    }

    /*
     * Get feedback workshops ordered by activity.
     *
     * Workshop activity is based on the most recently added story,
     * not Story.created.
     *
     * Empty workshops fall back to Collection.created.
     */
    const getWorkshops = async () => {
      const workshops = await prisma.collection.findMany({
        where: {
          type: "feedback",
          isWorkshop: true,
        },
        include: {
          roles: true,
          storyIdList: {
            orderBy: {
              created: "desc",
            },
            take: 1,
          },
        },
      });

      workshops.sort((a, b) => {
        const aActivity =
          a.storyIdList?.[0]?.created?.getTime?.() || 0;

        const bActivity =
          b.storyIdList?.[0]?.created?.getTime?.() || 0;

        if (aActivity === 0 && bActivity === 0) {
          const aCreated =
            a.created?.getTime?.() || 0;

          const bCreated =
            b.created?.getTime?.() || 0;

          return bCreated - aCreated;
        }

        if (aActivity === 0) {
          return 1;
        }

        if (bActivity === 0) {
          return -1;
        }

        return bActivity - aActivity;
      });

      return workshops;
    };

    /*
     * Only writers count toward the six-person workshop capacity.
     *
     * Commenters/readers can exist beyond six writers.
     */
    const getWriterCount = (workshop) => {
      return workshop.roles.filter(
        (role) => role.role === "writer"
      ).length;
    };

    const hasWriterCapacity = (workshop) => {
      return getWriterCount(workshop) < 6;
    };

    /*
     * Add a member if they don't already have a role
     * in the workshop.
     */
    const addMemberToWorkshop = async ({
      collectionId,
      profileId,
      role,
    }) => {
      const existingRole =
        await prisma.roleToCollection.findUnique({
          where: {
            profileId_collectionId: {
              profileId,
              collectionId,
            },
          },
        });

      if (existingRole) {
        return existingRole;
      }

      return prisma.roleToCollection.create({
        data: {
          profileId,
          collectionId,
          role,
          approved: true,
        },
      });
    };

    /*
     * Update the existing role rather than creating a second
     * RoleToCollection record.
     *
     * This is especially important when a commenter later
     * submits a story and becomes a writer.
     */
    const updateMemberRole = async ({
      collectionId,
      profileId,
      role,
    }) => {
      const existingRole =
        await prisma.roleToCollection.findUnique({
          where: {
            profileId_collectionId: {
              profileId,
              collectionId,
            },
          },
        });

      if (!existingRole) {
        return prisma.roleToCollection.create({
          data: {
            profileId,
            collectionId,
            role,
            approved: true,
          },
        });
      }

      if (existingRole.role === role) {
        return existingRole;
      }

      return prisma.roleToCollection.update({
        where: {
          id: existingRole.id,
        },
        data: {
          role,
        },
      });
    };

    /*
     * Add a story to a workshop.
     *
     * Returns:
     *   true  = story was newly assigned
     *   false = story was already assigned
     *
     * The return value is used as a queue-progress safety check.
     */
    const addStoryToWorkshop = async ({
      storyId,
      collectionId,
      profileId,
    }) => {
      const existingLink =
        await prisma.storyToCollection.findUnique({
          where: {
            storyId_collectionId: {
              storyId,
              collectionId,
            },
          },
        });

      if (existingLink) {
        return false;
      }

      await prisma.storyToCollection.create({
        data: {
          storyId,
          collectionId,
          profileId,
        },
      });

      await prisma.story.update({
        where: {
          id: storyId,
        },
        data: {
          status: "fragment",
          feedbackRequestedAt: null,
        },
      });

      return true;
    };

    /*
     * READER MODE
     *
     * Readers join an existing workshop.
     *
     * Prefer:
     *   1. Most recently active workshop with content
     *   2. Otherwise most recently created workshop
     *
     * Never create an empty workshop for a reader.
     */
    if (mode === "reader") {
      const workshops = await getWorkshops();

      let targetWorkshop = workshops.find(
        (workshop) => workshop.storyIdList.length > 0
      );

      if (!targetWorkshop) {
        targetWorkshop = workshops[0];
      }

      /*
       * There are no workshops yet.
       * A reader does not create one.
       */
      if (!targetWorkshop) {
        return res.json({
          joined: false,
          queued: false,
          created: false,
          collection: null,
        });
      }

      /*
       * Readers are commenters.
       *
       * Commenters do not consume one of the six writer slots.
       */
      const existingRole =
        await prisma.roleToCollection.findUnique({
          where: {
            profileId_collectionId: {
              profileId,
              collectionId: targetWorkshop.id,
            },
          },
        });

      if (!existingRole) {
        await addMemberToWorkshop({
          collectionId: targetWorkshop.id,
          profileId,
          role: "commenter",
        });
      }

      const collection = await prisma.collection.findUnique({
        where: {
          id: targetWorkshop.id,
        },
      });

      return res.json({
        joined: true,
        queued: false,
        created: false,
        collection,
      });
    }

    /*
     * FEEDBACK MODE
     */

    if (!story?.id) {
      return res.status(400).json({
        error: "Story is required",
      });
    }

    /*
     * A user can only request feedback for their own story.
     */
    const ownedStory = await prisma.story.findFirst({
      where: {
        id: story.id,
        authorId: profileId,
      },
    });

    if (!ownedStory) {
      return res.status(403).json({
        error: "You can only request feedback for your own story",
      });
    }

    /*
     * Don't enqueue the same story twice.
     */
    if (
      ownedStory.status === "workshop" &&
      ownedStory.feedbackRequestedAt
    ) {
      return res.json({
        joined: false,
        queued: true,
        created: false,
        collection: null,
        message: "Story is already waiting for feedback",
      });
    }

    /*
     * Put the story into the feedback pool.
     *
     * feedbackRequestedAt is the FIFO timestamp.
     */
    await prisma.story.update({
      where: {
        id: ownedStory.id,
      },
      data: {
        status: "workshop",
        feedbackRequestedAt: new Date(),
      },
    });

    let assignedCollectionId = null;

    /*
     * Process the feedback queue.
     *
     * Oldest requested stories are processed first.
     */
    while (true) {
      const queuedStories = await prisma.story.findMany({
        where: {
          status: "workshop",
          feedbackRequestedAt: {
            not: null,
          },
          authorId: {
            not: null,
          },
        },
        orderBy: {
          feedbackRequestedAt: "asc",
        },
      });

      if (queuedStories.length === 0) {
        break;
      }

      const queueBefore = queuedStories.length;

      /*
       * Get workshops ordered by most recent activity.
       */
      const workshops = await getWorkshops();

      /*
       * Fill the most recently active workshop that still
       * has writer capacity.
       */
      let targetWorkshop = workshops.find(
        (workshop) => hasWriterCapacity(workshop)
      );

      /*
       * Every existing workshop is full.
       *
       * Create a new workshop for the oldest queued story.
       */
      if (!targetWorkshop) {
        targetWorkshop = await prisma.collection.create({
          data: {
            title: "Feedback Workshop",
            purpose: "Let's get feedback",
            isPrivate: true,
            isWorkshop: true,
            type: "feedback",
            isGlobal: true,
            isOpenCollaboration: false,
            profileId: queuedStories[0].authorId,
            locationId: location?.id || undefined,
          },
          include: {
            roles: true,
            storyIdList: true,
          },
        });
      }

      let writerCount = getWriterCount(targetWorkshop);
      let processedStory = false;

      /*
       * Fill this workshop from the FIFO queue until it reaches
       * six writers.
       */
      for (const queuedStory of queuedStories) {
        if (writerCount >= 6) {
          break;
        }

        if (!queuedStory.authorId) {
          continue;
        }

        /*
         * Check whether this author is already a member.
         *
         * A commenter who submits a story becomes a writer.
         * The existing RoleToCollection record is updated.
         */
        const existingRole =
          targetWorkshop.roles.find(
            (role) =>
              role.profileId === queuedStory.authorId
          );

        if (existingRole) {
          if (existingRole.role !== "writer") {
            await updateMemberRole({
              collectionId: targetWorkshop.id,
              profileId: queuedStory.authorId,
              role: "writer",
            });

            existingRole.role = "writer";
            writerCount += 1;
          }
        } else {
          await addMemberToWorkshop({
            collectionId: targetWorkshop.id,
            profileId: queuedStory.authorId,
            role: "writer",
          });

          targetWorkshop.roles.push({
            profileId: queuedStory.authorId,
            role: "writer",
          });

          writerCount += 1;
        }

        /*
         * Attach the story to the workshop.
         *
         * `added` is the authoritative signal that this iteration
         * actually removed something from the feedback queue.
         */
        const added = await addStoryToWorkshop({
          storyId: queuedStory.id,
          collectionId: targetWorkshop.id,
          profileId: queuedStory.authorId,
        });

        /*
         * If the story was already attached, don't claim that
         * queue progress occurred.
         */
        if (!added) {
          continue;
        }

        processedStory = true;

        if (queuedStory.id === ownedStory.id) {
          assignedCollectionId = targetWorkshop.id;
        }

        if (writerCount >= 6) {
          break;
        }
      }

      /*
       * HARD SAFETY CHECK #1
       *
       * Nothing was actually assigned during this pass.
       * Stop rather than repeatedly processing the same queue.
       */
      if (!processedStory) {
        break;
      }

      /*
       * HARD SAFETY CHECK #2
       *
       * Verify that the feedback queue actually became smaller.
       *
       * If it did not, stop. This prevents an accidental future
       * change from creating an infinite processing loop.
       */
      const queueAfter = await prisma.story.count({
        where: {
          status: "workshop",
          feedbackRequestedAt: {
            not: null,
          },
          authorId: {
            not: null,
          },
        },
      });

      if (queueAfter >= queueBefore) {
        console.warn(
          "Workshop queue made no progress; stopping queue processor",
          {
            queueBefore,
            queueAfter,
            targetWorkshopId: targetWorkshop.id,
          }
        );

        break;
      }
    }

    /*
     * The user's story was successfully assigned.
     */
    if (assignedCollectionId) {
      const collection = await prisma.collection.findUnique({
        where: {
          id: assignedCollectionId,
        },
      });

      return res.json({
        joined: true,
        queued: false,
        created: false,
        collection,
      });
    }

    /*
     * The user's story remains in the FIFO feedback pool.
     */
    return res.json({
      joined: false,
      queued: true,
      created: false,
      collection: null,
    });
  } catch (error) {
    console.error("Workshop join error:", error);

    return res.status(500).json({
      error: error.message || "Unable to join workshop",
    });
  }
});





async function findOrCreateLocation({latitude, longitude,city=""}) {
  // 1. Try to find existing location
 
  let locale = await prisma.location.findFirst({
     where: {
          location_coords: {
            latitude: latitude,
            longitude: longitude,
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
            latitude: latitude,
            longitude: longitude,
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

       const userLocation =   location? await findOrCreateLocation({...location}):null
        const prof = userLocation ? await prisma.profile.update({
          where:{
            id:profile.id
      },data:{
        isActive:true,
        locationId: userLocation.id
      }}):await prisma.profile.update({
          where:{
            id:profile.id
      },data:{
        isActive:true,
      
      }})

    const profiles = await prisma.profile.findMany({where:{
        isActive:{
          equals:true
        }
      }})

    
    return  res.json({ profile:prof});
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