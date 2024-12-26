const express = require('express');
const prisma = require("../db");
const comment = require('./comment');



const router = express.Router()

module.exports = function (authMiddleware){

    router.get("/",async(req,res)=>{

      let hashtags = await prisma.hashtag.findMany()
      res.json({hashtags})
    })
    router.post("/story/:storyId",authMiddleware,async(req,res)=>{
            const {name,profileId}=req.body
            try{
                let hashtag = await prisma.hashtag.findFirst({where:{name:{equals:name}}})
               if(hashtag){
                const hs = await prisma.hashtagStory.create({
                    data:{
                        profile:{
                            connect:{id:profileId.id}
                        },
                        story:{connect:{id:req.params.storyId}},
                        hashtag:{
                            connect:{id:hashtag.id}
                        },
                    hashtagId:hashtag.id}}
                        )
                res.json({hashtag:hs})
               }else{
                let hashtag = await prisma.hashtag.create({data:{
                    name:name
                }})
               }
               const hs = await prisma.hashtagStory.create({
                data:{
                    profile:{
                        connect:{id:profileId.id}
                    },
                    story:{connect:{id:req.params.storyId}},
                    hashtag:{
                        connect:{id:hashtag.id}
                    },
                hashtagId:hashtag.id}}
                    )
            res.json({hashtag:hs})
            }catch(err){
                console.log(err)
                res.status(409).json({error:err})
            }
         
    })
    router.get("/profile/:profileId/comment",authMiddleware,async(req,res)=>{
        try{     
        let hashtags = await prisma.hashtagComment.findMany({where:{
                    profileId:{equals:req.params.profileId}
                },include:{
                    hashtag:true,
                    comment:true,
                    profile:true
                }})

                res.json({hashtags})

        }catch(err){
                console.log(err)
                res.status(409).json({error:err})
        }
    })
    router.post("/comment/:id",authMiddleware,async(req,res)=>{
        const {name,profileId}=req.body
        try{
        let hashtag = await prisma.hashtag.findFirst({where:{name:{equals:name}}})
        if(hashtag){
            const hs =  await prisma.hashtagComment.create({data:
                {profile:{connect:{id:profileId}},
            comment:{connect:{id:req.params.id}},
        hashtag:{
           connect:{
            id: hashtag.id
           }
        }},include:{
            hashtag:true,
            comment:true,
            profile:true
        }})
                
    
            res.json({hashtag:hs})
        }else{
            let hashtag = await prisma.hashtag.create({data:{
                name:name
            }})
            const hs =  await prisma.hashtagComment.create({data:
                {profile:{connect:{id:profileId}},
            comment:{connect:{id:req.params.id}},
        hashtag:{
           connect:{
            id: hashtag.id
           }
        }},include:{
            profile:true,
            comment:true,
            hashtag:true
        }})
                
        
            res.json({hashtag:hs})
        }
        
    }catch(err){
        console.log(err)
        res.status(409).json({error:err})
    }
})
    router.delete("/story/:id",authMiddleware,async(req,res)=>{
        try{
            await prisma.hashtagStory.delete({where:{
                id:{
                    equal:req.params.id
                }
            }})
        res.json({message:"Deleted Successfully"})
    }catch(err){
        res.status(409).json({error:err})
    }
})
router.delete("/comment/:hashtagCommentId",authMiddleware,async(req,res)=>{
    try{
    await prisma.hashtagComment.delete({where:{
       id:req.params.hashtagCommentId
    }})

    res.json({message:"Deleted Successfully"})
}catch(err){
    console.log(err)
    res.status(409).json({error:err})
}

})

    return router
}