const express = require('express');
const prisma = require("../db");
const comment = require('./comment');



const router = express.Router()

module.exports = function (authMiddleware){

    router.get("/",async(req,res)=>{

      let hashtags = await prisma.hashtag.findMany()
      res.json({hashtags})
    })
    router.post("/collection/:colId",authMiddleware,async(req,res)=>{
        const {name,profile}=req.body
        const collection = await prisma.collection.findFirst({where:{
            id:{
                equals:req.params.colId
            }
        },include:{
            hashtags:true
        }})
        try{
            let hashtag = await prisma.hashtag.findFirst({where:{name:{equals:name}}})
            if(hashtag){
                let found = await prisma.hashtagCollection.findFirst({where:{
                    AND:[{hashtagId:{
                        equals:hashtag.id
                    }},{collectionId:{equals:req.params.colId}},{profileId:{
                        equals:profile.id
                    }}]
                }})
       

        if(!found ){
                if(collection.hashtags.length<5){
            let hs = await createHashCollection(hashtag,profile,collection.id)
                
            res.json({hashtag:hs})

                }else{
                    res.json({message:"Max User Hashtags"})
                }}else{
                   
                    res.json({message:"Already Exists"})
                   
                }
            }else{
             
                if(collection.hashtags.length<5){ 
          const newHashtag = await prisma.hashtag.create({data:{
                name:name
            }})
               
           const hs = await createHashCollection(newHashtag,profile,req.params.colId)

        res.json({hashtag:hs}) 
    
    }else{
        res.json({message:"Max User Hashtags"})
        }
    }
        }catch(err){
            console.log(err)
            res.status(409).json({error:err})
        }
     
})
    router.post("/story/:storyId",authMiddleware,async(req,res)=>{
            const {name,profile}=req.body
            const story = await prisma.story.findFirst({where:{
                id:{
                    equals:req.params.storyId
                }
            },include:{
                hashtags:true
            }})
            try{
                let hashtag = await prisma.hashtag.findFirst({where:{name:{equals:name}}})
                if(hashtag){
                    let found = await prisma.hashtagStory.findFirst({where:{
                        AND:[{hashtagId:{
                            equals:hashtag.id
                        }},{storyId:{equals:req.params.storyId}},{profileId:{
                            equals:profile.id
                        }}]
                    }})
           

            if(!found ){
                    if(story.hashtags.length<5){
                let hs = await createHashStory(hashtag,profile,story.id)
                    
                res.json({hashtag:hs})

                    }else{
                        res.json({message:"Max User Hashtags"})
                    }}else{
                       
                        res.json({message:"Already Exists"})
                       
                    }
                }else{
                 
                    if(story.hashtags.length<5){ 
              const newHashtag = await prisma.hashtag.create({data:{
                    name:name
                }})
                   
               const hs = await createHashStory(newHashtag,profile,req.params.storyId)
 
            res.json({hashtag:hs}) 
        
        }else{
            res.json({message:"Max User Hashtags"})
            }
        }
            }catch(err){
                console.log(err)
                res.status(409).json({error:err})
            }
         
    })
    async function createHashStory(hashtag,profile,storyId){
        const hs = await prisma.hashtagStory.create({
            data:{
            profile:{connect:{
                id:profile.id
            }},
        hashtag:{connect:{
            id:hashtag.id
        }},
    story:{
        connect:{
            id:storyId
        }
    }},include:{
                hashtag:true,
                story:true,
                profile:true
            }}
                )
                return hs
    }
    async function createHashCollection(hashtag,profile,colId){
        const hs = await prisma.hashtagCollection.create({
            data:{
            profile:{connect:{
                id:profile.id
            }},
        hashtag:{connect:{
            id:hashtag.id
        }},
    collection:{
        connect:{
            id:colId
        }
    }},include:{
                hashtag:true,
                collection:true,
                profile:true
            }}
                )
                return hs
    }
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
    router.get("/story/:storyId/protected",authMiddleware,async (req,res)=>{
            
        try{
            let hashtags = await prisma.hashtagStory.findMany({where:{
                storyId:{
                    equals:req.params.storyId
                }
            },include:{hashtag:true}})
            res.json({hashtags})
        }catch(error){
            console.log(error)
            res.status(409).json({error})
        }
    })
    router.get("/collection/:colId/protected",authMiddleware,async (req,res)=>{
            
        try{
            let hashtags = await prisma.hashtagCollection.findMany({where:{
                collectionId:{
                    equals:req.params.colId
                }
            },include:{hashtag:true}})
            res.json({hashtags})
        }catch(error){
            console.log(error)
            res.status(409).json({error})
        }
    })
    router.get("/collection/:colId/protected",authMiddleware,async (req,res)=>{
            
        try{
            let hashtags = await prisma.hashtagCollection.findMany({where:{
                collectionId:{
                    equals:req.params.colId
                }
            },include:{hashtag:true}})
            res.json({hashtags})
        }catch(error){
            console.log(error)
            res.status(409).json({error})
        }
    })
    router.get("/story/:storyId/public",async (req,res)=>{
       try{
        let story = await prisma.story.findFirst({where:{
            id:{equals:req.params.storyId}
        }})
        if(!story.isPrivate){
            let hashtags = await prisma.hashtagStory.findMany({where:{
                storyId:{equals:req.params.storyId}
            }})
            res.json(hashtags)
        }else{
            throw new Error("Missing Access")
        }


    }catch(error){
        res.status(409).json({error})
    }
      
    })
    router.delete("/story/:id",authMiddleware,async(req,res)=>{
        try{
            await prisma.hashtagStory.delete({where:{
                id:req.params.id
            }})
        res.json({message:"Deleted Successfully"})
    }catch(err){
        console.log({err})
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
    console.log({error:err})
    res.status(409).json({error:err})
}

})

    return router
}