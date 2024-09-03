const express = require('express');
const prisma = require("../db");


const router = express.Router()

module.exports = function (){
    router.get("/",async (req,res)=>{
       let stories = await prisma.story.findMany({where:{isPrivate:false}})
        res.status(200).json({data:stories})
    })
    router.get("/:id",async (req,res)=>{
        let story = await prisma.story.findFirst({where: {
            id:req.params.id}})
        res.status(200).json({data:story})
    })
    router.put("/:id", async (req,res)=>{





    })
    router.delete(":/id",async (req,res)=>{

    })
    router.post("/",async (req,res)=>{
        const doc = req.body.data
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
        res.status(201).json(story)

    })

    return router

}