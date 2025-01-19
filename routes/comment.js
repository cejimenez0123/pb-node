const express = require('express');
const prisma = require("../db");
const { profile } = require('console');
const updateWriterLevelMiddleware = require('../middleware/updateWriterLevelMiddleware');



const router = express.Router()

module.exports = function (authMiddleware){
    let middlewareArr =[authMiddleware,updateWriterLevelMiddleware]
router.post("/",...middlewareArr,async(req,res)=>{
 
 try{   const {profileId,storyId,text,parentId}=req.body
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
    },include:{
        profile:true
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
    const {user}=req.user
    const { id}= req.params
    try{
    let comment = await prisma.comment.findFirst({where:{
        id:id
    },include:{
        profile:true
    }})
    if(comment.profile.userId==user.id){

        await prisma.comment.delete({where:{id:id}})
        res.json({comment,message:"Deleted Succesfully"})
    }else{
        res.status(403).json({message:"Unauthorized"})
    }
    }catch(err){
        console.log(err)
        res.status(409).json({error:err})
    }}
)
router.patch("/:id",authMiddleware,async(req,res)=>{

    const {text}=req.body
    const { id}= req.params
    try{
    let comment = await prisma.comment.findFirst({where:{
        id:id
    },include:{
        profile:true
    }})
    if(comment.profile.userId==req.user.id){

    
    let com = await prisma.comment.update({where:{
        id:id
    },data:{
    content:text,
    updated:new Date()
    },include:{
        profile:true
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