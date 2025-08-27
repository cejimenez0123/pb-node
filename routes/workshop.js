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
  const createNewWorkshopCollection=async ({profile})=>{
    let colName = generate({ min: 3, max: 6,join:" " })
    if(profile.location){
 const role = await prisma.roleToCollection.create({data:{
      role:"editor",
      profile:{
        connect:{id:profile.id}
      },
      collection:{
        create:{
          title:colName,
          isPrivate:true,
          purpose:"Let's get feedback",
          isOpenCollaboration:false,
          type:"feedback",
          profile:{
            connect:{id:profile.id}
          },
          location:{
            connect:{
              id:profile.location.id
            }
            }
          }
        }
      },include:{
collection:{
        include:{
          roles:{
            include:{
              profile:true
            }
            
          },storyIdList:{include:{profile:true,story:true}}
        }
      },
      profile:true
      }     
    })
return role.collection
  }else{
    const role = await prisma.roleToCollection.create({data:{
      role:"editor",
      profile:{
        connect:{id:profile.id}
      },
      collection:{
        create:{
          title:colName,
          isPrivate:true,
          purpose:"Let's get feedback",
          isOpenCollaboration:false,
          type:"feedback",
          profile:{
            connect:{id:profile.id}
          },
         
          }
        }
      },include:{
collection:{
        include:{
          roles:{
            include:{
              profile:true
            }
            
          },storyIdList:{include:{profile:true,story:true}}
        }
      },
      profile:true
      }     
    })
return role.collection
  }
  }
  const findStoryToCollection = ({collectionId,storyId,profileId})=>{

    if(profileId){
      return prisma.storyToCollection.findFirst({where:{
        AND:[{profile:{
          id:{
            equals:profileId
          }
        }
            },{collection:{
  id:{
  equals:collectionId
  }
  }
  }]},include:{
  collection:{
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
    }
    ,roles:{
      include:{
        profile:true
      }
    },
    profile:true
  }
  
  },
  profile:true,
  
  }})
    }else{
    return prisma.storyToCollection.findFirst({where:{
      AND:[{story:{
           id:{equals:storyId}
          }},{collection:{
id:{
equals:collectionId
}
}
}]},include:{
collection:{
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
  }
  ,roles:{
    include:{
      profile:true
    }
  },
  profile:true
}

},
profile:true,

}})
  }}
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
  function groupColsByProximity({profile,items, radius = 50,}){
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
    

  
    // Route: Get active users
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
            res.json({ profile:prof,story:stor,profiles});
      }else{
        res.json({ profile:prof,story:null,profiles});
      }
    
      } catch (error) {
        res.status(500).json({ error: error});
      }
    });
  
    router.post('/groups', authMiddleware, async (req, res) => {
      try {
        const { story, profile } = req.body;
        if (!profile || !profile.id) {
          return res.status(400).json({ error: "Profile ID is required" });
        }
    
        const prof = await prisma.profile.findFirst({
          where: { id: profile.id },
          include: { location: true }
        });
    
        if (!prof || !prof.location) {
          return res.status(400).json({ error: "Valid profile with location required" });
        }
    
        const radius = parseFloat(req.query.radius) || 50;
    
        const activeProfiles = await prisma.profile.findMany({
          where: {
            isActive: true,
            id: { not: profile.id },
            location: { isNot: null }
          },
          include: { location: true }
        });
    
        // Group users by proximity
        const groups = groupUsersByProximity({ profile: prof, items: activeProfiles, radius });
    
        // Pick a group of users nearby with more than 1 user else create solo group
        const nearbyGroup = groups.find(g => g.length > 0);
    
        let collection;
        if (nearbyGroup) {
          collection = await createOrJoinGroupCollection({ group: nearbyGroup, profile: prof, story });
        } else {
          collection = await createSoloCollection({ profile: prof, story });
        }
    
        res.json({ collection });
    
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
      }
    });

//     router.post('/groups', authMiddleware,async (req, res) => {
//       try {
   
//         const {story,profile}=req.body
//        const prof = await prisma.profile.findFirst({where:{
//           id:{
//             equals:profile.id
//           }
//         },include:{
//           location:true
//         }})
      
//         const radius = parseFloat(req.query.radius) || 50
//       const profiles = await prisma.profile.findMany({where:{
//         isActive:{
//           equals:true
          
//         },location:{
//           isNot:null
//         }},include:{
//             location:true,
//             stories:{
//               where:{
//                 needsFeedback:true
//               }
//             }
//         }})
  
//         const collections = await prisma.collection.findMany({
//             where: {
//               AND:[{type:{
//                 equals:"feedback",
//               }},
//               {location:{
//                 isNot:null
//               }},{
//                 profileId:{
//                   notIn:[profile.id,process.env.PLUMBUM_PROFILE_ID]
//                 }
//               }]
              
