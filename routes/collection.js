const express = require('express');
const prisma = require("../db");
const { createLocation } = require('../utils/locationUtil');
const router = express.Router()

module.exports = function (authMiddleware){
    router.get("/",async (req,res)=>{
        //GET ALL PUBLIC COLLECTIONS
        try{
        const collection = await prisma.collection.findMany(
            {where:{isPrivate:{equals:false}}})

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
            where:{
                AND:[{isPrivate:{
                    equals:false
                }},{
                    childCollections:{
                        some: {}
                    }
                }]
            }})
            res.json({libraries})
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

            res.status(204).json({isMember:false,
                                message:"Profile is not member of collection"
            })
        }
    })
    router.get("/public/book",async (req,res)=>{
        //GET ALL PUBLIC BOOKS
        try{
        const books  = 
            await prisma.collection.findMany({
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
        res.json({books})
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
            childCollections:true,
            roles:{
                include:{
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
       
        res.status(200).json({collection:collection})
    }catch(error){
    
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
    }})
    if(collection.isPrivate==false){

  
    let collections = await prisma.collectionToCollection.findMany(
        {where:
            {AND:
                [{parentCollectionId:{equals:id}}
               

            ]}
        ,include:{
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
            profile:true
        }})
    res.json({list:collections})
    }else{
        throw new Error("Private")
    }
}catch(error){
    console.log(error)
    res.json({error})
}
})
router.post("/:id/collection",authMiddleware,async (req,res)=>{
    //ADD COLLECTION TO COLLECTION
   
   try{ const {id}=req.params
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
           let collection =  await prisma.collection.update({where:{id:id},data:{
                type: "library"
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
    let joint = await Promise.all(promises)
    
    
res.json({collection})
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
    let col = await prisma.collection.findFirst({where:{id:id},include:{
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
   
    res.json({collection:col})
}catch(error){
    console.log({error})
    res.json({error})
}
}
)
    router.delete("/:id/collection/:childId",async (req,res)=>{
        //REMOVE COLLECTION FROM COLLECTION
        try{
    const {id,childId}=req.params
    const joint = await prisma.collectionToCollection.deleteMany({
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
            }
        }
    })
    let collection = await prisma.collection.findFirst({where:{id:{equals:req.params.id}}})
    res.status(204).json({collection,message:"Deleted Successfully"})
}catch(error){
    res.json({error})
}
}
)

    router.delete("/:id/story/:storyId",async (req,res)=>{
        //DELETE STORY FROM COLLECTION
        try{
        const {storyId,id}=req.params
        await prisma.storyToCollection.deleteMany({where:{
            story:{
                id:storyId
            },
            collection:{
                id:id
            }
        }})
        let collection = await prisma.collection.findFirst({where:{id:{equals:req.params.id}},include:{
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
        res.json({collection,message:"Deleted Successfully"})
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
            parentCollection:{
                id:{equals:id}
            }
        }})
        await prisma.collectionToCollection.deleteMany({where:{
            childCollection:{
                id:{equals:id}
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
                   collectionId:sTc.collection.id,
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
                parentCollectionId:cTc.parentCollection.id,
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

        let list = cTcs.map(cTc=>cTc.collection)
        const colList = [...cols,...list]

        res.json({collections:colList})
    }catch(error){
        console.log(error)
        res.json({error})
    }
    })
    // router.get("/profile/:id/library",async (req,res)=>{
    //     //Library
    //     try{
    //     let data = await prisma.collection.findMany({where:{
    //        AND:[{profile:{
    //         id: req.params.id
    //        }},{childCollections:{
    //         some:{}
    //        }}]
    //     }})
        
    //     res.json({collection:data})
    // }catch(error){
    //     res.json({error})
    // }
    // })
    // router.get("/profile/:id/book",async (req,res)=>{
    //     try{
    //     let data = await prisma.collection.findMany({where:{
           
    //         AND:{  
    //             profileId:{
    //                 equals:req.params.id
    //             }, 
    //             childCollections:{
    //                 none:{}
    //             }
    //     }}})
    //     res.json({collections:data})
    // }catch(error){
    //     res.json({error})
    // }
    // })
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
        let locale = await createLocation(location)
        console.log(locale)
        let collectionType = type
        if(collectionType!="feedback"){
            collectionType="book"
        }
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
    }catch(error){
        console.log(error)
        res.json({error})
    }
    })

    return router

}