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
console.log(currentUserId)
const profile = await prisma.profile.findFirst({
  where: {
    id: req.params.id
  },
  include: {
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
      
      
        // console.log(location)
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
console.log(profiles)
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
               if(!req?.user){
    return res.status(403).json({ message: "No profile found. " });
  }
  const currentProfile = req.user.profiles[0]
  const profile = await prisma.profile.findUnique({
  where: { id: currentProfile.id},
  include: {

    location:true,
    rolesToCollection: true,
    rolesToStory:true,
_count: {
      select: {
        followers: true,
        following: true
      }
    }
 
  }
});
const stories = await prisma.story.findMany({
  where: {
    OR: [
      { authorId: profile.id },
      {
        betaReaders: {
          some: { profileId: profile.id }
        }
      }
    ]
  },
  orderBy: {
    updated: "desc" // most recently updated first
  },
  take: 100 // limit to 100
});


const collections = await prisma.collection.findMany({
  where: {
    AND: [
      { type: "feedback" },
      { OR: [
          { profileId: profile.id },
          { roles: { some: { profileId: profile.id } } }
        ]
      }
    ]
  },  orderBy: {
    updated: "desc" // most recently updated first
  },
  take: 100 // limit to 100

});
console.log(profile)
res.status(200).json({
  profile: { ...profile, collections: [ ...collections],stories:[...stories] }
});

     
    }catch(error){
        console.log(
            "GET WHAT",error)
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