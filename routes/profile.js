const express = require('express');
const prisma = require("../db");

const generateMongoId = require("./generateMongoId")
const router = express.Router()

module.exports = function (){
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
    router.get("/user/:id",async (req,res)=>{
        const profiles = await prisma.profile.findMany({where:{
            user:{
                id: generateMongoId(req.params.id)
            }
        }})
        console.log(profiles)
        res.status(200).json({profiles:profiles})

    })
    return router

}