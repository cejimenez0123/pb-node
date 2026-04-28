const express = require('express');
const prisma = require("../db");
const generateMongoId = require("./generateMongoId");
const { default: notifyUser } = require('../utils/notifyUser');
const router = express.Router()

module.exports = function (authMiddleware){
    // router.post("/story",authMiddleware,async(req,res)=>{
    //     const {profile,story}=req.body
    //     try{
    //    let like = await prisma.userStoryLike.create({data:{
    //       profile:{
    //         connect:{
    //             id: profile.id
    //         }
    //       },
    //       story:{
    //         connect:{
    //             id:story.id
    //         }
            
    //       }
    //     }})
    //     await prisma.story.update({where:{
    //         id:story.id,
            
    //     },data:{
    //         priority:{
    //             increment:1
    //         }
    //     }})
    //     let updatedProfile = await prisma.profile.findFirst({where:{id:{equals:profile.id}},include:{
    //         likedStories:true,
    //         historyStories:true,
    //         hashtags:true,
    //         collections:true,
    //         collectionHistory:true
      
    //     }})
    //     res.json({profile:updatedProfile})
    // }catch(error){
    //     console.log({error})
    //     res.json({error})
    // }
    // })

    router.post("/story", authMiddleware, async (req, res) => {
        const { profile, story } = req.body;
        try {
            let like = await prisma.userStoryLike.create({
                data: {
                    profile: { connect: { id: profile.id } },
                    story: { connect: { id: story.id } }
                }
            });

            await prisma.story.update({
                where: { id: story.id },
                data: { priority: { increment: 1 } }
            });

            let updatedProfile = await prisma.profile.findFirst({
                where: { id: { equals: profile.id } },
                include: {
                    likedStories: true,
                    historyStories: true,
                    hashtags: true,
                    collections: true,
                    collectionHistory: true
                }
            });

            // Notify story author about the like
            try {
                const likedStory = await prisma.story.findUnique({
                    where: { id: story.id },
                    select: { authorId: true }
                });

                if (likedStory?.authorId && likedStory.authorId !== profile.id) {
                    await notifyUser({
                        profileId: likedStory.authorId,
                        type: "LIKE",
                        title: "Someone liked your story",
                        body: `${updatedProfile.username ?? "Someone"} liked your piece`,
                        entityId: story.id,
                        actorId: profile.id,
                        route: `/story/${story.id}`
                    });
                }
            } catch (err) {
                console.error("NOTIFICATION ERROR", err);
            }

            res.json({ profile: updatedProfile });
        } catch (error) {
            console.log({ error });
            res.json({ error });
        }
    });
    router.delete("/story/like/:id",authMiddleware,async(req,res)=>{
        try{
           await prisma.userStoryLike.delete({where:{
                id:req.params.id
            }})
            let profile = await prisma.profile.findFirst({where:{id:{equals:profile.id}},include:{
                likedStories:true,
                historyStories:true,
                hashtags:true,
                collections:true,
                collectionHistory:true
          
            }})
            res.json({message:"Delete Successful",profile})
    }catch(error){
        res.json({error})
    }
    })
  
    return router
}