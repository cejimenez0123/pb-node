const express = require('express');
const prisma = require("../db");
const generateMongoId = require("./generateMongoId");
const router = express.Router()
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs")

const { markNotificationsRead } = require('../utils/notifyUser.js');
const getProfileRecommendations = require("../utils/recommenders/getProfileRecommendations.js")
const deleteCol =async()=>{
    
    await prisma.roleToCollection.deleteMany({where:{
        collectionId:{
            equals:id
        }
    }})

    await prisma.userCollectionHistory.deleteMany({where:{
        collectionId:{
            equals:id
        }
    }})
    await prisma.storyToCollection.deleteMany({where:{
        collection:{
            id:{equals:id}
        }
    }})
    await prisma.collectionToCollection.deleteMany({where:{
        parentCollection:{
            id:{equals:id}
        }
    }})
    await prisma.collectionToCollection.deleteMany({where:{
        childCollection:{
            id:{equals:id}
        }
    }})
    await prisma.profileToCollection.deleteMany({where:{
        collectionId:{
            equals:id
        }
    }})
    await prisma.collection.delete({where:{
        id: id
    }})
}
const deletStory=async({id})=>{
    let story = await prisma.story.findFirstOrThrow({where:{id:{equals:id}}})
    await prisma.storyToCollection.deleteMany({where:{
        storyId:{equals:story.id}
    }}) 
    let comments =  await prisma.comment.findMany({where:{storyId:{
        equals:story.id
    }}})
    let promises =comments.map( com=>{
return deleteCommentsRf(com)
        
        })

await Promise.all(promises)

  
   
    await prisma.roleToStory.deleteMany({where:{
        storyId:{
            equals:story.id
        }
    }})
    await prisma.hashtagStory.deleteMany({where:{
        storyId:{
            equals:req.params.id
        }
    }})
    await prisma.story.delete({  where: {
        id:req.params.id
      },
    })
 
}
module.exports = function (authMiddleware){
    router.get("/",async (req,res)=>{
        const profiles = await prisma.profile.findMany({include:{
         
         
        }})
        res.status(200).json({profiles:profiles})
    })
    router.post("/",async(req,res)=>{
        const  {email,googleId,password,username,profilePicture,selfStatement,privacy}=req.body
        try{
           
            const decoded = jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWT_SECRET);
    
            if(decoded.applicantId){
            const hashedPassword = await bcrypt.hash(password, 10);
               const user = await prisma.user.update({
                where:{
                  id:decoded.applicantId
                
                },data:{
                    googleId:googleId,
                    password:hashedPassword,
                    verified:true
                }
            })
   
    try{
   
        let profile = await prisma.profile.create({data:{
            user:{
                connect:{
                    id:user.id,
                   
                }
            },
            profilePic:profilePicture,
             username:username?.toLowerCase(),
            selfStatement:selfStatement,
            isPrivate:privacy
        },include:{
            likedStories:true,
            historyStories:true,
            collectionHistory:true,
            collections:true,
            stories:true,
            location:true,
            followers:true,
            following:true
        }})
        const verifiedToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '23h' });
        res.json({profile,token:verifiedToken})
    }catch(error){
        
        res.status(409).json({error: new Error("Username already taken")})
    }
}else{
    throw new Error("User not found")
}
    }catch(error){
    console.log(error)
        res.status(409).json({error})
    }
    
    
    
    })
    router.get("/:id/protected",authMiddleware,async (req,res)=>{
        try{
        const currentUserId = req.user.profiles[0].id
const profile = await prisma.profile.findFirst({
  where: {
    id: req.params.id
  },
  include: {
    followers:{
        where:{
            followerId:{equals:currentUserId}
        }
    },
    following:{
        where:{
            followingId:{equals: currentUserId}
        }
    },
    location: true,
stories:{
    orderBy:{
        updated:"desc"
    },
    where:{
        
        OR:[{isPrivate:{equals:false}},{
            betaReaders:{
                some:{
                    profileId:req.params.id
                }
            }
        }]
    },take:100

},
    collections: {
      where: {
        
        OR: [
          { isPrivate:false },
          {
            roles: {
              some: {
                profileId: {equals:currentUserId}
              }
            }
          }
        ]},take:100,
      orderBy:{
        updated:"desc"
      }
    },
    
    _count:{
        select:{
            followers:true,
            following:true
        }
    }
   
  }
});

        res.status(200).json({profile:profile})

    }catch(err){
     console.log(err)
        res.status(409).json({error:err})
    }
    })
    router.get("/:id/public",async (req,res)=>{
        try{
        
        const profile = await prisma.profile.findFirst({where:{
            id: req.params.id
        },include:{
            location:true,
            _count:{
                select:{
                    followers:true,
                    following:true,
                }
            },
            stories:{
                where:{isPrivate:{equals:false}}
            },
            collections:{
                where:{isPrivate:{equals:false}}
  
                }
            
           
           
        }})
        res.status(200).json({profile:profile})

    }catch(err){
     
        res.status(409).json({error:err})
    }
    })

    router.put("/:id",authMiddleware,async (req,res)=>{
        const {username,profilePicture,selfStatement,privacy,location} = req.body
      
      
        
      try{
       let  city =""
       if(location && location.address && location.address.length>0){
      const parts = location.address.split(',').map(p => p.trim());
      city = `${parts[2]}, ${parts[-1]}` || "";
       }
       let  locale = location && location.latitude?await prisma.location.upsert({
  where: {
    location_coords: {
      latitude: location.latitude,
      longitude: location.longitude
    }
  },
  update: { city: location.city,
    latitude: location.latitude,
    longitude: location.longitude},
  create: {
    city: location.city,
    latitude: location.latitude,
    longitude: location.longitude
    
  }
}):null
let profile = null
       if(locale && locale.latitude && locale.longitude){
        profile = await prisma.profile.update({where:{
            id: req.params.id
        },data:{
            username: username.toLowerCase(),
            profilePic:profilePicture,
            selfStatement:selfStatement,
            isPrivate:privacy,
            location:{
                connect:{
                    id:locale.id
                }
            }
        },include:{
            location:true,
            likedStories:true,
            historyStories:true,
            collectionHistory:true,
            collections:true,
            stories:true,
            followers:true
        }})
    }else{profile =prisma.profile.update({where:{
            id: req.params.id
        },data:{
            username: username?.toLowerCase(),
            profilePic:profilePicture,
            selfStatement:selfStatement,
            isPrivate:privacy,
           
            
        },include:{
             location:true,
            likedStories:true,
            historyStories:true,
            collectionHistory:true,
            collections:true,
            stories:true,
            followers:true
        }})
      
    }
      res.json({profile})
    }catch(e){
        
        res.status(409).json({error:e})
    }
    })
    router.get("/user/:id/public",async (req,res)=>{
       try{
        const profiles = await prisma.profile.findMany({where:{
           AND:[{ user:{
                id: req.params.id
            }},{isPrivate:{equals:false}}]
       },include:{
        followers:{
            include:{
                follower:true
            }
        }
       }})

res.json({profiles})
}catch(err){
console.log(err)
res.status(409).json({error:err})
}
})
router.delete("/:id",authMiddleware,async (req,res)=>{

    const profile = req.user.profiles[0]
    try{
        let profColsId = await prisma.collection.findMany({where:{profileId:{
                equals:profile.id
            }}})
         let profStoriesId = await prisma.story.findMany({where:{profileId:{
                equals:profile.id
            }},select:{
id:true
            }})
        let followsId = await prisma.follow.findMany({where:{
            OR:[{followerId:{
                equals:profile.id
            }},{followingId:{
                equals:profile.id
            }}]
        },select:{
            id:true
        }})
        let userColHist = await prisma.userCollectionHistory.findMany({where:{
            profileId:{equals:profile.id}
        },select:{
            id:true
        }})
        let userStoryHist = await prisma.userStoryHistory.deleteMany({where:{
            profileId:{equals:profile.id}
        },select:{
            id:true
        }})
        let userStoryLike = await prisma.userStoryLike.findMany({where:{
            profileId:{equals:profile.id}
        },select:{
            id:true
        }})
    }catch(error){

    }

})


