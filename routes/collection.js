const express = require('express');
const prisma = require("../db");
const { createLocation } = require('../utils/locationUtil');
const indexNames = require('../utils/indexNames');
const client = require('../utils/algoliaClient');
const attachBlockedProfiles = require('../middleware/attechBlockedProfiles');
const router = express.Router()
const RECENCY_WEIGHT = 0.8;
const APPROVAL_WEIGHT = 0.2;

function getApprovalScore(story) {
  return story.approvalCount ?? story.approvals?.length ?? story._count?.approvals ?? 0;
}

function mergeScoredStories(items) {
  const seen = new Set();
  const unique = [];

  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }

  if (!unique.length) return [];

  const times = unique.map((i) => new Date(i.updated ?? i.created ?? 0).getTime());
  const min = Math.min(...times);
  const max = Math.max(...times);
  const range = max - min || 1;

  const maxApproval = Math.max(...unique.map(getApprovalScore), 1);

  return unique
    .map((story) => {
      const t = new Date(story.updated ?? story.created ?? 0).getTime();
      const recency = (t - min) / range;
      const approval = getApprovalScore(story) / maxApproval;

      return {
        ...story,
        _score: RECENCY_WEIGHT * recency + APPROVAL_WEIGHT * approval,
      };
    })
    .sort((a, b) => b._score - a._score);
}
 const getProfileRoomRecommendations = async (
  profileId,
  requestedLimit = 12
) => {
  const limit = Math.min(
    Math.max(Number.parseInt(requestedLimit, 10) || 12, 1),
    30
  );

  // --------------------------------------------------
  // 1. Find Rooms the profile owns or has joined
  // --------------------------------------------------

  const [ownedRooms, memberships] = await Promise.all([
    prisma.collection.findMany({
      where: { profileId },
      select: { id: true },
    }),

    prisma.roleToCollection.findMany({
      where: {
        profileId,
        approved: true,
        role: { not: "owner" },
        collectionId: { not: null },
      },
      select: { collectionId: true },
    }),
  ]);

  const existingRoomIds = new Set([
    ...ownedRooms.map((room) => room.id),
    ...memberships
      .map((membership) => membership.collectionId)
      .filter(Boolean),
  ]);

  // --------------------------------------------------
  // 2. Load the profile's interest signals
  // --------------------------------------------------

  const sourceRoomIds = [...existingRoomIds];

  const sourceRooms = sourceRoomIds.length
    ? await prisma.collection.findMany({
        where: {
          id: { in: sourceRoomIds },
        },
        select: {
          hashtags: {
            select: {
              hashtagId: true,
            },
          },
          storyIdList: {
            where: {
              story: {
                isPrivate: false,
              },
            },
            select: {
              story: {
                select: {
                  hashtags: {
                    select: {
                      hashtagId: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    : [];

  // Count repeated interests rather than treating every
  // hashtag as equally important.
  const profileTagCounts = new Map();

  const addTag = (tagId) => {
    if (!tagId) return;

    profileTagCounts.set(
      tagId,
      (profileTagCounts.get(tagId) || 0) + 1
    );
  };

  for (const room of sourceRooms) {
    for (const relation of room.hashtags || []) {
      addTag(relation.hashtagId);
    }

    for (const relation of room.storyIdList || []) {
      for (const tag of relation.story?.hashtags || []) {
        addTag(tag.hashtagId);
      }
    }
  }

  // --------------------------------------------------
  // 3. Load eligible public Rooms
  // --------------------------------------------------

  const candidates = await prisma.collection.findMany({
    where: {
      isPrivate: false,
      isWorkshop: false,
    },
    select: {
      id: true,
      title: true,
      updated: true,
      created: true,
      hashtags: {
        select: {
          hashtagId: true,
        },
      },
      storyIdList: {
        where: {
          story: {
            isPrivate: false,
          },
        },
        select: {
          story: {
            select: {
              hashtags: {
                select: {
                  hashtagId: true,
                },
              },
            },
          },
        },
      },
      roles: {
        where: {
          approved: true,
        },
        select: {
          profileId: true,
        },
      },
    },
  });

  const eligibleCandidates = candidates.filter(
    (room) => !existingRoomIds.has(room.id)
  );

  if (!eligibleCandidates.length) {
    return [];
  }

  // --------------------------------------------------
  // 4. Calculate comparable scores
  // --------------------------------------------------

  const now = Date.now();

  const recencyFor = (room) => {
    const timestamp = new Date(
      room.updated || room.created || 0
    ).getTime();

    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return 0;
    }

    // Gradual decay over approximately 90 days.
    const ageInDays = Math.max(
      0,
      (now - timestamp) / (1000 * 60 * 60 * 24)
    );

    return Math.exp(-ageInDays / 90);
  };

  const scored = eligibleCandidates.map((room) => {
    const candidateTagIds = new Set();

    for (const relation of room.hashtags || []) {
      if (relation.hashtagId) {
        candidateTagIds.add(relation.hashtagId);
      }
    }

    for (const relation of room.storyIdList || []) {
      for (const tag of relation.story?.hashtags || []) {
        if (tag.hashtagId) {
          candidateTagIds.add(tag.hashtagId);
        }
      }
    }

    let interestScore = 0;

    for (const tagId of candidateTagIds) {
      const frequency = profileTagCounts.get(tagId) || 0;

      if (frequency > 0) {
        interestScore += Math.log1p(frequency);
      }
    }

    // Log scaling prevents larger Rooms from dominating
    // the ranking simply because they have more content.
    const memberCount = new Set(
      (room.roles || [])
        .map((role) => role.profileId)
        .filter(Boolean)
    ).size;

    const storyCount = (room.storyIdList || []).length;

    const activityScore =
      Math.log1p(memberCount) +
      Math.log1p(storyCount);

    return {
      id: room.id,
      score:
        interestScore * 3 +
        activityScore * 0.25 +
        recencyFor(room) * 0.5,
      interestScore,
      activityScore,
      recencyScore: recencyFor(room),
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.id.localeCompare(b.id);
  });

  // --------------------------------------------------
  // 5. Personalize first, then fill from the broader pool
  // --------------------------------------------------

  const personalized = scored.filter(
    (room) => room.interestScore > 0
  );

  const fallback = scored.filter(
    (room) => room.interestScore === 0
  );

  const rankedIds = [
    ...personalized,
    ...fallback,
  ]
    .slice(0, limit)
    .map((room) => room.id);

  return rankedIds;
};
module.exports = function (authMiddleware){
    const withBlocks = [authMiddleware, attachBlockedProfiles];
        const getCollectionContentBasedScores = async (colId) => {
            const scores = {};

           let col = await prisma.collection.findFirst({where:{
                id:{
                    equals:colId
                }
            },include:{
                storyIdList:{
                    include:{
                        story:{
                            
                            include:{
                              
                                storyLikes:true,
                                collections:{
                                    include:{
                                        collection:{
                                            include:{
                                                storyIdList:{
                                                    where:{
                                                        story:{
                                                            
                                                            isPrivate:{
                                                                equals:false
                                                            }
                                                        }
        
                                                    },
                                                    include:{
                                                    
                                                        story:{
                                                            include:{
                                                                hashtags:{
                                                                    include:{
                                                                        hashtag:true
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                hashtags:{
                    include:{
                        collection:{
                            include:{
                                storyIdList:{
                                    include:{
                                        story:true
                                    }
                                }
                            }
                        },
                        hashtag:{
                            include:{
                                collections:{

                                    include:{
                                        hashtag:true,
                                        collection:{
                                            include:{
                                                hashtags:{
                                                    include:{
                                                        hashtag:true
                                                    }
                                                },
                                                storyIdList:{
                                                    
                                                    where:{
                                                        
                                                        story:{
                                                            
                                                            isPrivate:{
                                                                equals:false
                                                            }
                                                        }
        
                                                    },
                                                    include:{
                                                    
                                                        story:{
                                                            include:{
                                                                storyLikes:true,
                                                                hashtags:{
                                                                    include:{
                                                                        hashtag:true
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                    }
                    
                }
            }})
        if(col.hashtags.length>0){  
         
          for(const {collection } of col.hashtags){
            for (const sTc of collection.storyIdList){
              
              const stor = sTc.story
              const colHs = col.hashtags
          
              const likedStoryHashtags = col.hashtags.map(tag=>tag.hashtagId)
        
        
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
                  id: { not: stor.id }, // Exclude the liked story itself
                },include:{
                    hashtags:{
                        include:{
                            hashtag:true
                        }
                    }
                }
              })
    
              for (const story of similarStories) {
                if (!scores[story.id]){
                    scores[story.id] = 0;
                } else{
          
                // Score is based on the number of matching hashtags
                const matchingTags = story.hashtags.filter((tag) =>
                  likedStoryHashtags.includes(tag.name)
                ).length;
                scores[story.id] += matchingTags;
              }}
            
            }
        
        }
        }else{
    
               const sTcs = col.storyIdList.map(stc=>stc.story)
              for(const rootStc of sTcs){
                   for(const {collection} of rootStc.collections){
                    for (const {story} of collection.storyIdList) {
                        if (!scores[story.id]){
                             scores[story.id] = 0;
                        }else{
             
                    scores[story.id] += 1
             
            }
                    }}}}
          
            return scores;
        }
            
        const getRecommendedCollections=async (colId)=>{
            const scores = {};
            const collection = await prisma.collection.findFirst({where:{
                id:{
                    equals:colId
                }
            },include:{
                roles:{
                    include:{
                        profile:true
                    }
                },
                hashtags:{
                    include:{
                        hashtag:true
                    }
                },
                childCollections:{
                    include:{
                        parentCollection:true,
                        childCollection:true,
                    },
                    where:{
                        childCollection:{
                            isPrivate:{
                                equals:false
                            }
                        }
                    }
                },
                parentCollections:{
                    include:{
                        parentCollection:true,
                        childCollection:true
                    },
              where:{
                parentCollection:{
                    isPrivate:{
                        equals:false
                    }
                }
              }
                    
                
                }
            }})
            let childIds = collection.childCollections.map(col=>col.id)
            // .map(col=>col.id)
            let parentIds = collection.childCollections.map(col=>col.id)

           let collections = await prisma.collectionToCollection.findMany({where:{
                OR:[{parentCollection:{
                    id:{in:[...parentIds,...childIds]}
                    ,isPrivate:true
                },childCollection:{
                    isPrivate:{
                        equals:false
                    }
                }}]
            }})
            
            for(const cTc of collections){
                
                    
                    if (!scores[cTc.childCollectionId]) { scores[sTc.childCollectionId] = 0;}
                    else{
                        scores[cTc.childCollectionId] += 1;
                    }
            
    
         
   
           return Object.entries(scores)
             .sort((a, b) => b[1] - a[1]) // Sort by score
             .map(([colId]) => colId); // Return sorted story IDs
         };
          
        }
    
          const getCollectionCollaborativeScores = async (profileId,colId) => {
            const scores = {};
            const collection = await prisma.collection.findFirst({where:{
                id:{equals:colId}
            },include:{
                storyIdList:{
                    include:{
                        story:true
                    }
                }
            }})
           const profile =  await  prisma.profile.findFirst({where:{id:{equals:profileId}},
                include:{
                    rolesToCollection:{
                        include:{
                            collection:{
                                include:{
                                    storyIdList:{
                                        include:{
                                            story:true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    rolesToStory:{
                        include:{
                            story:true
                        }
                    },
                   collections:{
                    include:{
                        parentCollections:{include:{
                            childCollection:{
                                include:{
                                    parentCollections:{
                                        include:{
                                            parentCollection:true,
                                            childCollection:{
                                                include:{
                                                    storyIdList:{
                                                        include:{
                                                            story:true
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    storyIdList:{
                                        include:{
                                            story:true
                                        }
                                    }
                                }
                            } 
                        }},
                        profile:true,
                        childCollections:{include:{
                            childCollection:{
                                include:{
                                    parentCollections:true,
                                    storyIdList:{
                                        include:{
                                            story:true
                                        }
                                    }
                                }
                            }
                        }},
                    
                    }
                   }
                    
                }})
       
            for(const roles of profile.rolesToCollection){
                
            }
            //Iterate through collections of users
           for(const cTc of profile.collections){
            //Pick children collections of profile
            const childCollectionStorieIds = cTc.childCollections.map(child=>child.childCollection.storyIdList).flat().map(sTc=>sTc.storyId).filter(x=>x)
       
                 let currentStories= collection.storyIdList.map(st=>st.id)
                const sTcList = await prisma.storyToCollection.findMany({
                    where:{
                        storyId:{
                            in:childCollectionStorieIds
                        },
                     
                        collectionId:{
                            not:colId
                        }
                    },include:{
                        collection:{
                            include:{
                                storyIdList:{
                                    
                                    include:{
                                        
                                        story:true
                                    },
                                    where:{
                                        story:{
                                            id:{
                                                notIn:currentStories
                                            },
                                            isPrivate:{
                                                equals:false
                                            }
                                            ,authorId:{
                                                not:profileId
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                })
    
        for(const sTc of sTcList){
            // for (const like of sTc.storyIdList) {
                
                if (!scores[sTc.storyId]) { scores[sTc.storyId] = 0;}
                else{
                    scores[sTc.storyId] += 1;
                }
        
    
        } }
        return scores;
    
    }
      
    

    const getCollectionStoryRecommendations = async (profileId,colId) => {
      const col = await prisma.collection.findFirst({where:{
            id:{
                equals:colId
            }
        },include:{
            roles:{
                include:{
                    profile:true
                }
            },
            hashtags:{
                include:{
                    hashtag:{
                        include:{
                            collections:{
                                include:{
                                    collection:{
                                        include:{
                                            storyIdList:{
                                                include:{
                                                    story:{
                                                        include:{
                                                            storyLikes:true,
                                                            storyHistory:true
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            storyIdList:{
                include:{
                    story:{
                        include:{
                            hashtags:{
                                include:{
                                    hashtag:true
                                }
                            }
                        }
                    }
                }
            }
        }})
  
       
       

        const contentBasedScores = await getCollectionContentBasedScores(colId)
    
        const collaborativeScores = await getCollectionCollaborativeScores(profileId)

         const hybridScores = {};
         for (let storyId in collaborativeScores) {
        
           hybridScores[storyId] = 0.7 *collaborativeScores[storyId]  + 0.3 * (contentBasedScores[storyId] || 0);
         }
      

        return Object.entries(hybridScores)
          .sort((a, b) => b[1] - a[1]) // Sort by score
          .map(([storyId]) => storyId); // Return sorted story IDs
      };
      router.post("/home",authMiddleware,async(req,res)=>{
        const {collection}=req.body
        try{
        let profile = req.user.profiles[0]
        let oldPro = await prisma.profileToCollection.findFirst({where:{
            profileId:{
                equals:profile.id
            }
        }})
        if(oldPro){
            await prisma.profileToCollection.delete({where:{
                id:oldPro.id
            }})
        }
        let profileToColl= await prisma.profileToCollection.create({data:{
            collection:{
                connect:{
                    id:collection.id
                }
            },
            profile:{
                connect:{
                    id:profile.id
                }
            }

        },include:{
            collection:true,
            profile:{
                include:{
                    profileToCollections:{
                        include:{
                      collection:{
                        include:{
                          storyIdList:true
                        }
                      }
                  }
                    }
                }
            }
        }})
        res.json({profile:profileToColl.profile})
    }catch(error){
        res.json(error)
    }
      })
      router.get("/recommendations",authMiddleware,async(req,res)=>{
        let profile = req.user.profiles[0]
        try{
        if(profile){
        const collaborativeScores = await getCollectionCollaborativeScores(profile.id)
     
        let sorted = Object.entries(collaborativeScores)
        .sort((a, b) => b[1] - a[1]) // Sort by score
        .map(([storyId]) => storyId);
      
        let collections= await prisma.collection.findMany({where:{
        id:{
            in:sorted,
            },profileId:{
                not:profile.id
            },isPrivate:{
                equals:false
            }},include:{
                parentCollections:{
                    include:{
                        parentCollection:{
                            select:{
                                id:true
                            }
                        }
                    }
                },
                childCollections:{
                    where:{
                        childCollection:{
                            isPrivate:{
                                equals:false,
                            }
                        }
                    },
                    include:{
                        childCollection:{
                            
                            include:{
                                
                                childCollections:{
                                    include:{
                                        
                                        childCollection:{
                                            
                                            include:{
                                                storyIdList:{
                                                    include:{
                                                        story:true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                roles:{
                    include:{
                        profile:true,
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
            },
            
        })
        if(collections.length==0){
          collections=  await prisma.collection.findMany({where:{
                isPrivate:false,
            profileId:{
                not:profile.id
            }}})
        }

        res.json({collections:collections})}
    
}catch(error){
    res.json({error})
}})
    router.get("/:id/recommendations",async (req,res)=>{
        try{
        if(req.params.id){
const recommendations = await getRecommendedCollections(req.params.id)
      let collections= await prisma.collection.findMany({where:{
        id:{
            in:recommendations,
            not:req.params.id
            },isPrivate:{
                equals:false
            }},include:{
                parentCollections:{
                    include:{
                        parentCollection:{
                            select:{
                                id:true
                            }
                        }
                    }
                }
            },
        })

        res.json({collections:collections})}
    }catch(err){
        console.log(err)
        res.json(err)
    }
    })
    router.get("/:id/story/recommendations",authMiddleware,async(req,res)=>{
        try{
        let profile = req.user.profiles[0]
        let recommendations = await getCollectionStoryRecommendations(profile.id,req.params.id)
        let pages = await prisma.story.findMany({where:{
            id:{in:recommendations},
            
        },include:{
            author:true
        }})
    
        let list =pages.filter(page=>page!=null)
     res.json(
        {pages:list})
     }catch(err){
        res.json(err)
     }
    })
    router.get("/",async (req,res)=>{
        let {type} =req.query
        //GET ALL PUBLIC COLLECTIONS
        try{
               let collections = await prisma.collection.findMany(
            {orderBy:{
                
                    updated:"desc"},where:{isPrivate:{equals:false}},include:{
                        parentCollections:{
                            include:{
                                parentCollection:{
                                    select:{
                                        id:true
                                    }
                                }
                            }
                        },
                        profile:true,
                    childCollections:{
                        include:{
                            childCollection:true
                        }
                    },
                storyIdList:{
                    include:{
                        story:true
                    }
                },
                roles:{
                    include:{
                        profile:true
                    }
                }
            }})
            if(type=="feedback"){
            collections = await prisma.collection.findMany(
            {orderBy:{
                
                    updated:"desc"},where:{AND:[{isPrivate:{
                        equals:true
                    }},{type:"feedback"},{roles:{}}]},include:{
                        parentCollections:{
                            include:{
                                parentCollection:{
                                    select:{
                                        id:true
                                    }
                                }
                            }
                        },
                        profile:true,
                    childCollections:{
                        include:{
                            childCollection:true
                        }
                    },
                storyIdList:{
                    include:{
                        story:true
                    }
                },
                roles:{
                    include:{
                        profile:true
                    }
                }
            }})
             collections = collections.filter(c => c.roles.length <= 5);
            }
      if (type === "feedback") {
     
    }

        res.status(200).json({data:collections})
        }catch(error){
            res.json({error})
        }


    })
router.get("/profile/:id/public", async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 20;

    const profileId = req.params.id;

    const collections = await prisma.collection.findMany({
      where: {
        AND: {
          profile: { id: profileId },
          isPrivate: false,
        },
      },
      include: {
        storyIdList: {
          include: {
            story: { include: { author: true } },
          },
        },
      },
      orderBy: {
        updated: "desc",
      },
      skip,
      take,
    });

    const totalCount = await prisma.collection.count({
      where: {
        profile: { id: profileId },
        isPrivate: false,
      },
    });

    res.status(200).json({
      collections,
      skip,
      take,
      totalCount,
      hasMore: skip + take < totalCount,
    });
  } catch (err) {
    res.status(400).send({ error: err });
  }
})
router.get("/:id/feed/stories", withBlocks, async (req, res) => {
  try {
    const id = req.params.id;
    const skip = Number(req.query.skip ?? 0);
    const take = Number(req.query.take ?? 20);

    const home = await prisma.collection.findUnique({
      where: { id },
      select: {
        id: true,
        childCollections: {
          select: {
            childCollection: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!home) {
      return res.status(404).json({ error: "Collection not found." });
    }

    const childIds = (home.childCollections ?? [])
      .map((c) => c.childCollection?.id)
      .filter(Boolean);

    const [directStories, childStories] = await Promise.all([
      prisma.story.findMany({
        where: {
          collections: {
            some: { collectionId: id },
          },
        },
        include: {
          author: {
            select: { id: true, username: true, profilePic: true },
          },
          collections: {
            include: {
              collection: {
                select: { id: true, title: true, type: true, isPrivate: true },
              },
            },
          },
        },
      }),
      childIds.length
        ? prisma.story.findMany({
            where: {
              collections: {
                some: {
                  collectionId: { in: childIds },
                },
              },
            },
            include: {
              author: {
                select: { id: true, username: true, profilePic: true },
              },
              collections: {
                include: {
                  collection: {
                    select: { id: true, title: true, type: true, isPrivate: true },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const merged = mergeScoredStories([...directStories, ...childStories]);
    const paged = merged.slice(skip, skip + take);

    return res.json({
      items: paged,
      totalCount: merged.length,
    });
  } catch (err) {
    console.error("Error fetching feed stories:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});
    router.get("/profile/:id/protected", authMiddleware, async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 20;

    const profileId = req.params.id;

    const [colList, roleList] = await Promise.all([
      prisma.collection.findMany({
        where: {
          profile: { id: profileId },
        },
        include: {
          storyIdList: {
            include: { story: { include: { author: true } } },
          },
          profile: true,
          childCollections: true,
          location: true,
        },
      }),

      prisma.roleToCollection.findMany({
        where: { profileId },
        include: {
          collection: {
            include: {
              storyIdList: {
                include: { story: { include: { author: true } } },
              },
              profile: true,
              childCollections: true,
              location: true,
            },
          },
        },
      }),
    ]);

    const all = [
      ...colList,
      ...roleList.map(r => r.collection),
    ];

    const uniqueMap = new Map();
    for (const c of all) {
      uniqueMap.set(c.id, c);
    }

    const unique = Array.from(uniqueMap.values());
    const totalCount = unique.length;

    const paginated = unique
      .sort((a, b) => new Date(b.updated) - new Date(a.updated))
      .slice(skip, skip + take);

    res.status(200).json({
      collections: paginated,
      skip,
      take,
      totalCount,
      hasMore: skip + take < totalCount,
    });
  } catch (err) {
    res.status(400).send({ error: err });
  }
});
router.get("/profile/:id/public", async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 20;
    const type = req.query.type; // 👈 ADD THIS

    const profileId = req.params.id;

    const baseWhere = {
      profile: { id: profileId },
      isPrivate: false,
    };

    // 🔥 dynamic filtering
    let where = { ...baseWhere };

    if (type === "library") {
      // SPECIAL RULE: library = collections with children > 0
      where.childCollections = {
        some: {}, // has at least one childCollection
      };
    } else if (type) {
      // normal type filter
      where.type = type;
    }

    const [collections, totalCount] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: {
          storyIdList: {
            include: {
              story: { include: { author: true } },
            },
          },
          childCollections: true, // optional but useful for UI
        },
        orderBy: { updated: "desc" },
        skip,
        take,
      }),

      prisma.collection.count({
        where,
      }),
    ]);

    res.status(200).json({
      collections,
      totalCount,
      skip,
      take,
      hasMore: skip + take < totalCount,
    });
  } catch (err) {
    res.status(400).send({ error: err });
  }
});
    router.get("/public/library",async (req,res)=>{
        try{
            const libraries = await prisma.collection.findMany({
                orderBy:{
                    updated:"desc"},
            where:{
                AND:[{isPrivate:{
                    equals:false
                }},{
                    childCollections:{
                        some: {}
                    }
                }]
            }})
            const adminCols = libraries.filter(book=>book.priority>90).sort((a,b)=>b.priority-a.priority)
          
const otherCols = libraries.filter(book=>book.priority<90)
            res.json({libraries:[...adminCols,...otherCols]})
        }catch(e){
      
        res.json({error:e})
        }
    })
    router.patch("/:id/role",async (req,res)=>{
        const {roles}=req.body
        try{
          
        let updated= roles.map(role=>{

            if(role.role=="role"){
                if(role.id){
                return prisma.roleToStory.delete({where:{id:role.id}})
                }
            }else{
                if(roles.role && roles.id.length>10){
            return prisma.roleToCollection.upsert({
                where:{
                    id:role.id
                },
                update:{
                    role:role.role,
                },
                create:{
                    role:role.role,
                    profileId:role.profile.id,
                    collectionId:role.item.id
                }
               , include:{
                    collection:true,
                    profile:true
                }})
            }else{
                return prisma.roleToCollection.create({data:{
                    role:role.role,
                    profile:{
                        connect:{
                            id:role.profile.id
                        }
                    },
                    collection:{
                        connect:{
                            id:role.item.id
                        }
                    }
                },include:{
                    collection:true,
                    profile:true
                }})
            }}
            })
    let newRoles = await Promise.all(updated)
   
    res.json({roles:newRoles.filter(role=>!!role)})

        }catch(error){
            console.log(error)
            res.json({error})
        }

        
    })
    router.get("/:id/profile/:profileId",async (req,res)=>{
        try{
           let found = prisma.roleToCollection.findUniqueOrThrow({
                where:{
                   AND:{
                    collection:{
                        id:{
                            equals: req.params.id
                        }
                    },
                    profile:{
                        id:{
                            equals: req.params.profileId
                        }
                    }
                   }
                }
            })
            res.status(200).json({
                isMember:true,
                role:found
            })

        }catch(e){

            res.json({isMember:false,
                                message:"Profile is not member of collection"
            })
        }
    })
    router.get("/public/book",async (req,res)=>{
        //GET ALL PUBLIC BOOKS
        try{
        const books  = 
            await prisma.collection.findMany({
                orderBy:{
                    updated:"desc"},
                where:{
                    AND:{  
                        isPrivate:{equals:false},
                            childCollections:{
                                none:{}
                            },
                        
            }}
        ,include:{
            childCollections:true,
            storyIdList:{
                include:{story:{include:{author:true}}}  
              },
            roles:{
                include:{
                    profile:true,
                }
            },
            profile:true
        }})
        let adminCols = books.filter(book=>book.priority>90).sort((a,b)=>b.priority-a.priority)
        let otherCols = books.filter(book=>book.priority<90)
    

        res.json({books:[...adminCols,...otherCols]})
    }catch(error){
        res.json({error})
    }
    })
    router.get("/:id",async (req,res)=>{

        //GET COLLECTION
        try{
       let collection = await getCollectionById(req.params.id)
       
        res.status(200).json({collection:collection})
    }catch(error){
        console.log(error)
        res.json({error})
    }
    })
 


router.get('/col/:id/protected', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.profiles?.length) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentProfile = req.user.profiles[0];
    const collection = await getCollectionById(id);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const sightArr = ['reader', 'commenter', 'editor', 'writer'];

    // ---------- OWNER ----------
    if (collection.profileId === currentProfile.id) {
      return res.json({ collection });
    }

    // ---------- ROLE ----------
    if (collection.roles?.length) {
      const found = collection.roles.find(
        (r) => r?.profileId === currentProfile.id
      );

      if (found && sightArr.includes(found.role)) {
        return res.json({ collection });
      }
    }

    // ---------- PUBLIC ----------
    if (!collection.isPrivate) {
      return res.json({ collection });
    }

    // ---------- PARENT ----------
    if (collection.parentCollections?.length) {
      for (const cTc of collection.parentCollections) {
        const parent = cTc.parentCollection;
        if (!parent) continue;

        if (parent.profileId === currentProfile.id) {
          return res.json({ collection });
        }

        if (!parent.isPrivate) {
          return res.json({ collection });
        }

        const found = parent.roles?.find(
          (r) => r?.profileId === currentProfile.id
        );

        if (found && sightArr.includes(found.role)) {
          return res.json({ collection });
        }
      }
    }

    // ---------- DENY ----------
    return res.status(403).json({
      error: 'Access denied: user cannot view this collection',
    });

  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});
router.get("/:id/collection/protected",authMiddleware,async (req,res)=>{
    const {id}=req.params
try{
    const collections =await prisma.collectionToCollection.findMany(
        {where:
            {parentCollectionId:{
                equals:id
            }
        },include:{
            childCollection:{
                include:{
                    storyIdList:{
                        include:{story:{include:{author:true}}}  
                      },
                    childCollections:true,
                    roles:{
                        include:{
                            profile:true,
                        }
                    },
                    profile:true
                }
            },
            parentCollection:true,
            profile:true,
        
        }})
   
        res.json({collections})
    }catch(error){
        console.log(error)
        res.json({error})
    }
})
router.get("/:id/collection/public",async (req,res)=>{
    const {id}=req.params
try{
    let collection = await prisma.collection.findFirst({where:{
        id:{equals:id}
    },include:{
        profile:true,
        childCollections:{
            
            include:{
                parentCollection:{
                    include:{
                        storyIdList:{
                            include:{
                                story:true
                            }
                        }
                    }
                },
                childCollection:{
            
                    include:{
                    
                        storyIdList:{
                            include:{
                                story:{include:{
                                    author:true
                                }
                                }
                            }
                        },
                        parentCollections:true,
                        childCollections:{

                            include:{
                                
                                childCollection:{
                                    include:{
                                        
                                        storyIdList:{
                                            include:{
                                                story:{
                                                    include:{
                                                        author:true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }}})
    if(collection.isPrivate==false){

  

    res.json({list:collection.childCollections})
    }else{
        throw new Error("Private")
    }
}catch(error){
    console.log(error)
    res.json({error})
}
})
router.post("/:id/collection",authMiddleware,async (req,res)=>{
let collection = null
   try{

     const {id}=req.params
    const {list,profile}=req.body
   
    let promises = list.filter(async childId=>{

        let collt = await prisma.collectionToCollection.findFirst({where:{childCollectionId:{
            equals: childId
        },parentCollectionId:{
            equals:id
        }
            
        }})
        return !collt

    }).map(async childId=>{
        return prisma.collectionToCollection.create({
            data:{
                childCollection:{
                    connect:{
                        id:childId
                    }
                },
                parentCollection:{
                  connect:{
                    id: id
                  }
                },
                profile:{
                    connect:{
                        id:profile.id
                    }
                }
            }
        })
    })
   
           collection =  await prisma.collection.update({
            where:{id:id},data:{
                type: "library",
                updated: new Date(),
            },include:{
                
                storyIdList:{
                    include:{story:{include:{author:true}}}  
                  },
                  parentCollections:{
                    select:{
                        id:true,
                        parentCollectionId:true
                    }
                  },
                childCollections:true,
                roles:{
                    include:{
                        profile:true,
                    }
                },
                profile:true
            }})
            let joint = await Promise.all(promises)
            if(list.length==1){
                let colId = list[0]
                 collection = await prisma.collection.findFirst({where:{
        id:colId
    },include:{
        profile:true,
        parentCollections:{
            select:{id:true,parentCollectionId:true}
        },
        childCollections:{
            include:{
                childCollection:true
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
  
            }else{
                let colId = list[0]
                collection = await prisma.collection.findFirst({where:{
       id:id
   },include:{
    profile:true,
    parentCollections:{
        select:{
            id:true,
            parentCollectionId:true,
        }
    },
       childCollections:{
           include:{
               childCollection:true
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

            }
   
            res.json({collection})

}catch(error){
console.log(error)
    res.json({error})
}}
)
router.post("/:id/story",authMiddleware,async (req,res)=>{
    //ADD story TO COLLECTION
    try{
    const {id}=req.params
    const {list,profile}=req.body
    const newList = list.filter(story=>story!=null)
    
    let promises = newList.map(story=>{
        return prisma.storyToCollection.create({
            data:{
                story:{
                    connect:{
                        id:story.id
                    }
                },
                collection:{
                    connect:{
                        id:id
                    }
                }
                ,profile:{
                    connect:{
                        id:profile.id
                    }
                }
        
            },include:{
                story:{
                    include:{
                        author:true
                    }
                }
            }
        })
    })
    let joint = await Promise.all(promises)
    let col = await prisma.collection.update({where:{id:id},data:{
        updated:new Date()
    },include:{
        storyIdList:{
            include:{story:{include:{author:true}}}  
          },
        childCollections:true,
        roles:{
            include:{
                profile:true,
            }
        },
        profile:true
    }})
    
   let stories = await prisma.story.findMany({where:{
    id:{
        in:list.map(i=>i.id)
    }
   },include:{
    collections:{
        select:{
            id:true,
            collectionId:true
        }
    }
   }})
    res.json({collection:col,stories})
}catch(error){
    console.log({error})
    res.json({error})
}
}
)
    router.delete("/colToCol/:id",async (req,res)=>{
        //REMOVE COLLECTION FROM COLLECTION
        const {id}=req.params

        try{
          let ptc = await prisma.collectionToCollection.findFirst({where:{id:{
                equals:id
            }}})
            if(ptc){
                await prisma.collectionToCollection.delete({where:{
                    id:id
                }})
      let collection =await prisma.collection.findFirst({where:{
        id:{equals:ptc.childCollectionId}},include:{
            profile:true,
            storyIdList:true,
            childCollections:true,
            parentCollections:{
                select:{
                    id:true,
                    parentCollectionId:true
                }
            }}
        })
      
        res.json({collection,message:"Deleted Successfully"})
            }else{
res.json({message:"Already Deleted"})
            }


}catch(error){
console.log(error)
        res.json({error})
}})



router.delete("/storyToCol/:stId",authMiddleware,async (req,res)=>{
    //DELETE STORY FROM COLLECTION
    try{
    const {stId}=req.params
   let stc= await prisma.storyToCollection.findFirst({where:{
        id:stId
    },include:{
        story:true
    }})
    await prisma.storyToCollection.delete({where:{
        id:stId
    }})
   let collection = await prisma.collection.findMany({where:{
        id:stc.collectionId
    },include:{
        storyIdList:{
            include:{
                story:true
            }
        },
        childCollections:{
            include:{
                childCollection:true
            }
        }
    }})

    res.json({collection,story:stc.story,message:"Deleted Successfully"})
}catch(error){

    res.json({error})
}

})
    router.delete("/collection/",authMiddleware,async (req,res)=>{

    })
    router.delete("/:id",authMiddleware,async (req,res)=>{
        //DELETE COLLECTION
        try{
        const {id} = req.params
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
            OR:[{childCollection:{
                id:{equals:id}
            }},{parentCollectionId:{
                equals:id
            }}]
        }})
        await prisma.profileToCollection.deleteMany({where:{
            collectionId:{
                equals:id
            }
        }})
        await prisma.hashtagCollection.deleteMany({where:{
            collectionId:{
                equals:id
            }
        }})
        await prisma.collection.delete({where:{
            id: id
        }})
     await client.deleteObject({
      indexName:indexNames.collection,
      objectID:id
      
    
    })
        res.status(202).json({message:"success"})
    }catch(error){
        console.log(error)
        res.json({error})
    }
    })
    router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      purpose,
      isPrivate,
      isOpenCollaboration,
      storyToCol = [],
      colToCol = [],
    } = req.body;
console.log("PATCH COLLECTION BODY:", JSON.stringify(req.body, null, 2));
console.log("PATCH COLLECTION PARAM ID:", id);
console.log("PATCH STORY TO COL:", storyToCol);
console.log("PATCH COL TO COL:", colToCol);
    if (!id) {
      return res.status(400).json({
        error: "Collection id is required",
      });
    }

    if (!Array.isArray(storyToCol)) {
      return res.status(400).json({
        error: "storyToCol must be an array",
      });
    }

    if (!Array.isArray(colToCol)) {
      return res.status(400).json({
        error: "colToCol must be an array",
      });
    }

    /*
     * The collection being edited comes from the URL.
     * Do not trust req.body.col.id.
     */
    const existingCollection = await prisma.collection.findUnique({
      where: {
        id,
      },
      include: {
        storyIdList: true,
        childCollections: true,
      },
    });

    if (!existingCollection) {
      return res.status(404).json({
        error: "Collection not found",
      });
    }

    /*
     * ---------------------------------------------------------
     * Validate StoryToCollection relationships
     * ---------------------------------------------------------
     */

    const storyIds = new Set();
    const storyRelationshipIds = new Set();

    for (let index = 0; index < storyToCol.length; index += 1) {
      const relation = storyToCol[index];

      if (!relation?.id) {
        return res.status(400).json({
          error: `storyToCol[${index}] is missing id`,
        });
      }

      if (!relation?.story?.id) {
        return res.status(400).json({
          error: `storyToCol[${index}] is missing story.id`,
        });
      }

      if (storyRelationshipIds.has(relation.id)) {
        return res.status(400).json({
          error: `Duplicate StoryToCollection id: ${relation.id}`,
        });
      }

      if (storyIds.has(relation.story.id)) {
        return res.status(400).json({
          error: `Story appears more than once in this collection: ${relation.story.id}`,
        });
      }

      storyRelationshipIds.add(relation.id);
      storyIds.add(relation.story.id);
    }

    /*
     * ---------------------------------------------------------
     * Validate CollectionToCollection relationships
     * ---------------------------------------------------------
     */

    const childCollectionIds = new Set();
    const collectionRelationshipIds = new Set();

    for (let index = 0; index < colToCol.length; index += 1) {
      const relation = colToCol[index];

      if (!relation?.id) {
        return res.status(400).json({
          error: `colToCol[${index}] is missing id`,
        });
      }

      if (!relation?.childCollection?.id) {
        return res.status(400).json({
          error: `colToCol[${index}] is missing childCollection.id`,
        });
      }

      if (collectionRelationshipIds.has(relation.id)) {
        return res.status(400).json({
          error: `Duplicate CollectionToCollection id: ${relation.id}`,
        });
      }

      if (childCollectionIds.has(relation.childCollection.id)) {
        return res.status(400).json({
          error: `Child collection appears more than once: ${relation.childCollection.id}`,
        });
      }

      /*
       * A collection cannot contain itself.
       */
      if (relation.childCollection.id === id) {
        return res.status(400).json({
          error: "A collection cannot contain itself",
        });
      }

      collectionRelationshipIds.add(relation.id);
      childCollectionIds.add(relation.childCollection.id);
    }

    /*
     * ---------------------------------------------------------
     * Make sure the submitted relationships actually belong
     * to this collection.
     * ---------------------------------------------------------
     */

    const existingStoryRelationshipIds = new Set(
      existingCollection.storyIdList.map((relation) => relation.id)
    );

    const existingCollectionRelationshipIds = new Set(
      existingCollection.childCollections.map((relation) => relation.id)
    );

    for (const relation of storyToCol) {
      if (!existingStoryRelationshipIds.has(relation.id)) {
        return res.status(400).json({
          error: `StoryToCollection relationship does not belong to this collection: ${relation.id}`,
        });
      }
    }

    for (const relation of colToCol) {
      if (!existingCollectionRelationshipIds.has(relation.id)) {
        return res.status(400).json({
          error: `CollectionToCollection relationship does not belong to this collection: ${relation.id}`,
        });
      }
    }

    /*
     * ---------------------------------------------------------
     * Build the new shared ordering.
     *
     * The frontend sends one mixed list:
     *
     * Room
     * Page
     * Page
     * Room
     * Page
     *
     * Each relationship has already been assigned its index.
     *
     * We normalize the indexes here so the database always
     * receives a clean 0...N-1 ordering across BOTH types.
     * ---------------------------------------------------------
     */

    const submittedItems = [
      ...storyToCol.map((relation) => ({
        type: "story",
        id: relation.id,
        relation,
      })),

      ...colToCol.map((relation) => ({
        type: "collection",
        id: relation.id,
        relation,
      })),
    ];

    submittedItems.sort((a, b) => {
      const aIndex =
        Number.isInteger(a.relation.index)
          ? a.relation.index
          : Number.MAX_SAFE_INTEGER;

      const bIndex =
        Number.isInteger(b.relation.index)
          ? b.relation.index
          : Number.MAX_SAFE_INTEGER;

      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }

      return a.id.localeCompare(b.id);
    });

    /*
     * Assign one contiguous index sequence to the entire
     * collection, regardless of whether an item is a Page
     * or Room.
     */
    const normalizedStoryToCol = [];
    const normalizedColToCol = [];

    submittedItems.forEach((item, index) => {
      if (item.type === "story") {
        normalizedStoryToCol.push({
          ...item.relation,
          index,
        });
      } else {
        normalizedColToCol.push({
          ...item.relation,
          index,
        });
      }
    });

    /*
     * ---------------------------------------------------------
     * Transaction
     * ---------------------------------------------------------
     */

    await prisma.$transaction(async (tx) => {
      /*
       * Update the Collection itself.
       */
      await tx.collection.update({
        where: {
          id,
        },
        data: {
          updated: new Date(),
          title: typeof title === "string" ? title.trim() : existingCollection.title,
          purpose:
            typeof purpose === "string"
              ? purpose.trim()
              : existingCollection.purpose,
          isPrivate:
            typeof isPrivate === "boolean"
              ? isPrivate
              : existingCollection.isPrivate,
          isOpenCollaboration:
            typeof isOpenCollaboration === "boolean"
              ? isOpenCollaboration
              : existingCollection.isOpenCollaboration,
        },
      });

      /*
       * -------------------------------------------------------
       * Remove StoryToCollection relationships that no longer
       * exist in the submitted collection.
       * -------------------------------------------------------
       */

      const submittedStoryRelationshipIds = new Set(
        normalizedStoryToCol.map((relation) => relation.id)
      );

      const storyRelationshipsToDelete =
        existingCollection.storyIdList.filter(
          (relation) =>
            !submittedStoryRelationshipIds.has(relation.id)
        );

      if (storyRelationshipsToDelete.length > 0) {
        await tx.storyToCollection.deleteMany({
          where: {
            id: {
              in: storyRelationshipsToDelete.map(
                (relation) => relation.id
              ),
            },
          },
        });
      }

      /*
       * -------------------------------------------------------
       * Remove CollectionToCollection relationships that no
       * longer exist in the submitted collection.
       * -------------------------------------------------------
       */

      const submittedCollectionRelationshipIds = new Set(
        normalizedColToCol.map((relation) => relation.id)
      );

      const collectionRelationshipsToDelete =
        existingCollection.childCollections.filter(
          (relation) =>
            !submittedCollectionRelationshipIds.has(relation.id)
        );

      if (collectionRelationshipsToDelete.length > 0) {
        await tx.collectionToCollection.deleteMany({
          where: {
            id: {
              in: collectionRelationshipsToDelete.map(
                (relation) => relation.id
              ),
            },
          },
        });
      }

      /*
       * -------------------------------------------------------
       * Update StoryToCollection indexes.
       * -------------------------------------------------------
       */

      await Promise.all(
        normalizedStoryToCol.map((relation) =>
          tx.storyToCollection.update({
            where: {
              id: relation.id,
            },
            data: {
              index: relation.index,
            },
          })
        )
      );

      /*
       * -------------------------------------------------------
       * Update CollectionToCollection indexes.
       * -------------------------------------------------------
       */

      await Promise.all(
        normalizedColToCol.map((relation) =>
          tx.collectionToCollection.update({
            where: {
              id: relation.id,
            },
            data: {
              index: relation.index,
            },
          })
        )
      );
    });

    /*
     * ---------------------------------------------------------
     * Fetch the complete updated collection.
     *
     * This is deliberately done AFTER the transaction so the
     * response reflects the committed database state.
     * ---------------------------------------------------------
     */

    const updatedCol = await getCollectionById(id);

    return res.json({
      collection: updatedCol,
    });
  } catch (error) {
    console.error("PATCH /collection/:id error:", error);

    return res.status(500).json({
      error: error.message || "Unable to update collection",
    });
  }
});

   router.get(
  "/profile/protected",
  authMiddleware,
  async (req, res) => {
     console.log("PROFILE PROTECTED QUERY:", req.query);
    try {
      const profile =
        await prisma.profile.findFirst({
          where: {
            userId: req.user.id,
          },
          select: {
            id: true,
          },
        });

      if (!profile) {
        return res.status(404).json({
          error: "Profile not found",
        });
      }

      const profileId = profile.id;


      // ------------------------------------------------------
      // Pagination
      // ------------------------------------------------------

      const parsedSkip =
        Number.parseInt(
          req.query.skip,
          10
        );

      const parsedTake =
        Number.parseInt(
          req.query.take,
          10
        );

      const skip =
        Number.isFinite(parsedSkip) &&
        parsedSkip >= 0
          ? parsedSkip
          : 0;

      const take =
        Number.isFinite(parsedTake) &&
        parsedTake > 0
          ? Math.min(parsedTake, 100)
          : 20;


      // ------------------------------------------------------
      // Query params
      // ------------------------------------------------------

      const {
        type,
        search = "",
        isWorkshop,
        scope,
      } = req.query;


      if (
        scope &&
        !["created", "member"].includes(
          scope
        )
      ) {
        return res.status(400).json({
          error:
            "scope must be either created or member",
        });
      }


      // ------------------------------------------------------
      // Find relevant Room IDs
      // ------------------------------------------------------

      let relevantCollectionIds = [];


      if (scope === "created") {
        const created =
          await prisma.collection.findMany({
            where: {
              profileId,
            },
            select: {
              id: true,
            },
          });

        relevantCollectionIds =
          created.map(
            (collection) =>
              collection.id
          );
      }


      else if (scope === "member") {
        const memberships =
          await prisma.roleToCollection.findMany({
            where: {
              profileId,
              approved: true,

              // The creator/current owner should
              // not also appear in "Rooms with
              // other people".
              role: {
                not: "owner",
              },

              collectionId: {
                not: null,
              },
            },

            select: {
              collectionId: true,
            },
          });

        relevantCollectionIds =
          memberships
            .map(
              (membership) =>
                membership.collectionId
            )
            .filter(Boolean);
      }


      else {
        const [
          created,
          memberships,
        ] = await Promise.all([
          prisma.collection.findMany({
            where: {
              profileId,
            },
            select: {
              id: true,
            },
          }),

          prisma.roleToCollection.findMany({
            where: {
              profileId,
              collectionId: {
                not: null,
              },
            },
            select: {
              collectionId: true,
            },
          }),
        ]);

        relevantCollectionIds = [
          ...created.map(
            (collection) =>
              collection.id
          ),

          ...memberships.map(
            (membership) =>
              membership.collectionId
          ),
        ].filter(Boolean);
      }


      relevantCollectionIds = [
        ...new Set(
          relevantCollectionIds
        ),
      ];
console.log("PROFILE ID:", profileId);
console.log("RELEVANT COLLECTION IDS:", relevantCollectionIds);
const allRelevantCollections = await prisma.collection.findMany({
  where: {
    id: { in: relevantCollectionIds },
  },
  select: {
    id: true,
    title: true,
    isWorkshop: true,
    profileId: true,
  },
});

console.log(
  "ALL RELEVANT COLLECTIONS:",
  allRelevantCollections.map((collection) => ({
    ...collection,
    isWorkshop: collection.isWorkshop,
  }))
);
      if (
        relevantCollectionIds.length === 0
      ) {
        return res.json({
          collections: [],
          skip,
          take,
          totalCount: 0,
          hasMore: false,
        });
      }


      // ------------------------------------------------------
      // Collection filtering
      // ------------------------------------------------------

      const collectionWhere = {
        id: {
          in: relevantCollectionIds,
        },
      };


      if (type) {
        collectionWhere.type = type;
      }


      if (isWorkshop !== undefined) {
        if (
          isWorkshop !== "true" &&
          isWorkshop !== "false"
        ) {
          return res.status(400).json({
            error:
              "isWorkshop must be true or false",
          });
        }

        collectionWhere.isWorkshop =
          isWorkshop === "true";
      }


      const normalizedSearch =
        typeof search === "string"
          ? search.trim()
          : "";


      if (normalizedSearch) {
        collectionWhere.OR = [
          {
            title: {
              contains:
                normalizedSearch,
              mode: "insensitive",
            },
          },

          {
            purpose: {
              contains:
                normalizedSearch,
              mode: "insensitive",
            },
          },
        ];
      }


      // ------------------------------------------------------
      // Get ordered IDs first
      // ------------------------------------------------------

      const filtered =
        await prisma.collection.findMany({
          where: collectionWhere,

          select: {
            id: true,
            updated: true,
          },

          orderBy: [
            {
              updated: "desc",
            },
            {
              id: "desc",
            },
          ],
        });


      const totalCount =
        filtered.length;

      const pagedIds =
        filtered
          .slice(
            skip,
            skip + take
          )
          .map(
            (collection) =>
              collection.id
          );

console.log(
  "FILTER:",
  {
    isWorkshop,
    type,
    search: normalizedSearch,
  }
);

console.log(
  "FILTERED COLLECTIONS:",
  filtered
);
      if (pagedIds.length === 0) {
        return res.json({
          collections: [],
          skip,
          take,
          totalCount,
          hasMore:
            skip < totalCount,
        });
      }


      // ------------------------------------------------------
      // Load complete Rooms
      // ------------------------------------------------------

      const collections =
        await prisma.collection.findMany({
          where: {
            id: {
              in: pagedIds,
            },
          },

          include: {
            childCollections: {
              include: {
                childCollection: true,
              },
            },

            storyIdList: {
              include: {
                story: {
                  include: {
                    author: true,
                  },
                },
              },
            },

            roles: {
              include: {
                profile: true,
              },
            },

            profile: true,
          },
        });


      // Prisma's `in` query does not guarantee
      // the requested order, so restore it.
      const byId = new Map(
        collections.map(
          (collection) => [
            collection.id,
            collection,
          ]
        )
      );


      const orderedCollections =
        pagedIds
          .map(
            (id) =>
              byId.get(id)
          )
          .filter(Boolean);


      return res.json({
        collections:
          orderedCollections,

        skip,
        take,
        totalCount,

        hasMore:
          skip + take <
          totalCount,
      });

    } catch (error) {
      console.error(
        "GET /profile/protected failed:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to load Rooms.",
      });
    }
  }
);


    router.put("/:id",async (req,res)=>{
        try{
     const {title,purpose,isPrivate,isOpenCollaboration}=req.body
        let data = await prisma.collection.update({
            where:{
                id:req.params.id
            },
            data:{
                title:title,
                purpose:purpose,
                isPrivate:isPrivate,
                isOpenCollaboration:isOpenCollaboration
            }
        })

client.partialUpdateObject({indexName:indexNames.collection,attributesToUpdate:{
 title:data.title
},
objectID:data.id
  // objectID:data.id,
 
})

      
      
  
    // })
        res.json({collection:data})
    }catch(error){
        res.json({error})
    }
    })
    router.get(
  "/recommendations/rooms",
  authMiddleware,
  async (req, res) => {
    try {
      // ------------------------------------------------------
      // Profile
      // ------------------------------------------------------

      const profile = req.user?.profiles?.[0];

      if (!profile?.id) {
        return res.status(404).json({
          error: "Profile not found.",
        });
      }

      const profileId = profile.id;

      // ------------------------------------------------------
      // Pagination
      // ------------------------------------------------------

      const parsedSkip = Number.parseInt(
        req.query.skip,
        10
      );

      const parsedTake = Number.parseInt(
        req.query.take,
        10
      );

      const skip =
        Number.isFinite(parsedSkip) && parsedSkip >= 0
          ? parsedSkip
          : 0;

      const take =
        Number.isFinite(parsedTake) && parsedTake > 0
          ? Math.min(parsedTake, 100)
          : 10;

      // ------------------------------------------------------
      // Find Rooms the profile already owns or has joined
      // ------------------------------------------------------

      const [ownedRooms, memberships] = await Promise.all([
        prisma.collection.findMany({
          where: { profileId },
          select: { id: true },
        }),

        prisma.roleToCollection.findMany({
          where: {
            profileId,
            collectionId: { not: null },
          },
          select: {
            collectionId: true,
          },
        }),
      ]);

      const excludedIds = new Set([
        ...ownedRooms.map((room) => room.id),
        ...memberships
          .map((membership) => membership.collectionId)
          .filter(Boolean),
      ]);

      // ------------------------------------------------------
      // Gather interests from the profile's existing Rooms
      // ------------------------------------------------------

      const joinedRoomIds = (
        await prisma.roleToCollection.findMany({
          where: {
            profileId,
            approved: true,
            role: { not: "owner" },
            collectionId: { not: null },
          },
          select: {
            collectionId: true,
          },
        })
      )
        .map((membership) => membership.collectionId)
        .filter(Boolean);

      const sourceRoomIds = [
        ...new Set([
          ...ownedRooms.map((room) => room.id),
          ...joinedRoomIds,
        ]),
      ];

      const sourceRooms = sourceRoomIds.length
        ? await prisma.collection.findMany({
            where: {
              id: { in: sourceRoomIds },
            },
            select: {
              hashtags: {
                select: {
                  hashtagId: true,
                },
              },
              storyIdList: {
                where: {
                  story: {
                    isPrivate: false,
                  },
                },
                select: {
                  story: {
                    select: {
                      hashtags: {
                        select: {
                          hashtagId: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          })
        : [];

      const interestTagCounts = new Map();

      for (const room of sourceRooms) {
        for (const tag of room.hashtags ?? []) {
          if (!tag?.hashtagId) continue;

          interestTagCounts.set(
            tag.hashtagId,
            (interestTagCounts.get(tag.hashtagId) ?? 0) + 2
          );
        }

        for (const entry of room.storyIdList ?? []) {
          for (const tag of entry.story?.hashtags ?? []) {
            if (!tag?.hashtagId) continue;

            interestTagCounts.set(
              tag.hashtagId,
              (interestTagCounts.get(tag.hashtagId) ?? 0) + 1
            );
          }
        }
      }

      // ------------------------------------------------------
      // Find eligible public Rooms
      // ------------------------------------------------------

      const candidates = await prisma.collection.findMany({
        where: {
          isPrivate: false,
          isWorkshop: false,
          ...(excludedIds.size
            ? {
                id: {
                  notIn: [...excludedIds],
                },
              }
            : {}),
        },
        include: {
          profile: true,

          hashtags: {
            include: {
              hashtag: true,
            },
          },

          storyIdList: {
            where: {
              story: {
                isPrivate: false,
              },
            },
            include: {
              story: {
                include: {
                  author: true,
                  hashtags: {
                    include: {
                      hashtag: true,
                    },
                  },
                },
              },
            },
          },

          parentCollections: {
            include: {
              parentCollection: {
                select: {
                  id: true,
                },
              },
            },
          },

          childCollections: {
            where: {
              childCollection: {
                isPrivate: false,
              },
            },
            include: {
              childCollection: true,
            },
          },

          roles: {
            include: {
              profile: true,
            },
          },
        },
      });

      // ------------------------------------------------------
      // Rank: shared interests first, then activity and recency
      // ------------------------------------------------------

      const now = Date.now();

      const scoredRooms = candidates.map((room) => {
        let interestScore = 0;

        const seenTagIds = new Set();

        const addTagScore = (tagId) => {
          if (!tagId || seenTagIds.has(tagId)) return;

          seenTagIds.add(tagId);
          interestScore += interestTagCounts.get(tagId) ?? 0;
        };

        for (const tag of room.hashtags ?? []) {
          addTagScore(tag.hashtagId);
        }

        for (const entry of room.storyIdList ?? []) {
          for (const tag of entry.story?.hashtags ?? []) {
            addTagScore(tag.hashtagId);
          }
        }

        // More public writing means a more active Room.
        const activityScore = Math.log1p(
          (room.storyIdList ?? []).length
        );

        const updatedAt = new Date(
          room.updated ?? room.created ?? 0
        ).getTime();

        const ageInDays = Number.isFinite(updatedAt)
          ? Math.max(0, (now - updatedAt) / 86400000)
          : 365;

        // Smoothly reduce the recency signal as a Room ages.
        const recencyScore = 1 / (1 + ageInDays / 30);

        return {
          ...room,
          _recommendationScore:
            interestScore * 100 +
            activityScore * 2 +
            recencyScore,
        };
      });

      scoredRooms.sort((a, b) => {
        const scoreDifference =
          b._recommendationScore - a._recommendationScore;

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        const aDate = new Date(
          a.updated ?? a.created ?? 0
        ).getTime();

        const bDate = new Date(
          b.updated ?? b.created ?? 0
        ).getTime();

        if (aDate !== bDate) {
          return bDate - aDate;
        }

        return String(a.id).localeCompare(String(b.id));
      });

      // Remove the internal ranking field before returning results.
      const totalCount = scoredRooms.length;

      const collections = scoredRooms
        .slice(skip, skip + take)
        .map(({ _recommendationScore, ...room }) => room);

      return res.status(200).json({
        collections,
        skip,
        take,
        totalCount,
        hasMore: skip + collections.length < totalCount,
      });
    } catch (error) {
      console.error(
        "Error fetching Room recommendations:",
        error
      );

      return res.status(500).json({
        error: "Unable to load Room recommendations.",
      });
    }
  }
);
    router.post("/",authMiddleware,async (req,res)=>{
        const doc = req.body
        try{
        const {title,location,purpose,type,isPrivate,profileId,isOpenCollaboration}=doc
               let collectionType = type
        if(collectionType!="feedback"){
            collectionType="book"
        }
        if(location){
        let locale = await createLocation(location)
        const collection = await prisma.collection.create({data:{
            title:title,
            purpose:purpose,
            isPrivate:isPrivate,
            isOpenCollaboration:isOpenCollaboration,
            location:{
                connect:{
                    id:locale?locale.id:null,
                }},
            profile:{
                connect:{
                    id: profileId
                }
            }
            ,type: collectionType
        },
            include:{
    
                storyIdList:{
                    include:{story:{include:{author:true}}}  
                  },
                childCollections:true,
                roles:{
                 include:{
                     profile:true,
                 }
             },
             profile:true
             
                 
             }
        })
        client.saveObject({indexName:indexNames.collection,body:{
  objectID:collection.id,
  title:collection.title,
  type:collection.type
}})
        res.status(201).json({collection:collection})
    }else{
          const collection = await prisma.collection.create({data:{
            title:title,
            purpose:purpose,
            isPrivate:isPrivate,
            isOpenCollaboration:isOpenCollaboration,
            profile:{
                connect:{
                    id: profileId
                }
            }
            ,type: collectionType
        },
            include:{

                storyIdList:{
                    include:{story:{include:{author:true}}}  
                  },
                childCollections:true,
                roles:{
                 include:{
                     profile:true,
                 }
             },
             profile:true
             
                 
             }
        })
        res.status(201).json({collection:collection})
    }
        
    
    }catch(error){
        console.log(error)
        res.json({error})
    }
    })

    return router

}
async function getCollectionById(id) {
  // Fetch the collection with all relations
  
  const collection = await prisma.collection.findFirst({
    where: { id },
    include: {
    
      storyIdList: {
        include: {
          story: { include: { author: true } },
        },
      },
      parentCollections: {
        include: {
          parentCollection: {
            select: { id: true, roles: true },
          },
        },
      },
      location:true,
      childCollections: {
        include: {
          parentCollection: true,
          childCollection: {
            include: {
              storyIdList: {
                include: {
                  story: { include: { author: true } },
                },
              },
            },
          },
        },
      },
      roles: {
        include: { profile: true },
      },
      profile: true,
    },
  });

  if (!collection) return null;

  // ✅ Filter out entries with missing story
  const orphanedEntries = collection.storyIdList.filter((s) => !s.story);

  // ✅ Delete them from the database
  if (orphanedEntries.length > 0) {
    const orphanIds = orphanedEntries.map((entry) => entry.id);
   await prisma.story.deleteMany({where:{id:{in:orphanIds}}})
   
    // Remove them from the local object as well
    collection.storyIdList = collection.storyIdList.filter((s) => s.story);
  }

  return collection;
}