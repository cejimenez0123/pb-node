const express = require('express');
const prisma = require("../db");


const router = express.Router()

module.exports = function (authMiddleware){
    router.get("/",async (req,res)=>{
       let stories = await prisma.story.findMany({where:{
        isPrivate:{equals: false}
       }})
        res.status(200).json({stories})
    })
    router.get("/profile/:id",async (req,res)=>{
        const stories = await prisma.story.findMany({where:{
            author:{
                id: req.params.id
            }
        }})
        res.status(200).json({stories})
    })
    router.get("/:id",async (req,res)=>{
        let story = await prisma.story.findFirst({where: {
            id:req.params.id}})
        res.status(200).json({story})
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

        const {title,data,isPrivate,commentable,type}= req.body.data

        const story = await prisma.story.update({where:{
            id:req.params.id,
            data:{
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
        }}}) 
        res.status(200).json(story)
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