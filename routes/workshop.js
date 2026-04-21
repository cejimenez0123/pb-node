const express = require('express');
const prisma = require("../db");
const router = express.Router()
const{ generate} =require("random-words");
const { user } = require('firebase-functions/v1/auth');
const haversineDistance = (loc1, loc2) => {
  const toRad = value => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);
  const lat1 = toRad(loc1.latitude);
  const lat2 = toRad(loc2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};



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
      isOpenCollaboration: true,
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

router.post('/look', authMiddleware, async (req, res) => {
  try {
    const { radius: queryRadius = 50 } = req.query;
    const global = req.query.global === 'true';
    const { location: locale } = req.body;

    const profileId = req.user?.profiles[0].id
  const profile = await prisma.profile.findUnique({
  where: { id: profileId },
  include: { location: true },
});
    if (!profile) return res.status(400).json({ error: "Profile not found" });

    let location = locale ?? profile.location;
    let includesGlobe = false;

    // --- GLOBAL SEARCH ---
    if (global || !location) {
      const groups = await prisma.collection.findMany({
        where: { type: "feedback", isGlobal: true },
        take: 4,
        include: { location: true },
      });
      return res.send({ groups, message: "Global search" });
    }

    const { latitude, longitude } = location;

    // Find or create location
    const userLocation =
      (await prisma.location.findFirst({ where: { latitude, longitude } })) ||
      (await prisma.location.create({ data: { latitude, longitude } }));

    // Update profile location
    await prisma.profile.update({
      where: { id: profileId},
      data: { locationId: userLocation.id },
    });

    // --- LOCAL COLLECTIONS ---
    const collections = await prisma.collection.findMany({
      where: {
        type: "feedback",
        locationId: { not: null },
        isGlobal: false,
      },
      include: { location: true, roles: { include: { profile: true } } },
    });

    let groups = [];
    let rad = Number(queryRadius);
    const MAX_RADIUS = rad * 3;

    // Filter collections by proximity & availability, expanding radius if needed
    while (groups.length < 5 && rad <= MAX_RADIUS) {
      groups = filterAvailableCollections({ profile, collections, radius: rad }) ?? [];
      rad += Number(queryRadius); // increase in steps of original radius
    }

    // --- If no local groups found, create a new one ---
    if (groups.length < 5) {
      const newCollection = await prisma.collection.create({
        data: {
          title: generate({ min: 3, max: 6, join: " " }),
          type: "feedback",
          profile: { connect: { id: profileId } },
          location: { connect: { id: userLocation.id } },
          roles: {
            create: {
              role: "editor",
              profile: { connect: { id: profileId} },
            },
          },
        },
        include: { location: true, roles: { include: { profile: true } } },
      });
      groups.push(newCollection);
    }

    // --- Pad with global collections if still less than 3 ---
    if (groups.length < 5) {
      includesGlobe = true;
      const globalGroups = await prisma.collection.findMany({
        where: {
          type: "feedback",
          isGlobal: true,
        },
        include: { location: true, roles: { include: { profile: true } } },
        take: 4 - groups.length,
      });
      groups = [...groups, ...globalGroups];
    }

    return res.send({
      groups,
      message: includesGlobe ? "Includes Global Groups" : "All Local",
    });
  } catch (error) {
    console.error("LOOK_ERROR", error);
    return res.status(500).json({ error: "Server error" });
  }
});
router.get("/profile/workshops",authMiddleware,async (req,res)=>{
  try{
    let profile = req.user.profiles[0]
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

router.post("/group/join", authMiddleware, async (req, res) => {
  try {
    
    const { story, profile, location } = req.body;
    const storyId = story?.id ?? null;
    const radius = parseFloat(req.query.radius) || 50;
    const isGlobal = req.query.global == 'true';

 

    if (!profile?.id) {
      return res.status(400).json({ error: "Profile required" });
    }

    const prof = await prisma.profile.findUnique({
      where: { id: profile.id },
      include: { location: true },
    });

    if (!prof) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // ─── LOCATION RESOLUTION ─────────────────────────
    let resolvedLocation = prof.location;

    if (location?.latitude && location?.longitude) {
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

    if (!isGlobal && !resolvedLocation?.id) {
      return res.json({
        joined: false,
        error: "Location required to join or create local groups.",
      });
    }

    // ─── FIND COLLECTIONS ─────────────────────────
    let availableCollections = [];

    if (isGlobal) {
      const collections = await prisma.collection.findMany({
        where: {
          AND: [
            { type: "feedback" },
            {
              NOT: {
                roles: {
                  some: { profileId: prof.id },
                },
              },
            },
            {
              profile: {
                id: { notIn: [prof.id, process.env.PLUMBUM_PROFILE_ID] },
              },
            },
          ],
          OR: [{ isOpenCollaboration: true }],
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
      });

      availableCollections = filterAvailableCollections({
        profile: profWithLocation,
        collections: allCollections,
        radius,
      });
    }

    // ─── JOIN EXISTING ─────────────────────────
    if (availableCollections.length > 0) {
      const col =
        availableCollections[
          Math.floor(Math.random() * availableCollections.length)
        ];

      if (isGlobal) {
        await prisma.roleToCollection.upsert({
          where: {
            profileId_collectionId: {
              profileId: prof.id,
              collectionId: col.id,
            },
          },
          update: { profileId: prof.id,
            collectionId: col.id,
            role: "writer",},
          create: {
            profileId: prof.id,
            collectionId: col.id,
            role: "writer",
          },
        });

        // ✅ SAFE STORY ATTACH
        // const storyId = story?.id;

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

        return res.json({
          joined: true,
          created: false,
          collection: workshopCollection,
        });
      } else {
        const roleRecord = await addProfileToCollection({
          profileId: prof.id,
          collection: col,
        });

        // const storyId = story?.id;

        if (storyId) {
          await attachStory({
            storyId,
            collectionId: col.id,
            profileId: prof.id,
          });
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
    role: "owner", // or "writer" depending on your flow
  },
  create: {
    profileId: prof.id,
    collectionId: newCollection.id,
    role: "owner",
  },
});
      // const storyId = story?.id;

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
    author:{
      include:{
        location:true
      }
    }
    
  },orderBy: {
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
  await prisma.roleToStory.upsert({
    where:{
      profileId_storyId:{
        profileId:prof.id,
        storyId:s.id
      }
    },create:{
      role:"commenter",
      storyId:s.id,
      profileId:prof.id
      
    },update:{
        storyId:s.id,
      profileId:prof.id,
      role:"commenter"
    }
  })
  await prisma.roleToCollection.create({data:{
   collectionId:newCollection.id,
  profileId:s.authorId,
role:"writer"}})

  if (existing) continue;

  await createStoryToCollection({
    storyId: s.id,
    collectionId: newCollection.id,
  });

  addedCount++;
}
    } else {
      if (!resolvedLocation?.id) {
        throw new Error("Invalid location");
      }

      newCollection = await prisma.collection.create({
        data: {
          type: "feedback",
          location: { connect: { id: resolvedLocation.id } },
          title: generate({ min: 3, max: 6, join: " " }),
          isGlobal: false,
          roles: {
            create: {
              role: "editor",
              profile: { connect: { id: prof.id } },
            },
          },
        },
        include: {
          roles: { include: { profile: true } },
          location: true,
        },
      });

      // const storyId = story?.id;

      if (storyId) {
        await attachStory({
          storyId,
          collectionId: newCollection.id,
          profileId: prof.id,
        });
      }
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

  } catch (error) {
    console.error("GROUP ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});


async function findOrCreateLocation({latitude, longitude,city=""}) {
  // 1. Try to find existing location
 
  let locale = await prisma.location.findFirst({
    where: { latitude, longitude },
  });

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
          where: { latitude, longitude },
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
        const {profile,story,location}=req.body
       
       await findOrCreateLocation({...location})
        const prof = await prisma.profile.update({
          where:{
            id:profile.id
      },data:{
        isActive:true
      }});

    const profiles = await prisma.profile.findMany({where:{
        isActive:{
          equals:true
        }
      }})
      
      if(story){
        const stor = await prisma.story.update({where:{id:story.id
        },data:{
          status:"workshop",
         
        }})
          return  res.json({ profile:prof,story:stor,profiles});
      }else{
        return res.json({ profile:prof,story:null,profiles});
      }
    
      } catch (error) {
      return  res.status(500).json({ error: error});
      }
    });
  


    return router;}
    async function getNearbyProfiles({ profileId, radius }) {
      return prisma.profile.findMany({
        where: { isActive: true, location: { isNot: null } },
        include: { location: true, stories: { where: { status:"workshop" } } },
      });
    }
    
    // Helper: Find eligible collections by proximity
  async function getEligibleCollections({ profileId }) {
  return prisma.collection.findMany({
    where: {
      AND: [
        { type: { equals: "feedback" } },
        {isGlobal:{equals:false}},
        { location: { isNot: null } },
        { isOpenCollaboration: { not: true } }, // exclude global collections
        { profileId: { notIn: [profileId, process.env.PLUMBUM_PROFILE_ID] } },
      ],
    },
    include: {
      location: true,
      roles: { include: { profile: true } },
      storyIdList: { include: { story: { include: { author: true } } } },
    },
  });
}
    
    // Helper: Group by proximity
  function filterAvailableCollections({ profile, collections, radius }) {
  const nearby = groupColsByProximity({
    profile,
    items: collections,
    radius,
  });

  return nearby.filter(
    col =>
      col.roles.length < 6 &&
      !col.roles.some(role => role.profile.id === profile.id)
  );
}
    
    // Helper: Add user to existing group
    // async function addProfileToCollection({ profileId, collection }) {
    //   return prisma.roleToCollection.create({
    //     data: {
    //       role: "editor",
    //       profile: { connect: { id: profileId } },
    //       collection: { connect: { id: collection.id } },
    //     },
    //     include: {
    //       collection: { include: { roles: { include: { profile: true } }, location: true } },
    //       profile: true,
    //     },
    //   });
    // }
    async function addProfileToCollection({ profileId, collection }) {
  return prisma.roleToCollection.upsert({
    where: {
      profileId_collectionId: {
        profileId,
        collectionId: collection.id,
      },
    },
    update: {},
    create: {
      role: "editor",
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
    // Helper: Attach story to collection
    async function attachStory({ storyId, collectionId, profileId }) {
      await createStoryToCollection({ storyId, collectionId, profileId });
      await prisma.story.update({ where: { id: storyId }, data: { status:"workshop" } });
    }
//     async function createStoryToCollection({ storyId, collectionId, profileId }) {
//   return prisma.storyToCollection.upsert({
//     where: {
//       storyId_collectionId: {
//         storyId,
//         collectionId,
//       },
//     },
//     update: {
//       profileId,
//     },
//     create: {
//       storyId,
//       collectionId,
//       profileId,
//     },
//   });
// }
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
function shuffle(array) {
  const arr = [...array]; // avoid mutating input

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
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