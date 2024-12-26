const express = require('express');
const prisma = require("../db");
const { profile } = require('console');



const router = express.Router()

module.exports = function (authMiddleware){

router.post("/",authMiddleware,async(req,res)=>{
 
 try{   const {profileId,storyId,text,parentId}=req.body
console.log(req.body)
   if(profileId.length>0){
    if(parentId.length>0 ){

    let com = await prisma.comment.create({data:{
        content:text,
        story:{
            connect:{
                id:storyId
            }
        },
        parent:{
            connect:{
                id: parentId
            }
        },
        profile:{
            connect:{
                id: profileId
            }
        }
    }})
    let comment =await prisma.comment.findFirst({where:{id:com.id},include:{profile:true}})
    res.json({comment:comment})
}else{
    let com = await prisma.comment.create({data:{
        content:text,
        story:{
            connect:{
                id:storyId
            }
        },
     
       profile:{
            connect:{
                id: profileId
            }
        }
    }})
    let comment =await prisma.comment.findFirst({where:{id:com.id},include:{profile:true}})
    res.json({comment:comment})}
}else{
    throw new Error("no profile")
}
}catch(err){
    console.log(err)
    res.status(409).json({error:err})
}
})

router.delete("/:id",authMiddleware,async (req,res)=>{
    const {profile}=req.body
    const { id}= req.params
    try{
    let comment = await prisma.comment.findFirst({where:{
        id:id
    }})
    if(comment.profileId==profile.id && profile.userId == req.user.id){

        await prisma.comment.delete({where:{id:id}})
        res.json({message:"Deleted Succesfully"})
    }else{
        res.status(403).json({message:"Unauthorized"})
    }
    }catch(err){
        console.log(err)
        res.status(409).json({error:err})
    }}
)
router.patch("/:id",authMiddleware,async(req,res)=>{

    const {text,profile}=req.body
    const { id}= req.params
    try{
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
}catch(err){
    console.log(err)
    res.status(409).json({error:err})
}
}
)
return router
}