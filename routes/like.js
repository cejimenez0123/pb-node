const express = require('express');
const prisma = require("../db");
const generateMongoId = require("./generateMongoId");
const { default: notifyUser } = require('../utils/notifyUser');
const Paths = require('../utils/Paths');
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
                                const title = "Someone liked your story";
                const body  = `${updatedProfile.username ?? "Someone"} liked your piece`;
                const route = Paths.page.createRoute(story.id);

                await Promise.all([
                    notifyUser({
                        profileId: likedStory.authorId,
                        type: "LIKE",
                        title,
                        body,
                        entityId: story.id,
                        actorId: profile.id,
                        route,
                    }),
                    sendNotification(likedStory.authorId, title, body, {
                        type: "LIKE",
                        entityId: story.id,
                        actorId: profile.id,
                        route,
                    }).catch((err) =>
                        console.error("[sendNotification] LIKE failed:", err)
                    ),
                ]);
                    // await notifyUser({
                    //     profileId: likedStory.authorId,
                    //     type: "LIKE",
                    //     title: "Someone liked your story",
                    //     body: `${updatedProfile.username ?? "Someone"} liked your piece`,
                    //     entityId: story.id,
                    //     actorId: profile.id,
                    //     route: `/story/${story.id}`
                    // });
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
            const profileId = req.user.profiles[0].id;

        const like = await prisma.userStoryLike.findFirst({
            where: { id: req.params.id },
        });

        if (!like) {
            return res.status(404).json({ error: "Like not found" });
        }

        if (like.profileId !== profileId) {
            return res.status(403).json({ error: "You can only remove your own likes" });
        }

        
        await prisma.userStoryLike.delete({ where: { id: req.params.id } });

            let profile = await prisma.profile.findFirst({where:{id:{equals:profileId}},include:{
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