const express = require('express');
const prisma = require("../db");



const router = express.Router()

module.exports = function (authMiddleware){

router.post("/",authMiddleware,async(req,res)=>{
    const {text,profile}=req.body
    let com = await prisma.comment.create({data:{
        text:text,
        profile:{
            connect:{
                id: profile.id
            }
        }
    }})

    res.json({comment:com})
})
}
router.delete("/:id",authMiddleware,async (req,res)=>{
    const {profile}=req.body
    const { id}= req.params
    let comment = await prisma.comment.findFirst({where:{
        id:id
    }})
    if(comment.profileId==profile.id && profile.userId == req.user.id){

        await prisma.comment.delete({where:{id:id}})
        res.json({message:"Deleted Succesfully"})
    }else{
        res.status(403).json({message:"Unauthorized"})
    }
})
router.patch("/:id",authMiddleware,async(req,res)=>{
    const {text,profile}=req.body
    const { id}= req.params
    let comment = await prisma.comment.findFirst({where:{
        id:id
    }})
    if(comment.profileId==profile.id && profile.userId == req.user.id){

    
    let com = await prisma.comment.create({data:{
        text:text,
        profile:{
            connect:{
                id: profile.id
            }
        }
    }})
    res.json({comment:com})
    }else{
        res.status(403).json({message:"Unauthorized"})
    }

})
