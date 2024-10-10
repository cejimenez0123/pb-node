const express = require('express');
const prisma = require("../db");
const generateMongoId = require("./generateMongoId")
const router = express.Router()

module.exports = function (authMiddleware){
    router.get("/",async (req,res)=>{
        const profiles = await prisma.profile.findMany()

        res.status(200).json({profiles:profiles})



    })
    router.get("/:id",async (req,res)=>{
        const profile = await prisma.profile.findFirst({where:{
            id: req.params.id
        }})
        res.status(200).json({profile:profile})
    })
    router.put("/:id",async (req,res)=>{
        const {username,profilePicture,selfStatement,privacy} = req.body
      
        const profile = await prisma.profile.update({where:{
            id: req.params.id
        },data:{
            username: username,
            profilePic:profilePicture,
            selfStatement:selfStatement,
            isPrivate:privacy
        }})
        res.json({profile})
    })
    router.get("/user/:id/public",async (req,res)=>{
       
        const profiles = await prisma.profile.findMany({where:{
            user:{
                id: req.params.id
            }
        }})
    
    res.json({profiles})
})
    router.get("/user/:id/private",authMiddleware,async (req,res)=>{
       
        const profiles = await prisma.profile.findMany({where:{
            user:{
                uId: req.user.uId
            }
        }})
        
        res.status(200).json({profiles:profiles})

    })
    router.get("/:id/collection",async (req,res)=>{

        let bookmarks = await prisma.profileToCollection.findMany({
            where:{
                profile:{
                    id: req.params.id
                }
            }
        })
        res.json({bookmarks})
    })
    router.post("/:id/collection/:colId",async (req,res)=>{
        
            const bookmark = await prisma.profileToCollection.create({
                data:{
                    collection:{
                        connect:{
                            id: req.params.colId
                        }
                    },
                    profile:{
                        connect:{
                            id:req.params.id
                        }
                    }
                }

            })

            res.json({bookmark})

    })
    return router
    
}