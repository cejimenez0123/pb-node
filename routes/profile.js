const express = require('express');
const prisma = require("../db");
const router = express.Router()
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs")
const { SPRINT_SLOTS } = require('../cron/sprint.js');
const { markNotificationsRead } = require('../utils/notifyUser.js');
const getProfileRecommendations = require("../utils/recommenders/getProfileRecommendations.js");
const createNewProfileUser = require('../utils/createNewProfileUser.js');
const optionalAuth = require('../middleware/optionalAuth.js');
const attachBlockedProfiles = require('../middleware/attechBlockedProfiles.js');
const client = require('../utils/algoliaClient.js');
const indexNames = require('../utils/indexNames.js');
const { object } = require('firebase-functions/v1/storage');


function getActiveProfileId(req, res) {
  const profileId = req.user?.profiles?.[0]?.id;
  if (!profileId) {
    return res.status(403).json({ error: "No active profile" });
   
  }
  return profileId;
}
module.exports = function (authMiddleware){
    const withOptionalBlocks = [optionalAuth, attachBlockedProfiles];
    router.get("/",withOptionalBlocks,async (req,res)=>{
       const blockedIds = Array.isArray(req.blockedProfileIds) ? req.blockedProfileIds : [];

    const profiles = await prisma.profile.findMany({
      where: {
        isPrivate: false,
        ...(blockedIds.length ? { id: { notIn: blockedIds } } : {}),
      },
    });
        return res.status(200).json({profiles:profiles})
    })
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


    const profile = await prisma.profile.findFirst({
  where: { id: profileId },
  include: {
    location: true,

    user: {
      select: {
        id: true,
        termsAcceptedAt: true,
        termsVersion: true,
        lastLogin: true
      }
    },
    hashtag: {
      include: {
        hashtag: true
      }
    },
    profileToCollections: {
      include: {
        collection: {
          include: {
            childCollections: {
              select: {
                childCollection: {
                  select: {
                    id: true,
                    title: true,
                    type: true,
                  }
                }
              }
            },
            storyIdList: {
              select: {
                storyId: true,
                story: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    type: true
                  }
                }
              }
            },
          }
        }
      }
    },
    _count: {
      select: {
        followers: true,
        following: true
      }
    }
  }
})





    return res.status(200).json({
     profile
       
      
    });

  } catch (error) {
    console.error("PROTECTED ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
  
});

    router.post("/",async(req,res)=>{
      const { email, googleId, password, username, profilePicture, selfStatement, privacy, termsVersion, termsAcceptedAt } = req.body
        try{
           
           
  const authHeader = req.headers.authorization;
if (!authHeader?.startsWith("Bearer ")) {
  return res.status(401).json({ error: "Missing token" });
}
const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
            if(decoded.applicantId){
                if (!termsVersion || !termsAcceptedAt) {
                return res.status(400).json({ error: new Error("Terms of Service must be accepted") })
            }
            const hashedPassword = await bcrypt.hash(password, 10);
    
                       const user = await prisma.user.update({
                where: {
                    id: decoded.applicantId
                }, data: {
                    googleId: googleId,
                    password: hashedPassword,
                    verified: true,
                    termsVersion: termsVersion,
                    termsAcceptedAt: new Date(termsAcceptedAt)
                }
            })
   
    try{
 const profile = await  createNewProfileUser({username,profilePicture,selfStatement,isPrivate:privacy,userId:user.id})
   
        const verifiedToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '23h' });

client.saveObject({indexName:indexNames.profile,body:{
  objectID:profile.id,
  username:profile.username,
  type:"profile"
}})
        return res.json({ profile: profile, token: verifiedToken, termsVersion: user.termsVersion })
 } catch (error) {
                return res.status(409).json({ error: new Error("Username already taken") })
            }
        } else {
            throw new Error("User not found")
        }
    } catch (error) {
        console.log(error)
        return res.status(409).json({ error })
    }
    
    
    })
    router.post("/device-token", authMiddleware, async (req, res) => {
    try {
        const { token, platform = "ios" } = req.body;
const profileId = req.user?.profiles?.[0]?.id;
if (!profileId) return res.status(403).json({ error: "No active profile" });

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

        return res.json({ success: true });
    } catch (error) {
        console.error("DEVICE_TOKEN_ERROR", error.message);
        return res.status(500).json({ error: "Server error" });
    }
});
router.patch("/notifications/read", authMiddleware, async (req, res) => {
  try {
 const profileId = getActiveProfileId(req, res);
if (!profileId) return;

    await markNotificationsRead(profileId);

    return res.json({ message: "Notifications marked as read" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err });
  }
});
    router.get("/:id/protected",authMiddleware,async (req,res)=>{
        try{
       const currentUserId = req.user?.profiles?.[0]?.id;
    if (!currentUserId) {
      return res.status(403).json({ error: "No active profile" });
    }
     
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
        
        OR:[{isPrivate:{equals:false}}]
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

        return res.status(200).json({profile:profile})

    }catch(err){
     console.log(err)
        return res.status(409).json({error:err})
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
        return res.status(200).json({profile:profile})

    }catch(err){
     
        return res.status(409).json({error:err})
    }
    })
