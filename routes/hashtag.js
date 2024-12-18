const express = require('express');
const prisma = require("../db");
const { equal } = require('assert');
const { connect } = require('http2');


const router = express.Router()

module.exports = function (authMiddleware){


    router.post("/story/:storyId",authMiddleware,async(req,res)=>{
            const {name}=req.body
            let hashtag = await prisma.hashtag.create({data:{
                name:name
            }})
            const hs = await prisma.hashtagStory.create({data:{
                hashtag:{
                    connect:{
                        id: hashtag.id
                    }
                },
                story:{
                    connect:{
                        id:req.params.storyId
                    }
                }
            },include:{
                story:true,
                hashtag:true
            }})
            res.json({hashtag:hs})
    })
    router.delete("/:id",authMiddleware,async(req,res)=>{
            await prisma.hashtagStory.delete({where:{
                id:{
                    equal:req.params.id
                }
            }})
        res.json({message:"Deleted Successfully"})
})

    return router
}