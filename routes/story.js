const express = require('express');
const prisma = require("../db");
const { equal } = require('assert');


const router = express.Router()

module.exports = function (authMiddleware){
    router.get("/",async (req,res)=>{
       let stories = await prisma.story.findMany({where:{
        isPrivate:{equals: false}
       }})
        res.json({stories})
    })
    router.get("/collection/:id/public",async (req,res)=>{
        let list = await prisma.storyToCollection.findMany({where:{
            AND:{
                collectionId:{
                    equals:req.params.id
                },
                story:{
                    isPrivate:false
                }
            }

        },include:{
            story:true
        }})
        res.json({list})
    })
    router.get("/collection/:id/protected",authMiddleware,async (req,res)=>{
        let list = await prisma.storyToCollection.findMany({where:{
            id:req.params.id
        },include:{
            story:true
        }})
        res.json({list})
    })
    router.get("/profile/private",authMiddleware,async (req,res)=>{
        const profile = await prisma.profile.findFirst({where:{
            userId:{
                equals:req.user.id
            } 
        }})
        const stories = await prisma.story.findMany({where:{
            author:{
                id:{equals:profile.id}
            }
        }})
        res.status(200).json({stories})
    })
    router.get("/profile/:id/public",async (req,res)=>{
        const stories = await prisma.story.findMany({where:{
            AND:{
               author:{
                id:{
                    equals: req.params.id
                }
               },
            isPrivate:{
                equal:false
                
            }
                
            }
        }})
        res.status(200).json({stories})
    })
    router.get("/:id/protected",authMiddleware,async (req,res)=>{

        let story = await prisma.story.findFirst({where: {
            id:req.params.id}})
        if(story){
            res.status(200).json({story})

        }else{
            res.status(404).json({message:"Story not found"})
        }
    })
    router.get("/:id/public",async (req,res)=>{
        let story = await prisma.story.findFirst({where: {
            id:req.params.id,isPrivate:false}})
        if(story){
                res.status(200).json({story})
    
        }else{
                res.status(404).json({message:"Story not found"})
        }
    })
    router.post("/:id/role",async (req,res)=>{
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
})
    router.put("/:id", async (req,res)=>{

        const {title,data,isPrivate,commentable,type}= req.body
    
        const story = await prisma.story.update({where:{
            id:req.params.id
        },data:{
            title,
            data,
            isPrivate,
            commentable,
            type
        }})
        res.status(200).json({story})
    })
    router.delete(":/id",async (req,res)=>{
        let story = prisma.story.delete({where:{id:req.params.id}})
        res.status(202).json({message:"success"})
    })
    router.post("/",authMiddleware,async (req,res)=>{
    // try{
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
  
    })

    return router

}