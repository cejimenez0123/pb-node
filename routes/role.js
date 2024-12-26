const express = require('express');
const prisma = require("../db");
const generateMongoId = require("./generateMongoId");
const router = express.Router()
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const { connect } = require('http2');
module.exports = function (authMiddleware){

    router.post("/story",authMiddleware,async(req,res)=>{
        let {type,profileId,storyId}=req.body
try{
        await prisma.roleToStory.create({data:{
            role:type,
            profile:{
                connect:{
                    id:profileId
                }
            },
            story:{
                connect:{
                    id:storyId
                }
            }
        }})
        res.json({message:"Success"})

    }catch(err){
        res.status(409).json({error:err})
    }    })

    router.post("/collection",authMiddleware,async(req,res)=>{
        let {type,profileId,collectionId}=req.body
        try{
      let role= await prisma.roleToCollection.create({data:{
            role:type,
            profile:{
                connect:{
                    id:profileId
                }
            },
            collection:{
                connect:{
                    id:collectionId
                }
            }
        },include:{
            profile:true,
            collection:true
        }})

        res.json({role})
    }catch(err){
        res.status(409).json({error:err})
    }
    })
    router.post("/collection/:id",authMiddleware,async(req,res)=>{
     
try{
       await prisma.roleToCollection.delete({where:{id:req.params.id}})

        res.json({message:"Success"})

}catch(err){
    res.status(409).json({error:err})
}
    })
    router.post("/story/:id",authMiddleware,async(req,res)=>{
        try{

        let role= await prisma.roleToStory.delete({where:{id:req.params.id}})
  
          res.json({role})
        }catch(err){
            res.status(409).json({error:err})
        }
      })
      router.patch("/collection/:id",authMiddleware,async(req,res)=>{
     
        try{
               await prisma.roleToCollection.update({where:{id:req.params.id},data:{
               role:req.body.role
               }})
        
                res.json({message:"Success"})
        
        }catch(err){
            res.status(409).json({error:err})
        }
            })
        router.patch("/story/:id",authMiddleware,async(req,res)=>{
     
                try{
                       await prisma.roleToStory.update({where:{id:req.params.id},data:{
                       role:req.body.role
                       }})
                
                        res.json({message:"Success"})
                
                }catch(err){
                    res.status(409).json({error:err})
                }
                    })
    return router

}