const express = require('express');
const prisma = require("../db");
const { title } = require('process');
const { isParameter } = require('typescript');


const router = express.Router()

module.exports = function (){
    router.get("/",async (req,res)=>{
        const collection = await prisma.collection.findMany(
            {where:{isPrivate:{equals:false}}})

        res.status(200).json({data:collection})



    })
    router.get("/library",async (req,res)=>{
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
    router.get("/book",async (req,res)=>{
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
        const collection = await prisma.collection.findFirst({where:{
            id: req.params.id
        },include:{
            storyIdList:true,
            collectionIdList:true
        }})
        res.status(200).json({data:collection})
    })
    router.post("/:id/collection/:childId",async (req,res)=>{
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
    router.post("/:id/story/:storyId",async (req,res)=>{

        const {id,storyId}= req.params

        const joint = await prisma.storyToCollection.create({
        data:{
            collection:{connect:{id:id}},
            story:{connect:{id:storyId}}
        }
        })
        res.status(201).json({data:joint})


    })
    router.delete("/:id/story/:storyId",async (req,res)=>{
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
        const doc = req.body.data
        const {id}= doc
        await prisma.collection.delete({where:{
            id: id
        }})
        res.status(202).json({message:"success"})
    })
    router.post("/",async (req,res)=>{
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
        
        
        res.status(201).json({data:collection})
    })

    return router

}