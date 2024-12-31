const express = require('express');
const prisma = require("../db");
const { title } = require('process');
const { isParameter } = require('typescript');
const { connect } = require('http2');


const router = express.Router()

module.exports = function (authMiddleware){
    router.get("/",async (req,res)=>{
        //GET ALL PUBLIC COLLECTIONS
        const collection = await prisma.collection.findMany(
            {where:{isPrivate:{equals:false}}})

        res.status(200).json({data:collection})



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
                
               storyIdList:true,
               childCollections:true
            
                
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
    router.get("/profile/:id/protected",async (req,res)=>{
        try{
            let collections = await prisma.collection.findMany({where:{
                AND:{
                    profile:{
                        id:{
                            equals:req.params.id
                        }
                    }
                }
            }})
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
                    collecitonId:role.item.id
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
        const books  = 
            await prisma.collection.findMany({
                where:{
                    AND:{  
                        isPrivate:{equals:false},
                            childCollections:{
                                none:{}
                            },
                        storyIdList:{
                            some:{}
                            }
            }}
        })
        res.json({books})
    })
    router.get("/:id",async (req,res)=>{

        //GET COLLECTION
        const collection = await prisma.collection.findFirst({where:{
            id: req.params.id
        },include:{
            storyIdList:true,
            childCollections:true
        }})
        console.log("colds",collection)
        res.status(200).json({collection:collection})
    })
router.get("/:id/collection/protected",authMiddleware,async (req,res)=>{
    const {id}=req.params

    const collections =await prisma.collectionToCollection.findMany(
        {where:
            {parentCollectionId:{
                equals:id
            }
        },include:{
            childCollection:true,
            parentCollection:true,
            profile:true
        }})
   
        res.json({collections})
})
router.get("/:id/collection/public",authMiddleware,async (req,res)=>{
    const {id}=req.params

    let collections = await prisma.collectionToCollection.findMany(
        {where:
            {AND:
                [{parentCollectionId:{equals:id}},
                {childCollection:{
                    isPrivate:{
                        equals:false
                    }
                }
            }
            ]}
        ,include:{
            childCollection:true
        }})
    res.json({collections})
})
router.post("/:id/collection",authMiddleware,async (req,res)=>{
    //ADD COLLECTION TO COLLECTION
   
   try{ const {id}=req.params
    const {list}=req.body
  



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
                }
            }
        })
    })
    let joint = await Promise.all(promises)
    
    let collection = await prisma.collection.findFirst({where:{id:id},
        include:{
        storyIdList:true,
        childCollections:true
    }})
res.json({collection})
}catch(error){
    console.log({error})
    res.json(409).json({error})
}}
)
router.post("/:id/story",authMiddleware,async (req,res)=>{
    //ADD story TO COLLECTION
    const {id}=req.params
    const {list}=req.body
    let promises = list.map(childId=>{
        return prisma.storyToCollection.create({
            data:{
                story:{
                    connect:{
                        id:childId
                    }
                },
                collection:{
                    connect:{
                        id:id
                    }
                }
        
            }
        })
    })
    let joint = await Promise.all(promises)
    let col = await prisma.collection.findFirst({where:{id:id},include:{
        storyIdList:true,
        childCollections:true
    }})
    console.log(col)
    res.status(201).json({collection:col})
}
)
    router.delete("/:id/collection/:childId",async (req,res)=>{
        //REMOVE COLLECTION FROM COLLECTION
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
    res.status(204)
}
)

    router.delete("/:id/story/:storyId",async (req,res)=>{
        //DELETE STORY FROM COLLECTION
        const {storyId,id}=req.params
        await prisma.storyToCollection.deleteMany({where:{
            story:{
                id:storyId
            },
            collection:{
                id:id
            }
        }})



    })
    router.delete("/collection/",authMiddleware,async (req,res)=>{

    })
    router.delete("/:id",authMiddleware,async (req,res)=>{
        //DELETE COLLECTION
        try{
        const {id} = req.params
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
        const {storyToCol,colToCol,col} = req.body

        let initCol = await prisma.collection.findFirst({where:{
            id:col.id
        },include:{
            storyIdList:true,
            childCollections:true
        }})
 

        let storyPromises = storyToCol.map(sTc=>{
console.log(sTc)
            
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
        storyIdList:true,
        childCollections:true
    }})
    res.json({collection:updatedCol})
        }catch(error){
            console.log("collection/patch(/id",{error})
            res.json({error})
        }
    })
    router.get("/profile/private",authMiddleware,async (req,res)=>{
        //Library
        const profile = await prisma.profile.findFirst({where:{
            userId:{
                equals: req.user.id
            }
        }})
        let data = await prisma.collection.findMany({where:{
          profileId:{equals:profile.id}
        },include:{
            childCollections:true,
            storyIdList:true 
        }})
        res.json({collections:data})
    })
    router.get("/profile/:id/library",async (req,res)=>{
        //Library
        let data = await prisma.collection.findMany({where:{
           profile:{
            id: req.params.id
           }
        }})
        res.json({collection:data})
    })
    router.get("/profile/:id/book",async (req,res)=>{
        let data = await prisma.collection.findMany({where:{
           
            AND:{  
                profileId:{
                    equals:req.params.id
                }, 
                childCollections:{
                    none:{}
                }
        }}})
        res.json({collections:data})
    })
    router.put("/:id",async (req,res)=>{
     const {title,purpose,isPrivate,isOpenCollaboration}=doc
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
    })
    router.post("/",authMiddleware,async (req,res)=>{
        const doc = req.body
        const {title,purpose,isPrivate,profileId,isOpenCollaboration}=doc
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
        }})
        
        
        res.status(201).json({collection:collection})
    })

    return router

}