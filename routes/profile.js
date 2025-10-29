const express = require('express');
const prisma = require("../db");
const generateMongoId = require("./generateMongoId");
const router = express.Router()
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs")
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
        const profiles = await prisma.profile.findMany()
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
             username:username,
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
    router.get("/:id/protected",async (req,res)=>{
        try{
        
        const profile = await prisma.profile.findFirst({where:{
            id: req.params.id
        },include:{
        
           
            followers:{
                include:{
                    follower:true
                }
            },
            following:true
         
        }})
        res.status(200).json({profile:profile})

    }catch(err){
     
        res.status(409).json({error:err})
    }
    })
    router.get("/:id/public",async (req,res)=>{
        try{
        
        const profile = await prisma.profile.findFirst({where:{
            id: req.params.id
        },include:{
            stories:{
                where:{isPrivate:{equals:false}}
            },
            collections:{
                where:{isPrivate:{equals:false}}
            },
           
            followers:{
                include:{
                    follower:true
                }
            },
           
        }})
        res.status(200).json({profile:profile})

    }catch(err){
     
        res.status(409).json({error:err})
    }
    })

    router.put("/:id",authMiddleware,async (req,res)=>{
        const {username,profilePicture,selfStatement,privacy} = req.body
      try{
        const profile = await prisma.profile.update({where:{
            id: req.params.id
        },data:{
            username: username,
            profilePic:profilePicture,
            selfStatement:selfStatement,
            isPrivate:privacy
        },include:{
            likedStories:true,
            historyStories:true,
            collectionHistory:true,
            collections:true,
            stories:true,
            followers:true
        }})
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
    let userId = req.user.id
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
router.get("/:id/alert",authMiddleware,async(req,res)=>{
try{
    const profId =req.user.profiles[0].id

   let collections =  await prisma.collection.findMany({where:{
        roles:{
            some:{
                profileId:{
                    equals:profId
                }
            }
        },
        type:{
            not:"feedback"
        }
    
    },
            include:{
                profile:true,
                roles:{
                    where:{
                        profileId:{
                            equals:profId
                        }
                    }
                },
                childCollections:{
                    include:{
                        childCollection:{
                            include:{
                                profile:true
                            }
                        }
                    },
                   where:{
                    
                    childCollection:{
                      
                        OR:[{isPrivate:{
                            equals:false
                        }},{roles:{
                            some:{
                                profileId:{
                                    equals:profId
                                }
                            }
                        }}]

                    }
                   }
                },
                storyIdList:{
                    where:{
                        story:{
                            updated:{
                                gte:new Date(req.user.profiles[0].lastNotified)
                            }
                        }
                    },
                    include:{
                        story:{
                            include:{
                                author:true
                            }
                        }
                    }
                }
            
    }})
    const following = await prisma.follow.findMany({where:{
        followerId:{
            equals:profId
        }
    },include:{
    following:{
        include:{
            stories:{where:{
               AND:[{OR:[{
                betaReaders:{
                    some:{
                        profileId:{
                            equals:profId
                        }
                    }
                }},{isPrivate:false}]
            },{
                created:{gte:new Date("1-1-2025")}
            }],
            collections:{
                every:{
                    collection:{
                        OR:[
                            {
                                roles:{
                                    some:{
                                        profileId:{
                                            equals:profId
                                        }
                                    }  
                                }
                            },
                            {isPrivate:{
                                equals:false
                            }}
                        ]
                       
                    }
                
            }
    }}}}}}})
   let followers= await prisma.follow.findMany({where:{
        followingId:{
            equals:profId
        }
    },include:{
        follower:true
    }})
    let comments = await prisma.comment.findMany({where:{
        AND:[{story:{
            authorId:{
                equals:profId
            }
        }},{updated:{
            gte:new Date("1-1-2025")
        }}]
    },include:{
        profile:true,
        story:{
            include:{
                author:true
            }
        }
    }})

            
     
 

   
    res.json({collections,comments,following,followers})
    }catch(err){
        console.log(err)
        res.json({error:err})
    }
    })
    router.get("/protected",authMiddleware,async (req,res)=>{
        try{
            console.log(req.user)
            const profile = await prisma.profile.findFirst({where:{
                id:{
                   equals: req.user.profiles[0].id
                }
            },include:{
              
                profileToCollections:{
                
                    include:{
                        
                        collection:{
                            include:{
storyIdList:true,
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
                        },
                    }
                       
                
        }}},likedStories:true,
        historyStories:true,
        collections:true,
        stories:true,
        location:true,
        followers:{
            include:{
                follower:true
            }
        },
        following:true}})
          
             
                res.status(200).json({profile:profile})
    
     
     
    }catch(error){
        console.log({error})
        res.status(404).json({message:"User not found"})
    }
    })
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