router.get("/:profileId/recommendations", async (req, res) => {
  try {
    const { profileId } = req.params;
    const { limit } = req.query;
    const recommendations = await getProfileRecommendations(profileId, limit);
    console.log(recommendations)
    res.json({ profiles:recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});
router.patch("/notifications/read", authMiddleware, async (req, res) => {
  try {
    const profileId = req.user.profiles[0].id;

    await markNotificationsRead(profileId);

    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err });
  }
});


router.post("/device-token", authMiddleware, async (req, res) => {
    try {
        const { token, platform = "ios" } = req.body;
        const profileId = req.user.profiles[0].id;

        try {
            await prisma.deviceToken.create({
                data: { token, profileId, platform }
            });
        } catch (err) {
            // token already exists — just update it
            if (err.code === 'P2002') {
                await prisma.deviceToken.updateMany({
                    where: { token },
                    data: { profileId, platform }
                });
            } else {
                throw err;
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error("DEVICE_TOKEN_ERROR", error.message);
        res.status(500).json({ error: "Server error" });
    }
});
router.get("/:id/alert", authMiddleware, async (req, res) => {
  try {
    const profId = req.user.profiles[0].id;
    const profile = req.user.profiles[0];
    const lastNotified = profile.lastNotified || new Date(0);

    // --- COLLECTIONS ---
    const collections = await prisma.collection.findMany({
      where: {
        roles: { some: { profileId: { equals: profId } } },
        type: { not: "feedback" }
      },
      include: {
        profile: true,
        roles: { where: { profileId: { equals: profId } } },
        storyIdList: {
          where: {
            story: { updated: { gte: new Date(lastNotified) } }
          },
          include: { story: { include: { author: true } } }
        }
      }
    });

    // --- FOLLOWING ---
    const following = await prisma.follow.findMany({
      where: { followerId: { equals: profId } },
      include: {
        following: {
          include: {
            stories: {
              where: {
                AND: [
                  {
                    OR: [
                      { betaReaders: { some: { profileId: { equals: profId } } } },
                      { isPrivate: false }
                    ]
                  },
                  { created: { gte: new Date("2025-01-01") } }
                ]
              },
              include: {
                collections: {
                  where: {
                    collection: {
                      OR: [
                        { roles: { some: { profileId: { equals: profId } } } },
                        { isPrivate: { equals: false } }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // --- FOLLOWERS ---
    const followers = await prisma.follow.findMany({
      where: { followingId: { equals: profId } },
      include: { follower: true }
    });

    // --- COMMENTS ---
    const comments = await prisma.comment.findMany({
      where: {
        AND: [
          { story: { authorId: { equals: profId } } },
          { updated: { gte: lastNotified } }
        ]
      },
      include: {
        profile: true,
        story: { include: { author: true } }
      }
    });

    // --- BUILD NOTIFICATIONS ---
    const notifications = [];
    const seen = new Set();

    const push = (itemId, obj) => {
      if (!seen.has(itemId)) {
        seen.add(itemId);
        notifications.push({ ...obj, itemId });
      }
    };

    // Collection story updates
    collections.forEach(col => {
      col.storyIdList.forEach(({ story }) => {
        if (new Date(story.updated) > new Date(lastNotified)) {
          push(story.id, {
            profileId: profId,
            title: `Collection Updated: ${col.profile.username}`,
            body: story.title
          });
        }
      });
    });

    // New comments
    comments.forEach(com => {
      push(com.id, {
        profileId: profId,
        title: `New comment from ${com.profile.username}`,
        body: com.story.title
      });
    });

    // New followers
    followers.forEach(fol => {
      push(fol.id, {
        profileId: profId,
        title: `New follower: ${fol.follower.username}`,
        body: `You have a new follower!`
      });
    });

    // Following users' new stories
    following.forEach(fol => {
      fol.following.stories.forEach(story => {
        if (new Date(story.created) > new Date(lastNotified)) {
          push(story.id, {
            profileId: profId,
            title: `New story from ${fol.following.username}`,
            body: story.title
          });
        }
      });
    });

    // --- SEND PUSH NOTIFICATIONS ---
    // await Promise.all(
    //   notifications.map(n => sendNotification(n.profileId, n.title, n.body))
    // );

    // --- UPDATE lastNotified ---
    const { seen: seenParam } = req.query;
    if (seenParam === "true") {
      await prisma.profile.update({
        where: { id: profId },
        data: { lastNotified: new Date() }
      });
    }

    res.json({ collections, comments, following, followers, notifications });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

//         const { token,platform="ios" } = req.body;
//         const profileId = req.user.profiles[0].id;
// const existing = await prisma.deviceToken.findFirst({ where: { token } });

// if (existing) {
//     await prisma.deviceToken.update({
//         where: { id: existing.id },
//         data: { profileId, platform }
//     });
// } else {
//     await prisma.deviceToken.create({
//         data: { token, profileId, platform }
//     });
// }

//         res.json({ success: true });
//     } catch (error) {
//         console.error("DEVICE_TOKEN_ERROR", error.message);
//         res.status(500).json({ error: "Server error" });
//     }
// });
// router.get("/:id/alert", authMiddleware, async (req, res) => {
//   try {
//     const profId = req.user.profiles[0].id;
//     const profile = req.user.profiles[0];
//     const lastNotified = profile.lastNotified || new Date(0); // fallback if null

//     // --- FETCH DATA ---
//     let collections = await prisma.collection.findMany({
//       where:{OR:[ { profileId:{
//         equals:profId
//       } },{roles:{some:{
//         profileId:{
//           equals:profId
//         }
//       }}}],
     
//     },include:{
//       profile:true
//     }});

//     const following = await prisma.follow.findMany({ where:{
//         followerId:{
//           equals:profId
//         }
//     },include:{
//       following:{
//         include:{
//           collections:{where:{
//             AND:[{updated:{
//               gt:lastNotified
//             }}]
//           }},
//           stories:{
//             where:{
//               AND:[{updated:{
//                 gt:lastNotified
//               }},{betaReaders:{
//                 some:{
//                   profileId:{
//                     equals:profId
//                   }
//                 }
//               }}]
//             }
//           }
//         }
//       }
//     }});
//     const followers = await prisma.follow.findMany({ where:{AND:[
// {followingId:{
//           equals:profId
//         }},{created:{
//           gt:lastNotified
//         }}]
//     } ,include:{
//       follower:true
//     }});
//     const comments = await prisma.comment.findMany({ where:{
//      AND:[ {parent:{
//         profileId:{
//           equals:profId
//         }
//       }}]
//     },include:{
//       story:{
//         select:{
//           id:true,
//           title:true
//         }
//       },
//       profile:true
//     }});

//     // --- PREPARE NOTIFICATIONS ---
//     const notifications = [];

//     // Collections updates
//     collections.forEach(col => {
//       if (col.storyIdList.length > 0) {
//         col.storyIdList.forEach(storyItem => {
//           const story = storyItem.story;
//           if (new Date(story.updated) > new Date(lastNotified)) {
//             // prevent duplicates by story ID
//             if (!notifications.find(n => n.itemId === story.id)) {
//               notifications.push({
//                 profileId: profId,
//                 title: `Collection Updated: ${col.profile.username}`,
//                 body: story.title,
//                 itemId: story.id
//               });
//             }
//           }
//         });
//       }
//     });

//     // New comments
//     comments.forEach(com => {
//       if (new Date(com.updated) > new Date(lastNotified)) {
//         if (!notifications.find(n => n.itemId === com.id)) {
//           notifications.push({
//             profileId: profId,
//             title: `New comment from ${com.profile.name}`,
//             body: com.story.title,
//             itemId: com.id
//           });
//         }
//       }
//     });

//     // New followers
//     followers.forEach(fol => {
//       if (new Date(fol.createdAt) > new Date(lastNotified)) {
//         if (!notifications.find(n => n.itemId === fol.id)) {
//           notifications.push({
//             profileId: profId,
//             title: `New follower: ${fol.follower.name}`,
//             body: `You have a new follower!`,
//             itemId: fol.id
//           });
//         }
//       }
//     });

//     // Following users' new stories
//     following.forEach(fol => {
//       fol.following.stories.forEach(story => {
//         if (new Date(story.created) > new Date(lastNotified)) {
//           if (!notifications.find(n => n.itemId === story.id)) {
//             notifications.push({
//               profileId: profId,
//               title: `New story from ${fol.following.name}`,
//               body: story.title,
//               itemId: story.id
//             });
//           }
//         }
//       });
//     });

//     // --- SEND NOTIFICATIONS ---
//     await Promise.all(
//       notifications.map(n =>
//         sendNotification(n.profileId, n.title, n.body)
//       )
//     );

    


//     // --- RETURN DATA ---
//     res.json({ collections, comments, following, followers });

//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ error: err.message });
//   }
// });
//     router.post('/save-token', authMiddleware, async (req, res) => {
//   try {
//     const { profileId, token ,platform} = req.body;
//     await prisma.deviceToken.upsert({
//       where: { token },
//       update: { profileId },
//       create: { profileId, token },
//     });
//     res.json({ success: true });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ error: err.message });
//   }
// });
router.get("/protected", authMiddleware, async (req, res) => {
  try {
    if (!req?.user) {
      return res.status(403).json({ message: "No profile found." });
    }

    const currentProfile = req.user?.profiles?.[0];

    if (!currentProfile?.id) {
      return res.status(403).json({ message: "No profile found." });
    }

    const profileId = currentProfile.id;


    const profile = await
      prisma.profile.findFirst({
        where: { id: profileId },
        include: 
          { location:true,
        
            user:{
              select:{
                lastLogin:true
              }
            },
          hashtag:{
            include:{
             hashtag:true
            
            }
          },
          profileToCollections: {
            include: {
              
              collection:{
                
                include:{
                  childCollections:{
                    select:{
                      childCollection:{
                        select:{
                          id:true,
                          title:true,
                          type:true,
                          
                        }
                      }
                    }
                  },
                 storyIdList:{
                  select:{
                    story:{
                      select:{
                        id:true,
                        title:true,
                        description:true,
                        type:true
                      }
                    }
                  
                  }
                 },
            }
              
              
            }
            }},_count:{
              select:{
                followers:true,
                following:true
              }
            }}
      })





    return res.status(200).json({
     profile
       
      
    });

  } catch (error) {
    console.error("PROTECTED ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

    router.get("/:id/collection",async (req,res)=>{
try{
        let bookmarks = await prisma.profileToCollection.findMany({
            where:{
                profile:{
                    id: req.params.id
                }
            }
        })
        res.json({bookmarks})
    }catch(err){
        console.log(err)
        res.status(409).json({error:err})
    }
    })
    router.post("/:id/collection/:colId",async (req,res)=>{
        try{
            const bookmark = await prisma.profileToCollection.create({
                data:{
                    collection:{
                        connect:{
                            id: req.params.colId
                        }
                    },
                    profile:{
                        connect:{
                            id:req.params.id
                        }
                    }
                }

            })

            res.json({bookmark})
        }catch(err){
            console.log(err)
            res.status(409).json({error:err})
        }
    })
    return router
    
}
