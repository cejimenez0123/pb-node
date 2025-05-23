const express = require('express');
const prisma = require("../db");
const router = express.Router()
const updateWriterLevelMiddleware = require("../middleware/updateWriterLevelMiddleware")
const fetchEvents = require("../newsletter/fetchEvents")
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
  
const getRecommendations = async (profileId) => {
    const user = await prisma.profile.findUnique({
      where: { id: profileId},
      include: { likedStories:true
      
       },
    });
  
    const contentBasedScores = await getContentBasedScores(user.likedStories);
    const collaborativeScores = await getCollaborativeScores(profileId);
    
    const hybridScores = {};
    for (let storyId in contentBasedScores) {
      hybridScores[storyId] =
        0.7 * contentBasedScores[storyId] + 0.3 * (collaborativeScores[storyId] || 0);
    }
  
    return Object.entries(hybridScores)
      .sort((a, b) => b[1] - a[1]) 
      .map(([storyId]) => storyId); // Return sorted story IDs
  };
  
module.exports = function ({authMiddleware}){
    const allMiddlewares = [authMiddleware,updateWriterLevelMiddleware];
    
    router.get("/",async (req,res)=>{
        try{
       let stories = await prisma.story.findMany({orderBy:{
        updated:"desc"
       }, where:{
        isPrivate:{equals: false}
       },include:{
        hashtags:{
            include:{
                hashtag:true
            }
        },
        author:true
       }})
        res.json({stories})
    }catch(error){
        console.log("story/",error)
        res.json({error})
    }
    })
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
    router.get("/recommendations",authMiddleware,async(req,res)=>{

        try{
        let profile = req.user.profiles[0]
        if(profile&&!profile.id){
            prisma.profile.findFirst({where:{
                userId:{
                    equals:req.user.id
                }
            }})
        }
        let recommendations = await getRecommendations(profile.id)
   
        if(recommendations.length==0){
            recommendations = await recommendStories(profile.id)
        }
 
       let stories = await prisma.story.findMany({where:{
            id:{
                in:recommendations
            },
            OR:[
{  isPrivate:{
    equals:false
}},{
    betaReaders:{
        some:{
            profileId:{equals:profile.id}
        }
    }
}
            ]
          
        },include:{
            author:true
        }})
        if(stories.length==0){
            stories = await prisma.story.findMany({orderBy:{
            storyLikes:{
                _count:"desc"
            }},where:{
                isPrivate:false
                
            },include:{
                author:true
            }})
        }
    
        res.json({stories:stories})
        }catch(error){
            console.log(error)
            res.json({error})
        }
    })
    router.get("/profile/protected/draft",authMiddleware,async (req,res)=>{
    
            const profile = await prisma.profile.findFirst({where:{
                userId:{
                    equals:req.user.id
                } 
            }})
            const stories = await prisma.story.findMany({where:{
                AND:[{author:{
                    id:{equals:profile.id}
                }},{needsFeedback:{equals:true}}]
            },include:{
                author:true,
                collections:{
                    include:{
                        collection:{
                            select:{
                                id:true,
                                isPrivate:true,
                                title:true
                            }
                        }
                    }
                }
            }})
            res.status(200).json({stories})
 
    })
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
        console.log(req.params)
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
    router.get("/:id/comment/protected",authMiddleware,async (req,res)=>{
      try{
        console.log(req.params.id)
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
    router.get("/profile/protected",authMiddleware,async (req,res)=>{
        try{
        
        const profile = await prisma.profile.findFirst({where:{
            userId:{
                equals:req.user.id
            } 
        }})
        const stories = await prisma.story.findMany({where:{
            author:{
                id:{equals:profile.id}
            }
        },include:{
            author:true
        }})
   
        res.status(200).json({stories})

    }catch(error){
        res.json({error})
    }
    })

    router.get("/profile/:id/public",async (req,res)=>{
        try{
        const stories = await prisma.story.findMany({where:{
            AND:{
               author:{
                id:{
                    equals: req.params.id
                }
               },
            isPrivate:{
                equals:false
                
            }
                
            }
        },include:{
            author:true,
            comments:true
        }})
      
        res.status(200).json({stories})
    }catch(error){
        res.json({error})
    }
    })
    router.get("/profile/:id/protected",authMiddleware,async (req,res)=>{
        try{
        const stories = await prisma.story.findMany({where:{
            AND:{
               author:{
                id:{
                    equals: req.params.id
                }
               },
                
            }
        },include:{
            author:true,
            comments:true
        }})
        res.status(200).json({stories})
    }catch(error){
        res.json({error})
    }
    })
    router.get("/:id/protected",authMiddleware,async (req,res)=>{
try{
        let story = await prisma.story.findFirst({where: {
            id:req.params.id},include:{
                collections:{
                   include:{
                    collection:{
                        select:{
                            id:true,
                            title:true,
                            type:true,
                            isPrivate:true,
                            roles:{
                                include:{
                                    
                                    profile:{
                                        select:{
                                            id:true
                                        }
                                    }
                                }
                            }
                        }
                    }
                   }
                },
                author:true,
                comments:{include:{profile:true,parent:true}},
                hashtags:{
                    include:{
                        hashtag:true
                    }
                },
                
                betaReaders:{
                  include:{
                    profile:true,
                    story:true
                  }
                }
            }})
    
res.status(200).json({story})

    }catch(error){
        console.log(error)
        res.status({error})
    }
    })
    router.get("/:id/public",async (req,res)=>{
       try{
        let id = req.params.id
        let story = await prisma.story.findFirst({where:{
            id:{equals:id}
        },include:{
            author:true,
            hashtags:true,
            collections:{
                include:{
                    collection:{
                        select:{
                            id:true,
                            isPrivate:true,
                            title:true,
                          
                        }
                    }
                }
            },
            comments:{
                include:{
                    profile:true
                }
            }
        }})
    
            if(story && story.isPrivate==false||story.collections.find(col=>col.collection.isPrivate==false)){    
                res.status(200).json({story})
    
            }else{
                res.json({message:"Story not found"})
            }
            
        }catch(error){
            console.log(error)
            res.json({error})
        }
    })
    router.post("/:id/role",...allMiddlewares,async (req,res)=>{
        try{
        const {profileId,role} = req.body
     let roleToStory = await prisma.roleToStory.create({data:{
        story:{
            connect:{
                id:req.params.id,
            },},
        profile:{
            connect:{
                id: profileId
            }
        },
        role:role
      }})  
    res.json({role:roleToCollection})
        }catch(error){
            
            res.json({error})
        }
})
    router.put("/:id",...allMiddlewares,async (req,res)=>{
try{
        const {title,data, description, needsFeedback,isPrivate,commentable,type}= req.body
        let story  = await prisma.story.update({where:{
            id:req.params.id
        },data:{
            title,
            data,
            isPrivate,
            needsFeedback,
            commentable,
            description,
            type,
            updated: new Date()
        },include:{
            author:true,
            comments:true
        }})
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
             
    
                res.status(202).json({story,message:"Deleted Successesfully"})
      
        }catch(error){
     console.log({error})
            res.json({error})
        }

    })
    router.post("/",...allMiddlewares,async (req,res)=>{
    try{
       
        const doc = req.body
   
        const {title,data,isPrivate,authorId,commentable,type}= doc
        const story = await prisma.story.create({data:{
            title:title,
            data:data,
            isPrivate:isPrivate,
            author:{
                connect:{
                    id:authorId
                }
            },
            commentable:commentable,
            type:type
        }})
        res.status(201).json({story})
    }catch(error){
        console.log({error})
        res.json({error})
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