//             },
//             include: {
//                 location:true,
//                 roles: {
//                   include:{profile:true}
//                 },
//                 storyIdList:{
//                   include:{
//                   story:{include:{author:true}}
//                   }
//                 }
//             }
//           });
//         let stories= await prisma.story.findMany({where:{
//             author:{
//               AND:[
//                 {isActive:true},
//                 {location:{
//                   isNot:null
//                 }}
//               ]
//             },
//             needsFeedback:{
//               equals:true
//             }
//           },include:{
//             author:{
//               include:{
//                 location:true
//               }
//             }
//           }})
//         let cols = groupColsByProximity({profile:prof,items:collections,radius})
//         let groups = groupUsersByProximity({profile:prof,items:profiles, radius});
//        let groupedByStory= groupStoryByProximity({profile:prof,items:stories})
  
//          cols = cols.filter(col=>{return col.roles.length<6})
      
//          cols = cols.filter(col=>{
  
//         let two = col.roles.find(role=>role.profile.id==prof.id)
//   return !two 
// })

//       let closestGroup = groupedByStory[0]

//         if(cols[0]){
    
      
//             const col = cols[0]
   
//               let role = await prisma.roleToCollection.create({
//               data:{
//                 role:"editor",
//                 profile:{
//                   connect:{
//                     id:prof.id
//                   }
//                 },
//                 collection:{
//                   connect:{
//                     id:col.id
//                   }
//                 }
//               }
//             ,include:{
//               collection:{
//                 include:{
//                   roles:{
//                     include:{
//                       profile:true
//                     }
//                   },
//                   location:true
//                 }      
//               },
//               profile:true
//             }})
//             if(story){
//               let stc = await createStoryToCollection({storyId:story.id,collectionId:col.id,profileId:prof.id})
//               try{  await prisma.story.update({where:{
//                 id:story.id,
//               },data:{
//                 needsFeedback:false
//               }})
//             }catch(err){
//               console.err(err)
//             }
             
//             }
//             let collection = await prisma.collection.findFirst({where:{
//               id:{
//                 equals:col.id
//               }
//             },include:{
//               childCollections:{
//                 include:{
//                   childCollection:{
//                     include:{
//                       storyIdList:{
//                         include:{
//                           story:true
//                         }
//                       }
//                     }
//                   }
//                 }
//               },
//               storyIdList:{
//                 include:{
//                   story:{
//                     include:{
//                       author:true
//                     }
//                   }
//                 }
//               }
//             }})
        
//             res.json({collection:collection})
//           }else if(closestGroup && closestGroup.length>0){
//               let storyGroup =closestGroup
          
//               const workshopCol= await createNewWorkshopCollection(
//                 {profile:prof}
//               )
//               if(story){
//                 const stc =  await createStoryToCollection({storyId:story.id,collectionId:workshopCol.id,profileId:prof.id})
//                 try{  await prisma.story.update({where:{
//                   id:story.id,
//                 },data:{
//                   needsFeedback:false
//                 }})
//               }catch(err){
//                 console.err(err)
//               }
//               }
//                  for(let i =0;i<6;i++){

//                   const otherStory = storyGroup[i]
//                   if(otherStory && otherStory.authorId && otherStory.authorId!=profile.id){
//                    let found = await findStoryToCollection({collectionId:workshopCol.id,storyId:otherStory.id,profileId:otherStory.authorId})
//                   if(!found){
//                     await createStoryToCollection({storyId:otherStory.id,collectionId:workshopCol.id,profileId:otherStory.authorId})
                 
//                }}}
//                   const col = await prisma.collection.findFirst({where:{id:{equals:workshopCol.id}},include:{
//                     storyIdList:{include:{
//                       story:{
//                         include:{
//                           author:true
//                         }
//                       }
//                     }},
//                     childCollections:{
//                       include:{
//                         childCollection:{include:{
//                           storyIdList:{

//                             include:{
//                               story:true
//                             }
//                           }
//                         }}
//                       }
//                     }
//                  ,location:true,
//                  profile:true,
//                     roles:{
//                       include:{
//                         profile:true
//                       }
//                     }
//                   }})
//                   res.json({collection:col})
//               }else{
//                let index=  groups.findIndex(0)
//               if(index>-1){
//                const newWorkshop = await createNewWorkshopCollection({profile:prof})
//                const group = groups[0]
//                const promises = group.map(profile=>{
//                   let i = profile.stories.findIndex(0)
//                   if(i>-1){
//                    let story = profile.stories[0]
//                   return createStoryToCollection({storyId:story.id,collectionId:newWorkshop.id,profileId:profile.id})
//                   }
//                })
//                await Promise.all(promises)
//                await prisma.profile.update({where:{
//                 id:prof.id
//                },data:{
//                 isActive:false
//                }})
           
//               const col = await prisma.collection.findFirst({where:{id:{equals:newWorkshop.id}}})
            
