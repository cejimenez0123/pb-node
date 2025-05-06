const express = require('express');
const prisma = require("../db");
const { createLocation } = require('../utils/locationUtil');
const router = express.Router()

module.exports = function (authMiddleware){

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
                // let found = collection.storyIdList.find(sto=>sto.storyId==story.id)
                // if(found){
                    scores[story.id] += 1
                // }else{
                   
                // }
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
            //.map(col=>col.id)
            for(const cTc of collections){
                // for (const like of sTc.storyIdList) {
                    
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
                        // profileId:{
                        //     not:profileId
                        // },
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
                            collection:true
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
            }},
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
        //GET ALL PUBLIC COLLECTIONS
        try{
        const collection = await prisma.collection.findMany(
            {orderBy:{
                
                    updated:"desc"},where:{isPrivate:{equals:false}},include:{
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

        res.status(200).json({data:collection})
        }catch(error){
            res.json({error})
        }


    })
    router.get("/profile/:id/public",async(req,res)=>{
        try{
            let collections = await prisma.collection.findMany({where:{
                AND:[{profile:{
                    id:{
                        equals:req.params.id
                    }
                }},{isPrivate:{
                    equals:false
                }
                    
                }]
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
            res.status(200).json({collections})
        }catch(err){
            res.status(400).send({error:err})
        }
    })
    router.get("/profile/:id/private",authMiddleware,async (req,res)=>{
        try{
            let collections = await prisma.collection.findMany({where:{
                profile:{
                    id:{
                        equals:req.params.id
                    }
                }
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
           
            res.status(200).json({collections})
        }catch(err){
            res.status(400).send({error:err})
        }
    })
    router.get("/profile/:id/public",async (req,res)=>{
        try{
            let collections = await prisma.collection.findMany({where:{
                AND:{
                    profile:{
                        id:{
                            equals:req.params.id
                        }
                    },
                    isPrivate:false
                }
            },include:{
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
            res.status(200).json({collections})
        }catch(err){
            res.status(400).send({error:err})
        }
    })
    router.get("/profile/:id/protected",authMiddleware,async (req,res)=>{
        try{
            let colList = await prisma.collection.findMany({where:{
                AND:{
                    profile:{
                        id:{
                            equals:req.params.id
                        }
                    }
                }
            },include:{
                storyIdList:{
                    include:{story:{include:{author:true}}}  
                  },
                profile:true,
                childCollections:true,
                location:true
            }})
            let roleList = await prisma.roleToCollection.findMany({
                where:{
                    profileId:{
                        equals:req.params.id
                    }
                },include:{
                    collection:{
                        
                        include:{
            
                            storyIdList:{
                                include:{story:{include:{author:true}}}  
                              },
                            profile:true,
                            childCollections:true,
                            location:true
                        }
                    }
                }
            })
            const list = roleList.map(role=>role.collection)
            const collections = [...list,...colList]
            res.status(200).json({collections})
        }catch(err){
            res.status(400).send({error:err})
        }
    })
    
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
        const collection = await prisma.collection.findFirst({where:{
            AND:[{id:{equals:req.params.id}},{isPrivate:false}]
            
        },include:{
            storyIdList:{
                include:{story:{include:{author:true}}}  
              },
            childCollections:{
                where:{
                    childCollection:{
                        
                        isPrivate:{
                            equals:false
                        }
                    }
                },
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
            },
            roles:{
                include:{
                    collection:true,
                    profile:true,
                }
            },
            profile:true
            
        }})
       
        res.status(200).json({collection:collection})
    }catch(error){
        console.log(error)
        res.json({error})
    }
    })
    router.get("/:id/protected",authMiddleware,async (req,res)=>{
        try{
        const collection = await prisma.collection.findFirst({where:{
            id: req.params.id
        },include:{
            storyIdList:{
              include:{
                story:{include:{author:true}}}  
            },
            
            parentCollections:{
                include:{
                
                    parentCollection:{
                        select:{
                            id:true,
                            roles:true
                        }
                    }
                }
            },
        
            childCollections:{
                include:{
                    parentCollection:true,
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
            },
           roles:{
                include:{
                    profile:true,
                }
            },
        
            profile:true
            
        }})
  
        res.status(200).json({collection:collection})
    }catch(error){
        console.log({error})
        res.json({error})
    }
    })
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

  
    // let collections = await prisma.collectionToCollection.findMany(
    //     {where:
    //         {AND:
    //             [{parentCollectionId:{equals:id}}
               

    //         ]}
    //     ,include:{
            
    //         childCollection:{
    //             include:{
    //                 storyIdList:{
    //                     include:{story:{include:{author:true}}}  
    //                   },
    //                   parentCollections:{
    //                     include:{
    //                         parentCollection:{
    //                             include:{
    //                                 roles:true                                }
    //                         }
    //                     }
    //                   },
    //                     childCollections:true,
    //                     roles:{
    //                         include:{
    //                             profile:true,
    //                         }
    //                     },
    //                     profile:true
                    
    //             }
    //         },
    //         parentCollection:true,
    //         profile:true
    //     }})
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
   
           let collection =  await prisma.collection.update({
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
    res.json({collection})
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
   res.json({collection})
            }
   


}catch(error){

    res.json(409).json({error})
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
     
        res.status(202).json({message:"success"})
    }catch(error){
        console.log(error)
        res.json({error})
    }
    })
    
    router.patch("/:id",authMiddleware,async(req,res)=>{
        try{
        const {id,title,purpose,isPrivate,isOpenCollaboration,storyToCol,colToCol,col,profile} = req.body

        let initCol = await prisma.collection.update({where:{
            id:col.id
        },data:{
            updated:new Date(),
            purpose:purpose,
            title:title,
            isPrivate,
            isOpenCollaboration
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
 

        let storyPromises = storyToCol.map(sTc=>{

            
            return prisma.storyToCollection.upsert({where:{id:sTc.id},   
                update:{
                    index:sTc.index
                },
                create:{
                   profileId:sTc.profile.id,
                   collectionId:id,
                   storyId:sTc.story.id,
                   index:sTc.index
                    }
                }
        )
        })
        let colPromises = colToCol.map(cTc=>{
            return prisma.collectionToCollection.upsert({where:{
                id:cTc.id
            },update:{
                index:cTc.index
            },create:{
                childCollectionId:cTc.childCollection.id,
                parentCollectionId:id,
                index:cTc.index,
                profileId:cTc.profile.id
            }})
        })
        let tbdStory = initCol.storyIdList.filter(sTc=>{

            let found = storyToCol.find(storyCol=>{
                 return storyCol.id === sTc.storyId
             })
             return !found
     })
     let tbdCol = initCol.childCollections.filter(sTc=>{

         let found = colToCol.find(col=>{
              return col.id === sTc.storyId
          })
          return !found
  })
 let deleteColPromises = tbdCol.map(col=>{
     return prisma.collectionToCollection.delete({where:{
         id:col.id
     }})
  })
  let deleteStoryromises = tbdStory.map(story=>{
     return prisma.storyToCollection.delete({where:{
         id:story.id
     }})
  })
        await Promise.all(deleteColPromises)
        await Promise.all(deleteStoryromises)
       await Promise.all(storyPromises)
       await Promise.all(colPromises)
       let updatedCol = await prisma.collection.findFirst({where:{
        id:col.id
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
            res.json({collection:updatedCol})
        }catch(error){
            console.log(error)
            res.json({error})
        }
    })
    router.get("/profile/private",authMiddleware,async (req,res)=>{
  
        try{
        const profile = await prisma.profile.findFirst({where:{
            userId:{
                equals: req.user.id
            }
        },include:{likedStories:true,
            historyStories:true,
            collectionHistory:true,location:true}})
        let cols = await prisma.collection.findMany({where:{
          profileId:{equals:profile.id}
        },include:{
            childCollections:{
                include:{
                    childCollection:true
                }
            },
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
        let cTcs = await prisma.roleToCollection.findMany({where:{
            profileId:{
                equals:profile.id
            }
        },include:{
            collection:{
               
                include:{
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
                }
            }
        }})
        let sTcs = await prisma.storyToCollection.findMany({where:{
            story:{
                authorId:{equals:profile.id}
            },
            collection:{
                type:{equals:"feedback"}
            }
        },include:{
            collection:{
                include:{
                    storyIdList:{
                        include:{story:true}
                    }
                }
            },profile:true
        }})
        let sTcList = sTcs.map(stc=>stc.collection)
        let list = cTcs.map(cTc=>cTc.collection)
        const colList =[...cols,...list,...sTcList]
        const uniqueById = colList.filter((obj, index, self) => 
            index === self.findIndex(item => item.id === obj.id)
        );
        
        res.json({collections:uniqueById})
    }catch(error){
        console.log(error)
        res.json({error})
    }
    })

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

        res.json({collection:data})
    }catch(error){
        res.json({error})
    }
    })
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