router.put("/:id", authMiddleware, async (req, res) => {
  const {
    username,
    profilePicture,
    selfStatement,
    privacy,
    location,
    writingSprintSlots,  // ← new
  } = req.body;

  try {
    // Validate + sanitize sprint slots if provided
    const validSlotIds = Object.keys(SPRINT_SLOTS);
    const sanitizedSlots = Array.isArray(writingSprintSlots)
      ? writingSprintSlots.filter((s) => validSlotIds.includes(s))
      : undefined; // undefined = don't touch the field if not sent


 const profileId = req.params.id;
if (!profileId) {
  return res.status(400).json({ error: "Missing profile id" });
}

if (location && (location.latitude == null || location.longitude == null)) {
  return res.status(400).json({ error: "Invalid location" });
}

    const locale = location?.latitude
      ? await prisma.location.upsert({
          where: {
            location_coords: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
          },
          update: {
            city: location.city,
            latitude: location.latitude,
            longitude: location.longitude,
          },
          create: {
            city: location.city,
            latitude: location.latitude,
            longitude: location.longitude,
          },
        })
      : null;

    const includeBlock = {
      location: true,
      likedStories: true,
      historyStories: true,
      collectionHistory: true,
      collections: true,
      stories: true,
      followers: true,
    };

    // Shared data payload — only spread slots if they were actually sent
    const sharedData = {
      username: username?.toLowerCase(),
      profilePic: profilePicture,
      selfStatement,
      isPrivate: privacy,
      ...(sanitizedSlots !== undefined && { writingSprintSlots: sanitizedSlots }),
    };

    let profile;

    if (locale?.latitude && locale?.longitude) {
      profile = await prisma.profile.update({
        where: { id: req.params.id },
        data: {
          ...sharedData,
          location: { connect: { id: locale.id } },
        },
        include: includeBlock,
      });
    } else {
      profile = await prisma.profile.update({ // fix: was missing await
        where: { id: req.params.id },
        data: sharedData,
        include: includeBlock,
      });
    }

 await client.partialUpdateObject({
      indexName:indexNames.profile,
      objectID:profile.id,
      attributesToUpdate:{
  // username:profile.username
  username:profile.username
      }
  
    })
    return res.json({ profile });
  } catch (e) {

  if (e.code === 'P2002') {
    return res.status(409).json({ error: 'Username already taken' });
  }
  return res.status(500).json({ error: e.message });
}
});

    router.get("/user/:id/public",async (req,res)=>{
       try{
    const profiles = await prisma.profile.findMany({
      where: {
        userId: req.params.id,
        isPrivate: false,
      },
      include: {
        followers: {
          include: { follower: true },
        },
      },
    });

return res.json({profiles})
}catch(err){
console.log(err)
return res.status(409).json({error:err})
}
})

router.delete("/:id", authMiddleware, async (req, res) => {
  const profile = req.user?.profiles[0];
  try {
    const stories = await prisma.story.findMany({
      where: { authorId: profile.id },
      select: { id: true }
    });
    const storyIds = stories.map(s => s.id);

    // Junction tables and relations first
    await prisma.comment.deleteMany({ where: { profileId: profile.id } });
    await prisma.hashtagStory.deleteMany({ where: { profileId: profile.id } });
    await prisma.hashtagComment.deleteMany({ where: { profileId: profile.id } });
    await prisma.hashtagCollection.deleteMany({ where: { profileId: profile.id } });
    await prisma.userStoryLike.deleteMany({ where: { profileId: profile.id } });
    await prisma.userStoryHistory.deleteMany({ where: { profileId: profile.id } });
    await prisma.userCollectionHistory.deleteMany({ where: { profileId: profile.id } });
    await prisma.roleToStory.deleteMany({ where: { profileId: profile.id } });
    await prisma.roleToCollection.deleteMany({ where: { profileId: profile.id } });
    await prisma.storyToCollection.deleteMany({ where: { profileId: profile.id } });
    await prisma.collectionToCollection.deleteMany({ where: { profileId: profile.id } });
    await prisma.profileToCollection.deleteMany({ where: { profileId: profile.id } });
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: profile.id },
          { followingId: profile.id }
        ]
      }
    });
    await prisma.hashtagFollower.deleteMany({ where: { followerId: profile.id } });
    await prisma.notification.deleteMany({ where: { profileId: profile.id } });
    await prisma.message.deleteMany({ where: { senderId: profile.id } });
    await prisma.deviceToken.deleteMany({ where: { profileId: profile.id } });

    // Stories and collections
    if (storyIds.length > 0) {
      await prisma.story.deleteMany({ where: { authorId: profile.id } });
    }
    await prisma.collection.deleteMany({ where: { profileId: profile.id } });

    // Referrals on user
    await prisma.referralUse.deleteMany({ where: { userId: req.user.id } });
    await prisma.referral.deleteMany({ where: { createdById: req.user.id } });

    // Profile then user last
    await prisma.profile.delete({ where: { id: profile.id } });
    await prisma.user.delete({ where: { id: req.user.id } });
await client.deleteObject({
      indexName:indexNames.profile,
      objectID:profile.id
      
      
  
    })
    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

router.get("/:profileId/recommendations", async (req, res) => {
  try {
    const { profileId } = req.params;
  const limitNum = Number(req.query.limit) || 10;
const recommendations = await getProfileRecommendations(profileId, limitNum);

   return res.json({ profiles:recommendations });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});




router.get("/alert", authMiddleware, async (req, res) => {
  try {
    
       const profId = req.user?.profiles?.[0]?.id;
      if (!profId) {
      return res.status(403).json({ error: "No active profile" });
    }
    const profile = await prisma.profile.findFirst({where:profId,select:{
      lastNotified:true,
      id:true,
      lastActive:true
    }})
    
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

 
    const { seen: seenParam } = req.query;
    if (seenParam === "true") {
      await prisma.profile.update({
        where: { id: profId },
        data: { lastNotified: new Date() }
      });
    }

    return res.json({ collections, comments, following, followers, notifications });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
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
        return res.json({bookmarks})
    }catch(err){
        console.log(err)
        return res.status(409).json({error:err})
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

            return res.json({bookmark})
        }catch(err){
            console.log(err)
            return res.status(409).json({error:err})
        }
    })
    return router
    
}
