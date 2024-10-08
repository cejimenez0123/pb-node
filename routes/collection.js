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
                collectionIdList:true
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
    router.get("/public/library",async (req,res)=>{
        // GETS ALL LIBRARIES
        try{
        const libraries = await prisma.collection.findMany({
            where:{
                AND:{  
                isPrivate:{equals:false},
                collectionIdList:{
                    some:{}
                },
                storyIdList:{
                    some:{}
                }

            }}
        })
        res.json({libraries})
    }catch(e){
        console.log("/collection/library",e)
        res.json({error:e})
        }
    })
    router.post("/:id/role",async (req,res)=>{
            const {profileId,role} = req.body
         let roleToCollection = await prisma.roleToCollection.create({data:{
            colleciton:{
                connect:{
                    id:req.params.id,
                }},
            profile:{
                connect:{
                    id: profileId
                }
            },
            role:role
          }})  
        res.json({role:roleToCollection})
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
        const books  = await prisma.collection.findMany({
            
            where:{
                AND:{  
                isPrivate:{equals:false},
                collectionIdList:{
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
            collectionIdList:true
        }})
        res.status(200).json({collection:collection})
    })
    router.post("/:id/collection/:childId",authMiddleware,async (req,res)=>{
        //ADD COLLECTION TO COLLECTION
        const {id,childId}=req.params
        const joint = await prisma.collectionToCollection.create({
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
        res.status(201).json({data: joint})
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
    router.post("/:id/story",authMiddleware,async (req,res)=>{
//ADD STORY TO COLLECTION
        const {id,storyIdList}= req.params
        let promises = storyIdList.map( id=>{
            return prisma.storyToCollection.create({
                data:{
                        collection:{connect:{id:req.params.id}},
                        story:{connect:{id:storyId}}
                    }
            })
        })
        Promise.all(promises)
        const collection = await prisma.collection.findFirst({where:{id:id},include:{
            storyIdList:true
        }})
        return {collection}
    })
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
    router.delete("/:id",async (req,res)=>{
        //DELETE COLLECTION
        const doc = req.body.data
        const {id}= doc
        await prisma.collectionToCollection.delete({where:{
            parentCollectionId: id
        }})
        await prisma.storyToCollection.delete({where:{
            collectionId: id
        }})
        await prisma.collection.delete({where:{
            id: id
        }})
     
        res.status(202).json({message:"success"})
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
                collectionIdList:{
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
        const doc = req.body.data
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
        
        
        res.status(201).json({colelction:collection})
    })

    return router

}