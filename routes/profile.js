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
    router.get("/:id",async (req,res)=>{
        try{
        
        const profile = await prisma.profile.findFirst({where:{
            id: req.params.id
        },include:{
            likedStories:true,
            historyStories:true,
            collectionHistory:true,
            followers:true,
            following:true
         
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
            user:{
                id: req.params.id
            }
        },include:{   likedStories:true,
            historyStories:true,
            collectionHistory:true,
            collections:true,
            followers:true,
            following:true,
            stories:true}})
    
    res.json({profiles})
}catch(err){
    console.log(err)
    res.status(409).json({error:err})
    }
})

    router.get("/:id/alert",authMiddleware,async(req,res)=>{
  try{
        console.log(req.user)
        console.log(req.body)
        const profile = await prisma.profile.findFirst({where:{
            id:{
                equals:req.user.profiles[0].id
            }
        },include:{
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
          
            following:{
                
                include:{
                    following:{
                        include:{
                        
                            stories:{
                                where:{
                                    OR:[{betaReaders:{
                                        some:{
                                            profileId:req.user.profiles[0].id
                                        }
                                    }},{
                                    isPrivate:{
                                        equals:false
                                    }}]
                                },
                                
                            },
                            storyToCollections:{
                              include:{
                                collection:{        
                                    include:{
                                            storyIdList:{
                                                include:{
                                                    story:{
                                                        where:{
                                                            betaReaders:{
                                                                some:{
                                                                    profileId:req.user.profiles[0].id
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            roles:{
                                                some:{
                                                    
                                                    profileId:{
                                                        equals:req.user.profiles[0.]
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                              }
                            ,
                           
                            likedStories:{
                                where:{
                                story:{
                                    isPrivate:{
                                        equals:false
                                    }
                                }
                            }},
                            
                    
                        }
                    }
                }},
            stories:{
                include:{
                    comments:{
                        include:{
                            story:true,
                            children:true
                        }
                    }
                }
            
        }}})

                profile.following.map(follow=>{
    
                   let stories = follow.following.stories.filter(story=>{
                        if(story.updated){
                          return  new Date(story.updated)>= new Date("1-1-2025")
                        }
                        if(story.created){
                            let date = new Date(story.created)
                           return date >= new Date("1-1-2025")
                        }
                       return false
                        
                    })
                    
                })
              const filteredCollections =  profile.rolesToCollection.filter(rTc=>
                rTc.collection.storyIdList.length>0

              ).map((rTc=>{
             
                    let stcs =rTc.collection.storyIdList.filter(stc=>{
                        if(stc.story){
                            let date = new Date(stc.story.created)
                            if(stc.story.updated){
                                new Date(stc.story.updated)
                            }
                            return date >= new Date("1-1-2025")
                        }else{
                            return false
                        }
                     
                      
                     
                    })
                
                    return {
                        collection:rTc.collection,
                        stories:stcs
                    }
                })).filter(col=>col.stories.length>0)
        const filteredStories = profile.stories.map((story) => {
              const comments = story.comments.filter(
                (comment) => new Date(comment.created) >= new Date("1-1-2025")
          
          
              )
            return {story,comments}
            }
        
            ).filter(filtered=>filtered.comments.length>0)
     
        if(profile){

           await prisma.profile.update({where:{
                id:profile.id,
                
            },data:{
                lastNotified: new Date()
            }})
        }
    
        res.json({collections:filteredCollections,stories:filteredStories})
    }catch(err){
        console.log(err)
        res.json({error:err})
    }
    })
    router.get("/user/protected",authMiddleware,async (req,res)=>{
        try{
      
        if(req.user){

            const profile = await prisma.profile.findFirst({where:{
                id:{
                   equals: req.user.profiles[0].id
                }
            },include:{
              
                profileToCollections:{
                    include:{
                        collection:true
                    }
                },
                likedStories:true,
                collections:true,
                stories:true,
                location:true,
                followers:true,
                following:true
            }})
          
             
                res.status(200).json({profile:profile})
    
     
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