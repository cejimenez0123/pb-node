const express = require('express');
const prisma = require("../db");
const generateMongoId = require("./generateMongoId");
const router = express.Router()
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs")
module.exports = function (authMiddleware){
    router.get("/",async (req,res)=>{
        const profiles = await prisma.profile.findMany()
        res.status(200).json({profiles:profiles})
    })
    router.post("/",async(req,res)=>{
        const  {email,password,username,profilePicture,selfStatement,privacy}=req.body
        try{
           
            const decoded = jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWT_SECRET);
    
            if(decoded.applicantId){
            const hashedPassword = await bcrypt.hash(password, 10);
               const user = await prisma.user.update({
                where:{
                  id:decoded.applicantId
                },data:{
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
        
           
            followers:true,
            following:true
         
        }})
        res.status(200).json({profile:profile})

    }catch(err){
     
        res.status(409).json({error:err})
    }
    })
    router.get("/:id",async (req,res)=>{
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
           
            followers:true,
           
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
       }})
   

res.json({profiles})
}catch(err){
console.log(err)
res.status(409).json({error:err})
}
})

router.get("/:id/alert",authMiddleware,async(req,res)=>{
try{
    const profId =req.user.profiles[0].id
   const profile = req.user.profile
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
        story:true
    }})

            
     
 

   
    res.json({collections,comments,following,followers})
    }catch(err){
        console.log(err)
        res.json({error:err})
    }
    })
    router.get("/user/private",authMiddleware,async (req,res)=>{
        try{
      
        if(req.user){

            const profile = await prisma.profile.findFirst({where:{
                id:{
                   equals: req.user.profiles[0].id
                }
            },include:{
              
                profileToCollections:{
                    include:{
                        collection:{
                            include:{
                                childCollections:{
                                    select:{
                                        childCollectionId:true
                                    }
                                },
                                storyIdList:{
                                    select:{
                                        storyId:true
                                    }
                                }
                            }
                        }
                    }
                },
                likedStories:true,
                collections:true,
                stories:true,
                location:true,
                followers:{
                    include:{
                        follower:true
                    }
                },
                following:true
            }})
          
             
                res.status(200).json({profile:profile})
    
     
        }else{
            res.status(404).json({message:"User not found"})
        }
     
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