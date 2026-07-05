const express = require('express');
const prisma = require("../db");
const router = express.Router()
const updateWriterLevelMiddleware = require("../middleware/updateWriterLevelMiddleware")
const fetchEvents = require("../newsletter/fetchEvents");
const getStory = require('../utils/getstory');
const { default: safeQuery } = require('../utils/safrQuery');
const checkContent = require('../utils/checkContent.js');
const attachBlockedProfiles = require('../middleware/attechBlockedProfiles.js');
const client = require("../utils/algoliaClient.js")
const optionalAuth = require("../middleware/optionalAuth");
const { getTodaysPrompt } = require('../cron/sprint.js');
const shuffle = require('../utils/shuffle.js');
const indexNames = require('../utils/indexNames.js');



const recommendStories = async (profileId) => {
    // Fetch user history
    const profile = await prisma.profile.findFirst({where:{
        id:{
            equals:profileId
        }
    },include:{
        historyStories:{
                include:{
                    story:{
                        include:{
                            hashtags:true,
                            author:true
                        }
                    }
                }
        },
        likedStories:{
            include:{
            story:{
                include:{
                    hashtags:true,
                    author:true
                },
        
            }
            }
        },
    }})
let fullList = []
for(let i = 0;i<profile.likedStories.length;i++){
    const recommendations = await prisma.story.findMany({
        where: { 
          isPrivate:false,
          hashtags: { hasSome: profile.likedStories[i]?.hashtags
           } ,
         },select:{
              id:true
          }
      });
      fullList=[...recommendations,...fullList]
}

  
    return fullList.map(rec=>rec.id);
  };
  const getContentBasedScores = async (likedStories) => {
    const scores = {};

    for (const likedStory of likedStories) {
    
      const likedStoryData = await prisma.story.findUnique({
        where: { id: likedStory.storyId },
        include: { hashtags: true },
      });
  
      if (!likedStoryData) continue;
  
      const likedStoryHashtags = likedStoryData.hashtags.map((tag) => tag.hashtagId);
      
    
      const similarStories = await prisma.story.findMany({
        where: {
          hashtags: {
            some:{
                hashtag:{
                    id:{
                        in: likedStoryHashtags
                    }
                }
            }
         
          },
          id: { not: likedStory.storyId }, // Exclude the liked story itself
        },include:{
            hashtags:{
                include:{
                    hashtag:true
                }
            }
        }
      });
  
      // Assign scores to the similar stories
      for (const story of similarStories) {
        if (!scores[story.id]) scores[story.id] = 0;
  
        // Score is based on the number of matching hashtags
        const matchingTags = story.hashtags.filter((tag) =>
          likedStoryHashtags.includes(tag.hashtagId)
        ).length;
        scores[story.id] += matchingTags;
      }
    }
  
    return scores;
  };
  
  const getCollaborativeScores = async (profileId) => {
    const scores = {};
  
    // Find stories liked by the user
    const userLikes = await prisma.userStoryLike.findMany({
      where: { profileId: profileId },
      select: { storyId: true },
    });
    const likedStoryIds = userLikes.map((like) => like.storyId);
  
    // Find other users who liked the same stories
    const similarUsers = await prisma.userStoryLike.findMany({
      where: {
        storyId: { in: likedStoryIds },
        profileId: { not: profileId }, // Exclude the current user
      },
      select: { profileId: true },
    });
    const similarUserIds = [...new Set(similarUsers.map((user) => user.profileId))];
  
    // Get stories liked by similar users
    const similarUserLikes = await prisma.userStoryLike.findMany({
      where: {
        profileId: { in: similarUserIds },
        storyId: { notIn: likedStoryIds }, // Exclude stories already liked by the user
      },
      select: { storyId: true },
    });
  
    // Assign scores based on how many similar users liked each story
    for (const like of similarUserLikes) {
      if (!scores[like.storyId]) scores[like.storyId] = 0;
      scores[like.storyId] += 1; // Increment score for each like
    }
  
    return scores;
  };
  

  
