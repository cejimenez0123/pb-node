const express = require('express');
const prisma = require("../db");
const generateMongoId = require("./generateMongoId");
const router = express.Router()
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const { connect } = require('http2');

module.exports = function (authMiddleware){
    router.post("/story",authMiddleware,async(req,res)=>{
        const {profile,story}=req.body
        try{
       let history = await prisma.userStoryHistory.create({data:{
          profile:{
            connect:{
                id: profile.id
            }
          },
          story:{
            connect:{
                id:story.id
            }
          }
    
        }})
        let updatedProfile = await prisma.profile.findFirst({where:{id:{equals:profile.id}},include:{
            likedStories:true,
            historyStories:true,
            hashtags:true,
            collections:true,
            collectionHistory:true
      
        }})
        res.json({profile:updatedProfile})
    }catch(error){
        res.json({error})
    }
    })
    router.post("/collection",authMiddleware,async(req,res)=>{
        const {profile,collection}=req.body
        try{
       let history = await prisma.userCollectionHistory.create({data:{
          profile:{
            connect:{
                id: profile.id
            }
          },
          collection:{
            connect:{
                id:collection.id
            }
          }
        }})
        let updatedProfile = await prisma.profile.findFirst({where:{id:{equals:profile.id}},include:{
            likedStories:true,
            historyStories:true,
            hashtags:true,
            collections:true,
            collectionHistory:true
      
        }})
        res.json({profile:updatedProfile})
    }catch(error){
        res.json({error})
    }
    })
  
    return router
}