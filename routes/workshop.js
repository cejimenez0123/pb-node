const express = require('express');
const prisma = require("../db");
const router = express.Router()
const{ generate} =require("random-words")
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

function groupUsersByProximity({ profile, items, radius = 50 }) {
  const groups = [];
  let ungrouped = [...items];

  while (ungrouped.length > 0) {
    const item = ungrouped.pop();
    const group = [item];

    ungrouped = ungrouped.filter(other => {
      // Distance between current item and other profiles
      const distance = haversineDistance(item.location, other.location);
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
      data: { needsFeedback: false },
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
      data: { needsFeedback: false },
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
function groupUsersByProximity({profile,items, radius = 50,}){
    const groups = [];
    while (items.length > 0) {
      const item = items.pop();
      const group = [item];
  
      items = items.filter((other) => {
        const distance = haversineDistance(profile.location, other.location);
        if (distance <= radius) {
          group.push(other);
          return false;
        }
        return true;
      });
      
      groups.push(group);
    }
    return groups;
  };

const createNewWorkshopCollection = async ({ profile, isGlobal = false }) => {
  const colName = generate({ min: 3, max: 6, join: " " });

  const role = await prisma.roleToCollection.create({
    data: {
      role: "editor",
      profile: { connect: { id: profile.id } },
      collection: {
        create: {
          title: colName,
          isPrivate: true,
          purpose: "Let's get feedback",
          isOpenCollaboration: false,
          type: "feedback",
          profile: { connect: { id: profile.id } },
          // Only attach location for local collections
          ...(!isGlobal && profile.location && {
            location: { connect: { id: profile.location.id } }
          }),
        },
      },
    },
    include: {
      collection: {
        include: {
          roles: { include: { profile: true } },
          storyIdList: { include: { profile: true, story: true } },
        },
      },
      profile: true,
    },
  });

  return role.collection;
};
  const createStoryToCollection=async ({storyId,collectionId,profileId})=>{
    let colName = generate({ min: 3, max: 6,join:" " })
 
    if(collectionId){
return prisma.storyToCollection.create({data:{
    story:{
      connect:{
        id:storyId
      }
    },
    collection:{
    
    connectOrCreate:{
      where:{
        id:collectionId,
     
      },
      create:{
        title:colName,
        type:"feedback",
        profile:{
          connect:{id:profileId}
        },
        isPrivate:true,
        isOpenCollaboration:false,
        roles:{create:{
                role:"editor",
                profileId:profileId,
              
              }

        },
        profile:{
          connect:{id:profileId}
        }}}}}, include:{
          collection:{include:{
          profile:true,
         storyIdList:{
            include:{
              story:{include:{author:true}},
              profile:true
            }
          },
        location:true,
      roles:{
        include:{profile:true}
      }}}}})

}else{
  return prisma.storyToCollection.create({data:{
    story:{
      connect:{
        id:storyId
      }
    },
    collection:{
      create:{
        title:colName,
        type:"feedback",
        profile:{
          connect:{
            id:profileId,
          }
        },
        isPrivate:true,
        isOpenCollaboration:false,
        roles:{create:{
                role:"editor",
                profileId:profileId,
              
              },
      },
    profile:{
      connect:{id:profileId}
    }}}},include:{
      collection:{
        include:{
          profile:true,
          storyIdList:{
            include:{
              story:{include:{author:true}},
              profile:true
            }
          },
        location:true,
      roles:{
        include:{profile:true}
      }}
      }
    }}

)
}}
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
  function groupStoryByProximity({profile,items, radius = 50,}){
    const groups = [];
    while (items.length > 0) {
      const item = items.pop();
      const group = [item];
  
      items = items.filter((other) => {
        const distance = haversineDistance(profile.location, other.author.location);
        if (distance <= radius) {
          group.push(other);
          return false;
        }
        return true;
      });
      
      groups.push(group);
    }
    return groups;
  };
  function groupItemsByCount({items,groupSize=6 }){

    let groups = [];
    while (items.length > 0) {
  
      let group = [];
      let list = items;
      let i = 0
     while(group.length<groupSize&&i<6){
      i+=1
      const item = list.pop()
      if(item && item.authorId){
        const found = group.find(k=>k.authorId == item.authorId)
        if(!found){
          group.push(item)
        }else{
            [item,...list]
        }
      }
    
     }
      groups.push(group);
    }
    return groups;
  };
  function groupColsByProximity({profile,items=[], radius = 50,}){
    const groups = [];
    while (items.length > 0) {
      const item = items.pop();
    
  
      items = items.filter((other) => {
        const distance = haversineDistance(profile.location, other.location);
        if (distance <= radius) {
          // group.push(other);
          groups.push(other)
          return false;
        }
        return true;
      });
      
    }
    return groups;
  };
module.exports = function (authMiddleware) {
  router.post('/look', authMiddleware, async (req, res) => {
  try {
    const { radius = 50}= req.query
      const global = req.query.global == 'true';
    const {location:locale}=req.body

    console.log(req.query)
    const profile = req.user?.profiles?.[0];

    if (!profile) {
      return res.status(400).json({ error: "Profile not found" });
    }

    let location = locale ?? profile.location;

    // GLOBAL SEARCH
    if (global || !location) {
      const groups = await prisma.collection.findMany({
        where: { type: "feedback", locationId: null},
        take: 3,
      });
      return res.send({ groups });
    }

    const { latitude, longitude } = location;

    // Find or create location record
    const userLocation =
      (await prisma.location.findFirst({ where: { latitude, longitude } })) ||
      (await prisma.location.create({ data: { latitude, longitude } }));

    // Update profile location
    await prisma.profile.update({
      where: { id: profile.id },
      data: { locationId: userLocation.id },
    });

    // Get all local collections
    const collections = await prisma.collection.findMany({
      where: { type: "feedback", locationId: { not: null }, isGlobal: false },
      include: { location: true },
    });

    let groups = [];
    let rad = radius;
    const MAX_RADIUS = 500;
    let includesGlobe = false;

    // Expand search radius until 3 found or limit hit
  // Expand search radius until 3 found or limit hit
while (groups.length < 3 && rad <= MAX_RADIUS) {
  // FIX 1: guard against null/undefined return from filter function
  groups = filterAvailableCollections(profile, collections, rad) ?? [];
  rad += 50;
}

// FIX 2: was `=== 0` — create a local group whenever we're still short,
// not only when completely empty (no local groups at all may still leave
// the global fallback dry)
if (groups.length < 3) {
  const collection = await prisma.collection.create({
    data: {
      title: generate({ min: 3, max: 6, join: " " }),
      type: "feedback",
      profile: { connect: { id: profile.id } },
      location: { connect: { id: userLocation.id } },
      roles: {
        create: {
          role: "editor",
          profile: { connect: { id: profile.id } },
        },
      },
    },
  });
  groups.push(collection);
}

// Fallback: pad up to 3 with global groups
if (groups.length < 3) {
  includesGlobe = true;
  const globalGroups = await prisma.collection.findMany({
    where: {
      type: "feedback",
      // locationId: null,
      isGlobal: true, // FIX 3: was missing, could pull in non-global orphaned records
    },
    take: 2
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

router.post('/group/join', authMiddleware, async (req, res) => {
  try {
    const { story, profile, location } = req.body;
    const radius = parseFloat(req.query.radius) || 50;
    const isGlobal = req.query.global == 'true';

    const prof = await prisma.profile.findFirst({
      where: { id: profile.id },
      include: { location: true },
    });

    if (!prof) return res.status(404).json({ error: 'Profile not found' });

    // 2. Resolve location — prefer body location over profile location
    let resolvedLocation = prof.location;

    if (location?.latitude && location?.longitude) {
      resolvedLocation = await prisma.location.upsert({
        where: {
          location_coords: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },
        update: { latitude: location.latitude, longitude: location.longitude },
        create: { latitude: location.latitude, longitude: location.longitude },
      });


    }
console.log(resolvedLocation)
    // 3. LOCAL: require location
    if (!isGlobal && !resolvedLocation) {
      return res.json({ joined: false, error: "Location required to join or create local groups." });
    }

    // ─── FIND ELIGIBLE COLLECTIONS ────────────────────────────────────────────

    let availableCollections = [];
    // console.log("ISGLOV",isGlobal)
    if (isGlobal) {
      console.log("X")
      const collections = await prisma.collection.findMany({
        where: {
          AND: [
            { type: { equals: "feedback" } },
            { profile: { id: { notIn: [prof.id, process.env.PLUMBUM_PROFILE_ID] } } },
            { roles: { some: { profileId: { notIn: [prof.id, process.env.PLUMBUM_PROFILE_ID] } } } },
          ],
          OR: [
            // { location: { is: null } },
            { isOpenCollaboration: { equals: true } }
          ]
        },
        include: {
          roles: { include: { profile: true } },
          storyIdList: { include: { story: { include: { author: true } } } }
        }
      });

      availableCollections = collections.filter(col => col.roles.length < 6);
    } else {
      console.log("y")
      const profWithLocation = { ...prof, location: resolvedLocation };
      const allCollections = await getEligibleCollections({ profileId: prof.id });
      availableCollections = filterAvailableCollections({
        profile: profWithLocation, 
        collections: allCollections, 
        radius,
      });
      console.log(JSON.stringify(availableCollections))
    }

    // ─── CASE 1: JOIN EXISTING COLLECTION ─────────────────────────────────────

    if (availableCollections.length > 0) {
      const col = availableCollections[0];

      if (isGlobal) {
        const existingRole = await prisma.roleToCollection.findFirst({
          where: { profileId: prof.id, collectionId: col.id },
        });

        if (!existingRole) {
          await prisma.roleToCollection.create({
            data: { profileId: prof.id, collectionId: col.id, role: "writer" },
          });
        }

        if (story) {
          await createStoryToCollection({ storyId: story.id, collectionId: col.id, profileId: prof.id });
          await prisma.story.update({ where: { id: story.id }, data: { needsFeedback: false } });
        }

        const workshopCollection = await prisma.collection.findFirst({
          where: { id: col.id },
          include: {
            roles: { include: { profile: true } },
            storyIdList: { include: { story: { include: { author: true } } } }
          }
        });

        return res.json({ joined: true, created: false, collection: workshopCollection });
      } else {
        const roleRecord = await addProfileToCollection({ profileId: prof.id, collection: col });

        if (story) {
          await attachStory({ storyId: story.id, collectionId: col.id, profileId: prof.id });
        }

        return res.json({ joined: true, created: false, collection: roleRecord.collection });
      }
    }

    // ─── CASE 2: CREATE NEW COLLECTION ────────────────────────────────────────

    let newCollection;

    if (isGlobal) {
      newCollection = await createNewWorkshopCollection({ profile: prof ,isGlobal});

      if (!newCollection) return res.status(500).json({ error: "Failed to create workshop collection" });

      await prisma.roleToCollection.create({
        data: { profileId: prof.id, collectionId: newCollection.id, role: "owner" },
      });

      if (story?.id) {
        await createStoryToCollection({ storyId: story.id, collectionId: newCollection.id, profileId: prof.id });
        await prisma.story.update({ where: { id: story.id }, data: { needsFeedback: false } });
      }

      const stories = await prisma.story.findMany({
        where: {
          AND: [
            { author: { id: { not: prof.id }, isActive: true } },
            { needsFeedback: true }
          ]
        },
        include: { author: { include: { location: true } } }
      });

      const groups = groupItemsByCount({ items: stories, groupSize: 6 });
      let addedCount = story ? 1 : 0;

      for (let i = 0; i < groups.length && addedCount < 6; i++) {
        for (const page of groups[i]) {
          if (addedCount >= 6) break;
          await createStoryToCollection({ storyId: page.id, collectionId: newCollection.id });
          addedCount++;
        }
      }
    } else {
      newCollection = await prisma.collection.create({
        data: {
          type: "feedback",
          location: { connect: { id: resolvedLocation.id } },
          title: generate({ min: 3, max: 6, join: " " }),
          isGlobal:false,
          roles: {
            create: { role: "editor", profile: { connect: { id: prof.id } } },
          },
        },
        include: {
          roles: { include: { profile: true } },
          location: true,
        },
      });

      if (story) {
        await attachStory({ storyId: story.id, collectionId: newCollection.id, profileId: prof.id });
      }
    }

    newCollection = await prisma.collection.findFirst({
      where: { id: newCollection.id },
      include: {
        roles: { include: { profile: true } },
        storyIdList: { include: { story: { include: { author: true } } } }
      }
    });

    return res.json({ joined: true, created: true, collection: newCollection });

  } catch (error) {
    console.error("GROUP ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});
// router.post('/group/join', authMiddleware, async (req, res) => {
//   try {
//     const { story, profile, } = req.body;
//     const radius = parseFloat(req.query.radius) || 50;
//     const isGlobal = req.query.global == 'true';
// console.log("FULLSELG",req.query)
//     // 1. Load profile with location
//     const prof = await prisma.profile.findFirst({
//       where: { id: profile.id },
//       include: { location: true },
//     });

//     if (!prof) return res.status(404).json({ error: 'Profile not found' });

//     // 2. LOCAL: require location
//     if (!isGlobal && !prof.location) {
//       return res.json({ joined: false, error: "Location required to join or create local groups." });
//     }

//     // ─── FIND ELIGIBLE COLLECTIONS ────────────────────────────────────────────

//     let availableCollections = [];

//     if (isGlobal) {
//       const collections = await prisma.collection.findMany({
//         where: {
//           AND: [
//             { type: { equals: "feedback" } },
//             { profile: { id: { notIn: [prof.id, process.env.PLUMBUM_PROFILE_ID] } } },
//             { roles: { some: { profileId: { notIn: [prof.id, process.env.PLUMBUM_PROFILE_ID] } } } },
//           ],
//           OR: [
//             { location: { is: null } },
//             { isOpenCollaboration: { equals: true } }
//           ]
//         },
//         include: {
//           roles: { include: { profile: true } },
//           storyIdList: { include: { story: { include: { author: true } } } }
//         }
//       });

//       availableCollections = collections.filter(col => col.roles.length < 6);
//     } else {
//       const allCollections = await getEligibleCollections({ profileId: prof.id });
//       availableCollections = filterAvailableCollections({ profile: prof, collections: allCollections, radius });
//     }

//     // ─── CASE 1: JOIN EXISTING COLLECTION ─────────────────────────────────────

//     if (availableCollections.length > 0) {
//       const col = availableCollections[0];

//       if (isGlobal) {
//         // Upsert role
//         const existingRole = await prisma.roleToCollection.findFirst({
//           where: { profileId: prof.id, collectionId: col.id },
//         });

//         if (!existingRole) {
//           await prisma.roleToCollection.create({
//             data: { profileId: prof.id, collectionId: col.id, role: "writer" },
//           });
//         }

//         if (story) {
//           await createStoryToCollection({ storyId: story.id, collectionId: col.id, profileId: prof.id });
//           await prisma.story.update({ where: { id: story.id }, data: { needsFeedback: false } });
//         }

//         const workshopCollection = await prisma.collection.findFirst({
//           where: { id: col.id },
//           include: {
//             roles: { include: { profile: true } },
//             storyIdList: { include: { story: { include: { author: true } } } }
//           }
//         });

//         return res.json({ joined: true, created: false, collection: workshopCollection });
//       } else {
//         // Local join
//         const roleRecord = await addProfileToCollection({ profileId: prof.id, collection: col });

//         if (story) {
//           await attachStory({ storyId: story.id, collectionId: col.id, profileId: prof.id });
//         }

//         return res.json({ joined: true, created: false, collection: roleRecord.collection });
//       }
//     }

//     // ─── CASE 2: CREATE NEW COLLECTION ────────────────────────────────────────

//     let newCollection;

//     if (isGlobal) {
//       newCollection = await createNewWorkshopCollection({ profile: prof });

//       if (!newCollection) return res.status(500).json({ error: "Failed to create workshop collection" });

//       await prisma.roleToCollection.create({
//         data: { profileId: prof.id, collectionId: newCollection.id, role: "owner" },
//       });

//       if (story?.id) {
//         await createStoryToCollection({ storyId: story.id, collectionId: newCollection.id, profileId: prof.id });
//         await prisma.story.update({ where: { id: story.id }, data: { needsFeedback: false } });
//       }

//       // Backfill collection with stories needing feedback
//       const stories = await prisma.story.findMany({
//         where: {
//           AND: [
//             { author: { id: { not: prof.id }, isActive: true } },
//             { needsFeedback: true }
//           ]
//         },
//         include: { author: { include: { location: true } } }
//       });

//       const groups = groupItemsByCount({ items: stories, groupSize: 6 });
//       let addedCount = story ? 1 : 0;

//       for (let i = 0; i < groups.length && addedCount < 6; i++) {
//         for (const page of groups[i]) {
//           if (addedCount >= 6) break;
//           await createStoryToCollection({ storyId: page.id, collectionId: newCollection.id });
//           addedCount++;
//         }
//       }

//       newCollection = await prisma.collection.findFirst({
//         where: { id: newCollection.id },
//         include: {
//           roles: { include: { profile: true } },
//           storyIdList: { include: { story: { include: { author: true } } } }
//         }
//       });
//     } else {
//       newCollection = await prisma.collection.create({
//         data: {
//           type: "feedback",
//           location: { connect: { id: prof.location.id } },
//           title: generate({ min: 3, max: 6, join: " " }),
//           roles: {
//             create: { role: "editor", profile: { connect: { id: prof.id } } },
//           },
//         },
//         include: {
//           roles: { include: { profile: true } },
//           location: true,
//         },
//       });

//       if (story) {
//         await attachStory({ storyId: story.id, collectionId: newCollection.id, profileId: prof.id });
//       }
//     }

//     return res.json({ joined: true, created: true, collection: newCollection });

//   } catch (error) {
//     console.error("GROUP ERROR:", error);
//     res.status(500).json({ error: error.message });
//   }
// });
// router.post('/look', authMiddleware, async (req, res) => {
//   try {
//     const { radius = 50, global = false, location: locale } = req.body;

//     // GLOBAL SEARCH
//     if (global || !locale) {
//       const collections = await prisma.collection.findMany({
//         where: {
//           type: "feedback",
//           locationId: null
//         }
//       });

//       return res.send({ groups: collections });
//     }

//     // LOCAL SEARCH
//     const { latitude, longitude } = locale;

//     // find or create location
//     let location = await prisma.location.findFirst({
//       where: {
//         latitude,
//         longitude
//       }
//     });

//     if (!location) {
//       location = await prisma.location.create({
//         data: { latitude, longitude }
//       });
//     }

//     // attach location to profile
//     let profile = req.user.profiles[0];

//     profile = await prisma.profile.update({
//       where: { id: profile.id },
//       data: { locationId: location.id }
//     });

//     // get local collections
//     const collections = await prisma.collection.findMany({
//       where: {
//         type: "feedback",
//         locationId: { not: null }
//       },
//       include: {
//         location: true
//       }
//     });

//     let groups = [];
//     let rad = radius;

//     // expand radius until we find 3 groups

// const MAX_RADIUS = 500;

// while (groups.length < 3 && rad <= MAX_RADIUS) {
//   groups = filterAvailableCollections(profile, collections, rad);
//   rad += 50;
// }

//     return res.send({ groups });

//   } catch (error) {
//     console.error("LOOK_ERROR", error);
//     return res.status(500).json({ error });
//   }
// });

    router.post('/active-users',authMiddleware, async (req, res) => {
      try {
        const {profile,story}=req.body
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
          needsFeedback:true
        }})
          return  res.json({ profile:prof,story:stor,profiles});
      }else{
        return res.json({ profile:prof,story:null,profiles});
      }
    
      } catch (error) {
      return  res.status(500).json({ error: error});
      }
    });
  

// router.post('/group', authMiddleware, async (req, res) => {
//   try {
//     const { story, profile } = req.body;
//     const radius = parseFloat(req.query.radius) || 50;

//     // 1. Load profile and location
//     const prof = await prisma.profile.findFirst({
//       where: { id: profile.id },
//       include: { location: true },
//     });

//     if (!prof || !prof.location) {
//       return res.json({
//         joined: false,
//         error: "Location required to join or create groups.",
//       });
//     }

//     // 2. Get nearby profiles (optional but you may still want this)
//     const nearbyProfiles = await getNearbyProfiles({ profileId: prof.id, radius });

//     // 3. Get collections available
//     const collections = await getEligibleCollections({ profileId: prof.id });

//     // 4. Filter by proximity
//     const availableCollections = filterAvailableCollections({
//       profile: prof,
//       collections,
//       radius,
//     });

//     // ---------------------------------------------------------
//     // CASE 1: JOIN EXISTING GROUP
//     // ---------------------------------------------------------
//     if (availableCollections.length > 0) {
//       const col = availableCollections[0];

//       const roleRecord = await addProfileToCollection({
//         profileId: prof.id,
//         collection: col,
//       });

//       if (story) {
//         await attachStory({
//           storyId: story.id,
//           collectionId: col.id,
//           profileId: prof.id,
//         });
//       }

//       return res.json({
//         joined: true,
//         created: false,
//         collection: roleRecord.collection,
//       });
//     }


 
//     // ---------------------------------------------------------
//     // CASE 2: NO EXISTING GROUP → ALWAYS CREATE NEW
//     // ---------------------------------------------------------
//     const newCollection = await prisma.collection.create({
//       data: {
//         type: "feedback",
//         location:{
//           connect:{
//             id:prof.location.id
//           }
//         },
//         title:generate({ min: 3, max: 6,join:" " }),
//         roles: {
//           create: {
//             role: "editor",
//             profile: { connect: { id: prof.id } },
//           },
//         },
//       },
//       include: {
//         roles: { include: { profile: true } },
//         location: true,
//       },
//     });

//     if (story) {
//       await attachStory({
//         storyId: story.id,
//         collectionId: newCollection.id,
//         profileId: prof.id,
//       });
//     }

//     return res.json({
//       joined: true,
//       created: true,
//       collection: newCollection,
//     });

//   } catch (error) {
//     console.error("GROUP ERROR:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

//   router.post('/groups/global', authMiddleware, async (req, res) => {
//   try {
//     const { story, profile } = req.body;

//     const prof = await prisma.profile.findFirst({
//       where: { id: profile.id },
//     });

//     if (!prof) {
//       return res.status(404).json({ error: 'Profile not found' });
//     }

//     // Find all eligible collections
//     const collections = await prisma.collection.findMany({
//       where: {
//         AND: [
//           { type: { equals: "feedback" } },
//           {
//             profile: {
//               id: { notIn: [profile.id, process.env.PLUMBUM_PROFILE_ID] }
//             }
//           },
//           {
//             storyIdList: {
//               some: {
//                 story: {
//                   authorId: { notIn: [profile.id, process.env.PLUMBUM_PROFILE_ID] }
//                 }
//               }
//             }
//           },
//           {
//             roles: {
//               some: {
//                 profileId: { notIn: [profile.id, process.env.PLUMBUM_PROFILE_ID] }
//               }
//             }
//           }
//         ],
//         OR: [
//           { location: { is: null } },
//           { isOpenCollaboration: { equals: true } }
//         ]
//       },
//       include: {
//         roles: { include: { profile: true } },
//         storyIdList: { include: { story: { include: { author: true } } } }
//       }
//     });

//     // Find all stories that need feedback
//     const stories = await prisma.story.findMany({
//       where: {
//         AND: [
//           { author: { id: { not: prof.id }, isActive: true } },
//           { needsFeedback: true }
//         ]
//       },
//       include: {
//         author: { include: { location: true } }
//       }
//     });

//     let availableCollections = collections.filter(col => col.roles.length < 6);
//     const groups = groupItemsByCount({ items: stories, groupSize: 6 });

//     let workshopCollection = null;

//     // 🟢 CASE 1: Add user to existing eligible collection
//     if (availableCollections[0]) {
//       const col = availableCollections[0];

//       // Ensure the user has a role in this collection
//       const existingRole = await prisma.roleToCollection.findFirst({
//         where: {
//           profileId: prof.id,
//           collectionId: col.id,
//         },
//       });

//       if (!existingRole) {
//         await prisma.roleToCollection.create({
//           data: {
//             profileId: prof.id,
//             collectionId: col.id,
//             role: "writer",
//           },
//         });
//       }

//       // If a story is passed, link it to this collection
//       if (story) {
//         await createStoryToCollection({
//           storyId: story.id,
//           collectionId: col.id,
//           profileId: prof.id
//         });

//         await prisma.story.update({
//           where: { id: story.id },
//           data: { needsFeedback: false }
//         });
//       }

//       workshopCollection = await prisma.collection.findFirst({
//         where: { id: col.id },
//         include: {
//           roles: { include: { profile: true } },
//           storyIdList: { include: { story: { include: { author: true } } } }
//         }
//       });

//       return res.json({ collection: workshopCollection });
//     }

//     // 🟢 CASE 2: Create a new workshop collection and assign user + stories
//     const newCollection = await createNewWorkshopCollection({ profile: prof });

//     if (!newCollection) {
//       return res.status(500).json({ error: "Failed to create workshop collection" });
//     }

//     // Assign the creating user a role
//     await prisma.role.create({
//       data: {
//         profileId: prof.id,
//         collectionId: newCollection.id,
//         role: "owner",
//       },
//     });

//     // Add the user's story if provided
//     if (story?.id) {
//       await createStoryToCollection({
//         storyId: story.id,
//         collectionId: newCollection.id,
//         profileId: prof.id
//       });

//       await prisma.story.update({
//         where: { id: story.id },
//         data: { needsFeedback: false }
//       });
//     }

//     // Fill up the new collection with stories needing feedback
//     let addedCount = story ? 1 : 0;
//     for (let i = 0; i < groups.length && addedCount < 6; i++) {
//       const group = groups[i];
//       for (const page of group) {
//         if (addedCount >= 6) break;
//         await createStoryToCollection({
//           storyId: page.id,
//           collectionId: newCollection.id
//         });
//         addedCount++;
//       }
//     }

//     workshopCollection = await prisma.collection.findFirst({
//       where: { id: newCollection.id },
//       include: {
//         roles: { include: { profile: true } },
//         storyIdList: { include: { story: { include: { author: true } } } }
//       }
//     });

//     return res.json({ collection: workshopCollection });

//   } catch (error) {
//     console.error("ERROR /groups/global", error);
//     return res.status(500).json({ error: error.message });
//   }
// });

    return router;}
    async function getNearbyProfiles({ profileId, radius }) {
      return prisma.profile.findMany({
        where: { isActive: true, location: { isNot: null } },
        include: { location: true, stories: { where: { needsFeedback: true } } },
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

      let proxGroups = groupColsByProximity({ profile, items: collections, radius });
      return proxGroups.filter(col => col.roles.length < 6 && !col.roles.find(role => role.profile.id == profile.id));
    }
    
    // Helper: Add user to existing group
    async function addProfileToCollection({ profileId, collection }) {
      return prisma.roleToCollection.create({
        data: {
          role: "editor",
          profile: { connect: { id: profileId } },
          collection: { connect: { id: collection.id } },
        },
        include: {
          collection: { include: { roles: { include: { profile: true } }, location: true } },
          profile: true,
        },
      });
    }
    
    // Helper: Attach story to collection
    async function attachStory({ storyId, collectionId, profileId }) {
      await createStoryToCollection({ storyId, collectionId, profileId });
      await prisma.story.update({ where: { id: storyId }, data: { needsFeedback: false } });
    }