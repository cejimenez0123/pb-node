const express = require('express');
const prisma = require("../db");
const { profile } = require('console');
const updateWriterLevelMiddleware = require('../middleware/updateWriterLevelMiddleware');
const { default: notifyUser } = require('../utils/notifyUser');
// const notifyUser = require('../utils/notifyUser');



const router = express.Router()

module.exports = function (authMiddleware){
    let middlewareArr =[authMiddleware,updateWriterLevelMiddleware]
router.post("/",...middlewareArr,async(req,res)=>{
 
 try{   const {profileId,storyId,text,parentId}=req.body
    const currentuser = req.user.profiles[0]
    // if(parentId.length>0 ){

   let com =  parentId?await prisma.comment.create({data:{
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
    }}):await prisma.comment.create({data:{
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
    },include:{
        profile:true
    }})
    let comment =await prisma.comment.findFirst({where:{id:com.id},include:{profile:true}})
      await notifyUser({
    profileId: profileId,
    type: 'COMMENT',
    title: 'New feedback on your piece',
    body: 'Someone left a comment',
    entityId: comment.id,
    actorId: currentuser.id
  })
    res.json({comment:comment})

}catch(err){
    console.log(err)
    res.status(409).json({error:err})
}
})

router.delete("/:id",authMiddleware,async (req,res)=>{
    const user=req.user
    const { id}= req.params
    try{
    let comment = await prisma.comment.findFirst({where:{
        id:id
    },include:{
        profile:true
    }})
    
    if(comment.profile.userId==user.id){    
        await prisma.hashtagComment.deleteMany({where:{
            commentId:{
                equals:id
            }
        }})
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
router.get("/helpful",async(req,res)=>{
    try{
        const comments = await prisma.comment.findMany({where:{hashtags:{
            some:{}
        }},include:{
            hashtags:true
        }})
       let sorted = comments.sort((a,b)=>{
            return b.hashtags.length-a.hashtags.length
        })
        res.json({comments:sorted})
    }catch(error){
        res.json({error})
    }
})
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