const express = require('express');
const prisma = require("../db");

const router = express.Router()

module.exports = function (authMiddleware){
    router.get("/",async (req,res)=>{
        try{
       let stories = await prisma.story.findMany({orderBy:{
        created:"desc"
       }, where:{
        isPrivate:{equals: false}
       }})
        res.json({stories})
    }catch(error){
        console.log({error})
        res.json({error})
    }
    })
    router.get("/collection/:id/public",async (req,res)=>{
try{
    const {id}=req.params
        let collection = await prisma.collection.findFirst({where:{id:{equals:id}}})

    if(!collection.isPrivate){
        let list = await prisma.storyToCollection.findMany({where:{
            AND:{
                collectionId:{
                    equals:id
                },
            }

        },include:{
            story:true
        }})

        res.json({list})
    }else{
        throw new Error("is Private")
    }
    }catch(error){
        res.json(error)
    }
    })
    router.get("/collection/:id/protected",authMiddleware,async (req,res)=>{
       try{
        let list = await prisma.storyToCollection.findMany({where:{
            collectionId:req.params.id
        },include:{
            story:true,
            profile:true,
            collection:true
        }})
    
        res.json({list})

    }catch(error){
        console.log("/collection/:id/protected",error)
        res.json({error})
    }
    })
    router.patch("/collection/:id/",authMiddleware,async (req,res)=>{
    
        let list = await prisma.storyToCollection.findMany({where:{
            collectionId:req.params.id
        },include:{
            story:true
        }})
    
        res.json({list})
    })
    router.get("/:id/comment/public",async (req,res)=>{

        try{
        let comments =await prisma.comment.findMany({where:{
             storyId:{
                 equals:req.params.id
             }
         },include:{profile:true}})
        
         
         res.json({comments})

        }catch(error){
            console.log(error)
            res.status(404).json({error})
        }
     })
    router.get("/:id/comment/protected",authMiddleware,async (req,res)=>{
      try{
        let comments =await prisma.comment.findMany({where:{
            storyId:{
                equals:req.params.id
            }
        },include:{profile:true}})
        console.log(comments)
        
        res.json({comments})
    }catch(error){
        console.log(error)
        res.status(404).json({error})
    }
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
        try{
        const stories = await prisma.story.findMany({where:{
            AND:{
               author:{
                id:{
                    equals: req.params.id
                }
               },
            isPrivate:{
                equals:false
                
            }
                
            }
        }})
        res.status(200).json({stories})
    }catch(error){
        res.json({error})
    }
    })
    router.get("/:id/protected",authMiddleware,async (req,res)=>{
try{
        let story = await prisma.story.findFirst({where: {
            id:req.params.id}})
        if(story){
            res.status(200).json({story})

        }else{
            res.status(404).json({message:"Story not found"})
        }

    }catch(error){
        res.status({error})
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
try{
        const {title,data,isPrivate,commentable,type}= req.body
    
        const story = await prisma.story.update({where:{
            id:req.params.id
        },data:{
            title,
            data,
            isPrivate,
            commentable,
            type,
            updated: new Date()
        }})
        res.status(200).json({story})
    }catch(error){
        return{
            error
        }
    }
    })
    router.delete("/:id",authMiddleware,async (req,res)=>{
        try{
            let story = await prisma.story.findFirst({where:{id:req.params.id}})
            if(story){
                await prisma.story.delete({where:{id:story.id}})
          
            }
            res.status(202).json({message:"Deleted Successesfully"})

        }catch(error){
            console.log(error)
            res.json({error})
        }

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