module.exports = function ({authMiddleware}){
    const allMiddlewares = [authMiddleware,updateWriterLevelMiddleware];
     const withBlocks = [authMiddleware, attachBlockedProfiles];
     const withOptionalBlocks = [optionalAuth, attachBlockedProfiles];
     router.get("/", withOptionalBlocks, async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 20;
    console.log("req.blockedProfileIds", req.blockedProfileIds);

    const totalCount = await prisma.story.count({
      where: {
        isPrivate: false,
        ...(req.blockedProfileIds?.length
          ? { authorId: { notIn: req.blockedProfileIds } }
          : {}),
      },
    });

    const stories = await prisma.story.findMany({
      where: {
        isPrivate: false,
        ...(req.blockedProfileIds?.length
          ? { authorId: { notIn: req.blockedProfileIds } }
          : {}),
      },
      orderBy: { updated: "desc" },
      skip,
      take,
      include: {
        hashtags: { include: { hashtag: true } },
        author: true,
      },
    });

    res.json({
      stories,
      skip,
      take,
      totalCount,
      hasMore: skip + take < totalCount,
    });
  } catch (error) {
    console.log("GET /stories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


    router.get("/collection/:id/public",async (req,res)=>{  
    try{
        const {id}=req.params
        let collection = await prisma.collection.findFirst(
                {where:{id:{
                    equals:id
                }}
            })

        if(!collection.isPrivate){
            let list = await prisma.storyToCollection.findMany({where:{
                AND:{
                    collectionId:{
                        equals:id
                    },
                }
        },include:{
            story:{include:{author:true}}
        }})

        res.json({list})
    }else{
        throw new Error("is Private")
    }
    }catch(error){
        res.json(error)
    }
    })
    router.get("/recommendations", withBlocks, async (req, res) => {
  try {
    let profile = req.user.profiles[0];

    // Ensure we have a profile ID
    if (!profile || !profile.id) {
      profile = await prisma.profile.findFirst({
        where: { userId: req.user.id },
      });
    }

    let recommendations = await getRecommendations(profile.id);

    // If no recommendations, fallback
    if (recommendations.length === 0) {
      recommendations = await recommendStories(profile.id);
    }

    // Fetch stories while respecting privacy/beta readers, and excluding blocked authors
    let stories = await prisma.story.findMany({
      where: {
        id: { in: recommendations },
        authorId: { notIn: req.blockedProfileIds },
        OR: [
          { isPrivate: { equals: false } },
          {
            betaReaders: {
              some: { profileId: { equals: profile.id } },
            },
          },
        ],
      },
      include: { author: true },
    });

    // If still empty, fetch top public stories, still excluding blocked authors
    if (stories.length === 0) {
      stories = await prisma.story.findMany({
        orderBy: { storyLikes: { _count: "desc" } },
        where: {
          isPrivate: false,
          authorId: { notIn: req.blockedProfileIds },
        },
        include: { author: true },
      });
    }

    res.json({ stories });
  } catch (error) {
    console.log(error);
    res.json({ error });
  }
});
//--------------- Recommender ---------------------- //

const getRecommendations = async (profileId) => {
  const user = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { likedStories: true },
  });

  const contentScores = await getContentBasedScores(user.likedStories);
  const collabScores = await getCollaborativeScores(profileId);

  // Hybrid score
  const hybridScores= {};
  for (let storyId in contentScores) {
    hybridScores[storyId] = 0.7 * contentScores[storyId] + 0.3 * (collabScores[storyId] || 0);
  }

  let scoredStories = Object.entries(hybridScores).map(([storyId, score]) => ({ storyId, score }));

  // --- 1️⃣ Shuffle top-N ---
  scoredStories = scoredStories.sort((a, b) => b.score - a.score);
  const topN = scoredStories.slice(0, 20); // top 20
  for (let i = topN.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [topN[i], topN[j]] = [topN[j], topN[i]];
  }

  // --- 2️⃣ Weighted random pick ---
  const weightedPick = (stories, n) => {
    const { storyId, score } = stories
    const picked = [];
    const copy = [...stories];
    while (picked.length < n && copy.length > 0) {
      const total = copy.reduce((sum, s) => sum + s.score, 0);
      let r = Math.random() * total;
      for (let i = 0; i < copy.length; i++) {
        r -= copy[i].score;
        if (r <= 0) {
          picked.push(copy[i].storyId);
          copy.splice(i, 1);
          break;
        }
      }
    }
    return picked;
  };

  let recommendations = weightedPick(topN, 10); // pick 10 stories

  // --- 3️⃣ Random exploration ---
  if (Math.random() < 0.2) { // 20% chance
    const randomStory = await prisma.story.findFirst({
      where: { isPrivate: false, id: { notIn: recommendations } },
      orderBy: { storyLikes: { _count: "desc" } },
    });
    if (randomStory) recommendations.push(randomStory.id);
  }

  return recommendations;
};
router.get("/profile/protected", authMiddleware, async (req, res) => {
  try {
     const profile = await prisma.profile.findFirst({
      where: { userId: req.user.id },
     
      
    });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    const profileId = profile.id
    const skip = Number.parseInt(req.query.skip, 10) || 0;
    const take = Math.min(Number.parseInt(req.query.take, 10) || 50, 100);
    const status = req.query.status
    const rawSearch = req.query.search || "";
    const search = rawSearch?.trim();

const where = {
  OR:[{authorId:{
            equals:profileId
          }},{betaReaders:{
            some:{
              profileId:{equals:profileId}
            }
          }}],
  ...(search ? {
    title: { contains: search, mode: "insensitive" },
  } : {}),
  ...(status ? { status } : {}),  // add this
};
   
    const [stories, totalCount] = await Promise.all([prisma.story.findMany({
  where,
  take,
  skip,
  orderBy: { updated: "desc" },
  select: {
    id: true,
    title: true,
    status: true,
    updated: true,
    created: true,
    isPrivate: true,
    type: true,
    description: true,
    authorId: true,
  },
}),

      prisma.story.count({
        where,
      }),
    ]);

    return res.status(200).json({
      items: stories,
      stories,
      skip,
      take,
      totalCount,
    });
  } catch (error) {
  
    res.status(500).json({ error: "Internal server error" });
  }
});


    router.get("/collection/:id/protected",authMiddleware,async (req,res)=>{
       try{
        let list = await prisma.storyToCollection.findMany({where:{
            collectionId:req.params.id
        },include:{
            story:{
                include:{
                    author:true
                }
            },
            profile:true,
            collection:true
        }})
    
        res.json({list})

    }catch(error){
        console.log("/collection/:id/protected",error)
        res.json({error})
    }
    })
    router.patch("/collection/:id/",[authMiddleware,updateWriterLevelMiddleware],async (req,res)=>{
    
        let list = await prisma.storyToCollection.findMany({where:{
            collectionId:req.params.id
        },include:{
            story:{include:{author:true}}
        }})
    
        res.json({list})
    })
    router.get("/:storyId/comment/public",async (req,res)=>{
        let id = req.params.storyId

        try{
            
        let comments = await prisma.comment.findMany({where:{
             storyId:{
                 equals:id
             }
         },include:{profile:true}})
        
         
         res.json({comments})

        }catch(error){
            console.log(error)
            res.status(404).json({error})
        }
     })
    router.get("/:id/comment/protected",withBlocks,async (req,res)=>{
      try{
     
        let comments =await prisma.comment.findMany({where:{
            storyId:{
                equals:req.params.id
            }
        },include:{profile:true}})
    
        
        res.json({comments})
    }catch(error){
        console.log(error)
        res.status(404).json({error})
    }
    })
    
        router.get("/profile/:id/public", withOptionalBlocks, async (req, res) => {
      try {
        const skip = parseInt(req.query.skip) || 0;
        const take = parseInt(req.query.take) || 20;

        const profileId = req.params.id;

        const [stories, totalCount] = await Promise.all([
          prisma.story.findMany({
            where: {
              authorId: profileId,
              isPrivate: false,
              ...(req.blockedProfileIds?.length && req.blockedProfileIds.includes(profileId)
                ? { id: { in: [] } } // return no stories if viewer has blocked this profile
                : {}),
            },
            include: {
              author: true,
              comments: true,
            },
            orderBy: {
              updated: "desc",
            },
            skip,
            take,
          }),

          prisma.story.count({
            where: {
              authorId: profileId,
              isPrivate: false,
              ...(req.blockedProfileIds?.length && req.blockedProfileIds.includes(profileId)
                ? { id: { in: [] } } // keep count consistent with the query
                : {}),
            },
          }),
        ]);

        res.status(200).json({
          stories,
          totalCount,
          skip,
          take,
          hasMore: skip + take < totalCount,
        });
      } catch (error) {
        res.status(500).json({ error });
      }
    });

   

    router.get("/profile/:id/protected", withBlocks, async (req, res) => {
      try {
        const skip = parseInt(req.query.skip) || 0;
        const take = parseInt(req.query.take) || 20;

        const profileId = req.params.id;

        const [stories, totalCount] = await Promise.all([
          prisma.story.findMany({
            where: {
              authorId: profileId,
              ...(req.blockedProfileIds?.length && req.blockedProfileIds.includes(profileId)
                ? { id: { in: [] } } // return no stories if viewer has blocked this profile
                : {}),
            },
            include: {
              author: true,
              comments: true,
            },
            orderBy: {
              updated: "desc",
            },
            skip,
            take,
          }),

          prisma.story.count({
            where: {
              authorId: profileId,
              ...(req.blockedProfileIds?.length && req.blockedProfileIds.includes(profileId)
                ? { id: { in: [] } } // keep count consistent with the query
                : {}),
            },
          }),
        ]);

        res.status(200).json({
          stories,
          totalCount,
          skip,
          take,
          hasMore: skip + take < totalCount,
        });
      } catch (error) {
        res.status(500).json({ error });
      }
    });
    router.get("/:id/public", withOptionalBlocks, async (req, res) => {
  try {
    const storyId = req.params.id;
    const story = await prisma.story.findFirst({
      where: { id: storyId },
      include: {
        author: true,
        collections: {
          include: {
            collection: {
              select: {
                id: true,
                title: true,
                type: true,
                isPrivate: true,
                roles: {
                  select: {
                    profileId: true,
                  },
                },
              },
            },
          },
        },
        hashtags: {
          include: { hashtag: true },
        },
        comments: {
          include: { profile: true, parent: true },
        },
        betaReaders: {
          select: {
            profileId: true,
          },
        },
      },
    });

    if (!story) {
      return res.status(404).json({ error: "Story not found." });
    }

    if (story.isPrivate) {
      return res.status(403).json({ error: "Story not found." });
    }

    // If viewer has blocked the author, hide the story
    if (req.blockedProfileIds?.length && req.blockedProfileIds.includes(story.authorId)) {
      return res.status(404).json({ error: "Story not found." });
    }

    res.json({ story });
  } catch (err) {
    console.error("Error fetching public story:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});
router.get("/:id/protected", withBlocks, async (req, res) => {
  try {
    const userId = req.user?.profiles?.[0]?.id;
    const storyId = req.params.id;

    const story = await prisma.story.findFirstOrThrow({
      where: { id: storyId },
      include: {
        author: {
          select: { id: true, username: true, profilePic: true },
        },
        hashtags: {
          include: {
            hashtag: {
              select: { id: true, name: true },
            },
          },
        },
        betaReaders: {
          include: { profile: true },
        },
       
      },
    });

    if (req.blockedProfileIds?.includes(story.authorId)) {
      return res.status(404).json({ error: "Story not found." });
    }

    if (story.authorId === userId) return res.json({ story });
    if (!story.isPrivate) return res.json({ story });

  const isBetaReader = story.betaReaders.some(
  (br) => br.profile?.id === userId
);
    if (isBetaReader) return res.json({ story });


    return res.status(403).json({ error: "Access denied: private story." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Story not found." });
    }
    console.error("Error fetching protected story:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});


    router.put("/:id",...allMiddlewares,async (req,res)=>{
try{
        const {title,data, description,status, needsFeedback,isPrivate,commentable,type}= req.body
     
        let story  = await prisma.story.update({where:{
            id:req.params.id
        },data:{
            title,
            data,
            isPrivate,
            status:status??(needsFeedback?"workshop":"fragment"),
            commentable,
            description,
            type,
            updated: new Date()
        },include:{
            author:true,
            comments:true
        }})

!story.isPrivate? await client.partialUpdateObject({
      indexName:indexNames.story,
      objectID:story.id,
      attributesToUpdate:{
  title:story.title
      }
  
    }):await client.deleteObject({
      indexName:indexNames.story,
      objectID:story.id
 
    })
        res.status(200).json({story})
    }catch(error){
        console.log("put/:id story",error)
            res.json(error)
        
    }
    })
    async function deleteCommentsRf(comment){
        let comments =await  prisma.comment.findMany({where:{
              parentId:{equals:comment.id}
          }})
          
          comments.map(com=>deleteCommentsRf(com))
          await prisma.hashtagComment.deleteMany({where:{commentId:{
            equals:comment.id
          }}})
          await prisma.comment.deleteMany({where:{parentId:{equals:comment.id}}})
          return prisma.comment.delete({where:{id:comment.id}})
        }
    router.delete("/:id",authMiddleware,async (req,res)=>{
        try{
            let story = await prisma.story.findFirstOrThrow({where:{id:{equals:req.params.id}}})
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
             
await client.deleteObject({
      indexName:indexNames.story,
      objectID:story.id
    })
                res.status(202).json({story,message:"Deleted Successesfully"})
      
        }catch(error){
     console.log({error})
            res.json({error})
        }

    })
    router.post("/",...allMiddlewares,async (req,res)=>{
    try{
    
       const authorId = req.user.profiles[0].id
        const doc = req.body
   const {isPrivate,
    data,
    title,
    isSaved,
    needsFeedback,
    status,
    description,
    commentable,
    profile,
    profileId,
    type}=doc
        // const {title,data,isPrivate,authorId,commentable,type}= doc
          const moderation = checkContent(`${title ?? ""} ${description ?? ""}`);
    if (moderation.flagged) {
        return res.status(400).json({ error: new Error("Content violates community guidelines") });
    }
        const story = await prisma.story.create({data:{
            title:title??"",
            data:data,
            status:needsFeedback?isSaved?"workshop":"draft":"fragment",
          author:{
            connect:{
              id:authorId
            }
          },
            description:description??"",
            isPrivate:isPrivate,
            author:{
                connect:{
                    id:authorId
                }
            },
            commentable:commentable,
            type:type
        }})
// const index = client.initIndex(indexNames.story);
story.isPrivate && client.saveObject({indexName:indexNames.story,body:{
  objectID:story.id,
  title:story.id,
  type:story.type
}})
        res.status(201).json({story})
      
    }catch(error){
        console.log({error})
        res.json({error})
    }
    })

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, seed) {
  const arr = [...array];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

router.get("/prompts/recommended", authMiddleware, async (req, res) => {
  try {
    const profileId = req.user.profiles[0].id;
    const take = parseInt(req.query.take) || 6;
    const slotId = req.query.slotId || "morning";

    const history = await prisma.userStoryHistory.findMany({
      where: { profileId },
      select: { storyId: true },
      take: 100,
    });
    const seenIds = new Set(history.map((h) => h.storyId));

    const likes = await prisma.userStoryLike.findMany({
      where: { profileId },
      select: { storyId: true },
      take: 50,
    });

    const likedHashtags = likes.length
      ? await prisma.hashtagStory.findMany({
          where: { storyId: { in: likes.map((l) => l.storyId) } },
          select: { hashtagId: true },
        })
      : [];

    const followedHashtags = await prisma.hashtagFollower.findMany({
      where: { followerId: profileId },
      select: { hashtagId: true },
    });

    const signalIds = new Set([
      ...likedHashtags.map((h) => h.hashtagId),
      ...followedHashtags.map((h) => h.hashtagId),
    ]);

    const promptHashtags = await prisma.hashtag.findMany({
      where: {
        name: {
          contains: "prompt",
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (!promptHashtags.length) return res.json({ prompts: [] });

    const promptHashtagIds = promptHashtags.map((h) => h.id);

    const candidates = await prisma.story.findMany({
      where: {
        isPrivate: false,
        hashtags: { some: { hashtagId: { in: promptHashtagIds } } },
      },
      include: {
        hashtags: { include: { hashtag: true } },
        author: true,
        storyLikes: { select: { id: true } },
      },
      orderBy: { updated: "desc" },
      take: 40,
    });

    const now = Date.now();
    const ranked = candidates
      .map((story) => {
        const overlap = story.hashtags.filter((h) => signalIds.has(h.hashtagId)).length;
        const likeCount = story.storyLikes.length;
        const ageMs = now - new Date(story.updated).getTime();
        const recency = Math.max(0, 1 - ageMs / (1000 * 60 * 60 * 24 * 30));
        const unseenBonus = seenIds.has(story.id) ? 0 : 1.0;

        return {
          ...story,
          _score: overlap * 2 + likeCount * 0.5 + recency * 1.5 + unseenBonus,
        };
      })
      .sort((a, b) => b._score - a._score);

    const stablePrompt = await getTodaysPrompt(slotId);
    const prompts = [];
    const usedIds = new Set();

    if (stablePrompt?.id) {
      const stableStory =
        ranked.find((s) => s.id === stablePrompt.id) ||
        (await prisma.story.findUnique({
          where: { id: stablePrompt.id },
          include: {
            hashtags: { include: { hashtag: true } },
            author: true,
            storyLikes: { select: { id: true } },
          },
        }));

      if (stableStory) {
        prompts.push(stableStory);
        usedIds.add(stableStory.id);
      }
    }

    const remaining = ranked.filter((s) => !usedIds.has(s.id));
    const seed = hashSeed(`${profileId}:${slotId}:${new Date().toISOString().slice(0, 10)}`);
    const seeded = seededShuffle(remaining, seed);

    const slotsLeft = take - prompts.length;

    if (slotsLeft > 1) {
      prompts.push(...seeded.slice(0, slotsLeft - 1));
    }

    const usedAfterSeed = new Set(prompts.map((p) => p.id));
    const lastPool = remaining.filter((s) => !usedAfterSeed.has(s.id));

    if (prompts.length < take && lastPool.length) {
      const lastPick = lastPool[Math.floor(Math.random() * lastPool.length)];
      prompts.push(lastPick);
    }

    res.json({ prompts: prompts.slice(0, take) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load prompt recommendations" });
  }
})


router.get("/events/:days",async(req,res)=>{
        try{
       let days = req.params.days

      let events = await fetchEvents(days)
      res.json({events})
        }catch(err){
            res.json({err})
        }
    })

    return router

}