//               res.json({collection:col})
//               return
//             }else{
//               res.json({error:new Error("Not enough users active in your area. Increase your radius")})
//             }
//           }
//         } catch (error) {
//           console.log(error)
//         res.status(500).json({ error: error.message });
//           }
        
        
//         })
router.post('/groups', authMiddleware, async (req, res) => {
  try {
    const { story, profile } = req.body;
    const prof = await prisma.profile.findFirst({ where: { id: profile.id }, include: { location: true } });
    const radius = parseFloat(req.query.radius) || 50;
    
    // Data gathering
    const profiles = await getNearbyProfiles({ profileId: prof.id, radius });
    const collections = await getEligibleCollections({ profileId: prof.id });
    const availableCollections = filterAvailableCollections({ profile: prof, collections, radius });

    // Join a group if available
    if (availableCollections.length > 0) {
      const col = availableCollections;
      await addProfileToCollection({ profileId: prof.id, collection: col });
      if (story) await attachStory({ storyId: story.id, collectionId: col.id, profileId: prof.id });
      return res.json({ collection: col });
    }

    // Otherwise, create new group
    // ... further modular helpers for story grouping and new collection creation can be added here

    return res.json({ error: new Error("Not enough active users in your area. Increase your radius.") });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

        router.post('/groups/global', authMiddleware,async (req, res) => {
          try {
   
            const {story,profile}=req.body
            let workshopCollection = null
            const prof = await prisma.profile.findFirst({where:{
              id:{
                equals:profile.id
              }
            }})
    
      
            const collections = await prisma.collection.findMany({
                where: {
                  AND:[{
                    type:{
                      equals:"feedback",
                    }
                  },{
                    profile:{
                      id: {
                        notIn:[profile.id,process.env.PLUMBUM_PROFILE_ID]
                      }
                    }
                  },
                 {storyIdList:{
                  some:{
                    story:{
                      authorId:{
                        notIn:[profile.id,process.env.PLUMBUM_PROFILE_ID]
                      }
                    }
                  }
                 }},{roles:{
                        some:{
                          profileId:{
                            notIn:[profile.id,process.env.PLUMBUM_PROFILE_ID]
                          }
                        }
                      }}]
                  ,
                  OR:[{location:{
                    is:null
                  }},{isOpenCollaboration:{equals:true}}]
                },
                include: {
                    roles: {
                      include:{profile:true}
                    },
                    storyIdList:{
                      include:{
                      story:{include:{author:true}}
                      }
                    }
                }
              });
            let stories= await prisma.story.findMany({where:{
                AND:[{author:{
                  AND:[{
                    id:{
                    not:prof.id
                    
                  }},{isActive:{
                    equals:true
                  }}]
                }},{
                needsFeedback:{
                  equals:true
                }}]
              },include:{
                author:{
                  include:{
                    location:true
                  }
                }
              }})
          let cols =  collections.filter(col=>{
            return col.roles.length<6
          })
        
          const groups = groupItemsByCount({items:stories,groupSize:6}) 

             if(cols[0]){
              const col = cols[0]
              if(story){
                let stc = await createStoryToCollection({storyId:story.id,collectionId:col.id,profileId:prof.id})
               
                try{  
                  
                  await prisma.story.update({where:{
                  id:story.id,
                },data:{
                  needsFeedback:false
                }})


              }catch(err){
                console.err(err)
              }
              }

              if(col.storyIdList.length<5){
                let current = col.storyIdList.length
                if(story){
                  current+=1
                }
                for(let i=0;current+i<6,i++;){
                 let page = stories.pop()
                 if(page&&page.id){
                 await createStoryToCollection({storyId:page.id,collectionId:col.id,})
                 }
                }
                 workshopCollection = await prisma.collection.findFirst({where:{
                  id:col.id,
                 
                },include:{
                  roles:{
                    include:{
                      profile:true
                    }
                  },
                  storyIdList:{
                    include:{
                      story:{
                        include:{
                          author:true
                        }
                      }
                    }
                  }
                }})
                res.json({collection:workshopCollection})
              }else{
             workshopCollection =await   prisma.collection.findFirst({where:{
                  id:{
                    equals:col.id
                  }
                },include:{
                  roles:{
                    include:{
                      profile:true
                    }
                  },
                  storyIdList:{
                    include:{
                      story:{
                        include:{
                          author:true
                        }
                      }
                    }
                  }
                }})
                res.json({collection:workshopCollection})
              }
             }else{
              workshopCollection =  await createNewWorkshopCollection({profile:prof})
              if(story&&story.id &&workshopCol.id){
             await createStoryToCollection({storyId:story.id,collectionId:workshopCol.id,})
               
               let current = 1
               let i = 0
               while(current<6||groups.length>0){
                const group =  groups[i]
                for(current;current<=6;current+=1){
                  page = group.pop()
                  await createStoryToCollection({storyId:story.id,collectionId:workshopCol.id})
                  if(current==6){
                    break
                  }
                }
                
               }
            
              workshopCollection = await prisma.collection.findFirst({where:{
                id:workshopCollection.id,
               
              },include:{
                roles:{
                  include:{
                    profile:true
                  }
                },
                storyIdList:{
                  include:{
                    story:{
                      include:{
                        author:true
                      }
                    }
                  }
                }
              }})
            }}
           
              res.json({collection:workshopCollection})
             
   


            } catch (error) {
              console.log({error})
            res.status(500).json({ error: error });
              }
                
            
})
  
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
            { location: { isNot: null } },
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