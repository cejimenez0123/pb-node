const express = require('express');
const prisma = require("../db");
const router = express.Router()
const{ generate} =require("random-words");
const shuffle = require('../utils/shuffle');
const notifyUser  = require('../utils/notifyUser');
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
      (await prisma.location.findUnique({where:{
        location_coords:{
          latitude,longitude
        }
      }})) ||
      (await prisma.location.create({ data: { latitude, longitude } }));



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

// Serializes workshop queue processing within this Node.js process.
let workshopQueueLock = Promise.resolve();

const withWorkshopQueueLock = async (callback) => {
  const previous = workshopQueueLock;

  let release;
  workshopQueueLock = new Promise((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await callback();
  } finally {
    release();
  }
};
const roleTypes = {owner:"owner",
  reader:"reader",
  editor:"editor",
  commenter:"commenter",
  writer:"writer"
}
router.post("/group/join", async (req, res) => {
  try {

    const { story, storyId, location,profile,mode } = req.body || {};
   
const profileId = profile.id
    if (!profileId) {
      return res.status(401).json({
        error: "Profile is required",
      });
    }

    if (![roleTypes.commenter,roleTypes.reader,roleTypes.writer].includes(mode)) {
      return res.status(400).json({
        error: "Invalid workshop mode",
      });
    }

    /*
     * Get feedback workshops ordered by activity.
     *
     * Activity is based on the most recently added story.
     * Empty workshops fall back to Collection.created.
     */
    const getWorkshops = async () => {
      const workshops = await prisma.collection.findMany({
        where: {
          type: "feedback",
          isWorkshop: true,
        },
        include: {
          storyIdList: {
            orderBy: {
              created: "desc",
            },
          },
        },
      });

      workshops.sort((a, b) => {
        const aActivity =
          a.storyIdList?.[0]?.created?.getTime?.() || 0;

        const bActivity =
          b.storyIdList?.[0]?.created?.getTime?.() || 0;

        if (aActivity === 0 && bActivity === 0) {
          return (
            (b.created?.getTime?.() || 0) -
            (a.created?.getTime?.() || 0)
          );
        }

        if (aActivity === 0) return 1;
        if (bActivity === 0) return -1;

        return bActivity - aActivity;
      });

      return workshops;
    };

    /*
     * Count distinct participants with stories assigned.
     *
     * Membership roles are intentionally NOT used for capacity,
     * because readers also receive writer membership.
     */
    const getActiveAuthors = (workshop) => {
      return new Set(
        (workshop.storyIdList || [])
          .map((link) => link.profileId)
          .filter(Boolean)
      );
    };

    const hasWriterCapacity = (workshop) => {
      return getActiveAuthors(workshop).size < 6;
    };

    /*
     * Everyone who joins a workshop receives writer membership.
     *
     * Existing memberships are normalized to writer.
     * The compound unique key prevents duplicate memberships.
     */
    const ensureWriterMembership = async ({
      collectionId,
      profileId,
    }) => {
      const where = {
        profileId_collectionId: {
          profileId,
          collectionId,
        },
      };

      let existingRole =
        await prisma.roleToCollection.findUnique({
          where,
        });

      if (existingRole) {
        if (existingRole.role !== "writer") {
          existingRole = await prisma.roleToCollection.update({
            where: {
              id: existingRole.id,
            },
            data: {
              role: "writer",
              approved: true,
            },
          });
        }

        return existingRole;
      }

      try {
        return await prisma.roleToCollection.create({
          data: {
            profileId,
            collectionId,
            role: "writer",
            approved: true,
          },
        });
      } catch (error) {
        // Another request may have created the membership.
        if (error.code !== "P2002") {
          throw error;
        }

        existingRole =
          await prisma.roleToCollection.findUnique({
            where,
          });

        if (!existingRole) {
          throw error;
        }

        if (existingRole.role !== "writer") {
          existingRole = await prisma.roleToCollection.update({
            where: {
              id: existingRole.id,
            },
            data: {
              role: "writer",
              approved: true,
            },
          });
        }

        return existingRole;
      }
    };


    //   if (existingLink) {
    //     await prisma.story.update({
    //       where: {
    //         id: storyId,
    //       },
    //       data: {
    //         status: "fragment",
    //         feedbackRequestedAt: null,
    //       },
    //     });

    //     return {
    //       assigned: false,
    //       alreadyAssigned: true,
    //       collectionId: existingLink.collectionId,
    //     };
    //   }

    //   try {
    //     await prisma.storyToCollection.create({
    //       data: {
    //         storyId,
    //         collectionId,
    //         profileId,
    //       },
    //     });
    //   } catch (error) {
    //     // Handles a duplicate assignment created concurrently
    //     // by another server process.
    //     if (error.code !== "P2002") {
    //       throw error;
    //     }

    //     const existingLink =
    //       await prisma.storyToCollection.findFirst({
    //         where: {
    //           storyId,
    //         },
    //       });

    //     if (!existingLink) {
    //       throw error;
    //     }

    //     await prisma.story.update({
    //       where: {
    //         id: storyId,
    //       },
    //       data: {
    //         status: "fragment",
    //         feedbackRequestedAt: null,
    //       },
    //     });

    //     return {
    //       assigned: false,
    //       alreadyAssigned: true,
    //       collectionId: existingLink.collectionId,
    //     };
    //   }

    //   await prisma.story.update({
    //     where: {
    //       id: storyId,
    //     },
    //     data: {
    //       status: "fragment",
    //       feedbackRequestedAt: null,
    //     },
    //   });

    //   return {
    //     assigned: true,
    //     alreadyAssigned: false,
    //     collectionId,
    //   };
    // };
const addStoryToWorkshop = async ({
  storyId,
  collectionId,
  profileId,
}) => {
  // A story must only have one workshop assignment.
  const existingLink = await prisma.storyToCollection.findFirst({
    where: {
      storyId,
    },
  });

  if (existingLink) {
    await prisma.story.update({
      where: { id: storyId },
      data: {
        status: "fragment",
        feedbackRequestedAt: null,
      },
    });

    return {
      assigned: false,
      alreadyAssigned: true,
      collectionId: existingLink.collectionId,
    };
  }

  try {
    await prisma.storyToCollection.create({
      data: {
        storyId,
        collectionId,
        profileId,
      },
    });
  } catch (error) {
    if (error.code !== "P2002") {
      throw error;
    }

    // Another request may have assigned it concurrently.
    const existingLink = await prisma.storyToCollection.findFirst({
      where: {
        storyId,
      },
    });

    if (!existingLink) {
      throw error;
    }

    await prisma.story.update({
      where: { id: storyId },
      data: {
        status: "fragment",
        feedbackRequestedAt: null,
      },
    });

    return {
      assigned: false,
      alreadyAssigned: true,
      collectionId: existingLink.collectionId,
    };
  }

  await prisma.story.update({
    where: { id: storyId },
    data: {
      status: "fragment",
      feedbackRequestedAt: null,
    },
  });

  return {
    assigned: true,
    alreadyAssigned: false,
    collectionId,
  };
};
    /*
     * READER MODE
     *
     * Readers join an existing workshop with content.
     * They receive writer membership but do not consume
     * a submission slot.
     */
    if (mode === "reader") {
      const workshops = await getWorkshops();

      const targetWorkshop = workshops.find(
        (workshop) => workshop.storyIdList.length > 0
      );

      if (!targetWorkshop) {
        return res.json({
          joined: false,
          queued: false,
          created: false,
          collection: null,
        });
      }

      await ensureWriterMembership({
        collectionId: targetWorkshop.id,
        profileId,
      });

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

    const ownedStory = await prisma.story.findFirst({
      where: {
        id: storyId,
        authorId: profileId,
      },
    });

    if (!ownedStory) {
      return res.status(403).json({
        error: "You can only request feedback for your own story",
      });
    }

    /*
     * Serialize the entire feedback queue operation.
     *
     * Re-fetch the story inside the lock because another
     * request may have processed it while this request waited.
     */
    const result = await withWorkshopQueueLock(async () => {
      const freshStory = await prisma.story.findFirst({
        where: {
          id: ownedStory.id,
          authorId: profileId,
        },
      });

      if (!freshStory) {
        throw new Error("Story could not be found");
      }

      /*
       * Check for an existing assignment before checking
       * whether the story is already queued.
       */
      const existingAssignment =
        await prisma.storyToCollection.findFirst({
          where: {
            storyId: freshStory.id,
          },
        });

      if (existingAssignment) {
        await prisma.story.update({
          where: {
            id: freshStory.id,
          },
          data: {
            status: "fragment",
            feedbackRequestedAt: null,
          },
        });

        await ensureWriterMembership({
          collectionId: existingAssignment.collectionId,
          profileId,
        });

        return {
          joined: true,
          queued: false,
          created: false,
          collection: await prisma.collection.findUnique({
            where: {
              id: existingAssignment.collectionId,
            },
          }),
        };
      }

      /*
       * Don't enqueue the same story twice.
       * Preserve its original FIFO position.
       */
      
      // if (
      //   freshStory.status === "workshop" &&
      //   freshStory.feedbackRequestedAt
      // ) {
      //   return {
      //     joined: false,
      //     queued: true,
      //     created: false,
      //     collection: null,
      //     message: "Story is already waiting for feedback",
      //   };
      // }

      /*
       * Add the story to the FIFO feedback pool.
       */
      await prisma.story.update({
        where: {
          id: freshStory.id,
        },
        data: {
          status: "workshop",
          feedbackRequestedAt: new Date(),
        },
      });

      let assignedCollectionId = null;
      let createdForUser = false;

      /*
       * PROCESS FIFO QUEUE
       *
       * Process one story at a time.
       * This makes it easier to enforce:
       * - Six distinct active submitters per workshop.
       * - One active submission per author per workshop.
       * - Existing assignments are reconciled.
       */
      while (true) {
        const queuedStory = await prisma.story.findFirst({
          where: {
            status: "workshop",
            feedbackRequestedAt: {
              not: null,
            },
            authorId: {
              not: null,
            },
          },
          orderBy: [
            {
              feedbackRequestedAt: "asc",
            },
            {
              id: "asc",
            },
          ],
        });

        if (!queuedStory) {
          break;
        }

        /*
         * Reconcile an existing story assignment.
         *
         * This story is no longer queued, so the next
         * iteration can continue with the next FIFO entry.
         */
        const existingLink =
          await prisma.storyToCollection.findFirst({
            where: {
              storyId: queuedStory.id,
            },
          });

        if (existingLink) {
          await prisma.story.update({
            where: {
              id: queuedStory.id,
            },
            data: {
              status: "fragment",
              feedbackRequestedAt: null,
            },
          });

          await ensureWriterMembership({
            collectionId: existingLink.collectionId,
            profileId: queuedStory.authorId,
          });

          if (queuedStory.id === freshStory.id) {
            assignedCollectionId = existingLink.collectionId;
          }

          continue;
        }

        /*
         * Get workshops ordered by activity.
         */
        const workshops = await getWorkshops();

        /*
         * Find the most recently active workshop that:
         *
         * 1. Has fewer than six distinct submitting authors.
         * 2. Does not already have an active submission
         *    from this author.
         */
        let targetWorkshop = workshops.find((workshop) => {
          const activeAuthors = getActiveAuthors(workshop);

          return (
            activeAuthors.size < 6 &&
            !activeAuthors.has(queuedStory.authorId)
          );
        });

        let createdThisWorkshop = false;

        /*
         * No suitable workshop exists.
         * Create a new private workshop.
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
              profileId: queuedStory.authorId,

              // Only use the current request's location
              // for the current user's own story.
              locationId:
                queuedStory.id === freshStory.id
                  ? location?.id || undefined
                  : undefined,
            },
            include: {
              storyIdList: true,
            },
          });

          createdThisWorkshop = true;
        }

        /*
         * Membership is independent of story assignment.
         *
         * Everyone joining receives writer membership.
         */
        await ensureWriterMembership({
          collectionId: targetWorkshop.id,
          profileId: queuedStory.authorId,
        });

        /*
         * Attach the story.
         */
        const assignment = await addStoryToWorkshop({
          storyId: queuedStory.id,
          collectionId: targetWorkshop.id,
          profileId: queuedStory.authorId,
        });

        /*
         * Record the current user's assigned workshop.
         */
        if (queuedStory.id === freshStory.id) {
          assignedCollectionId = assignment.collectionId;

          if (assignment.assigned) {
            createdForUser = createdThisWorkshop;
          }
        }

        /*
         * The story has either been assigned or reconciled.
         * The next iteration processes the next FIFO story.
         */
      }

      /*
       * Return the current user's assigned workshop.
       */
      if (assignedCollectionId) {
        const collection = await prisma.collection.findUnique({
          where: {
            id: assignedCollectionId,
          },
        });

        return {
          joined: true,
          queued: false,
          created: createdForUser,
          collection,
        };
      }

      /*
       * The user's story remains in the feedback queue.
       */
      return {
        joined: false,
        queued: true,
        created: false,
        collection: null,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("Workshop join error:", error);

    return res.status(500).json({
      error: "Unable to join workshop",
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