const express = require('express');
const prisma = require("../db");
const generateMongoId = require("./generateMongoId");
const router = express.Router()
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");

module.exports = function (authMiddleware){
    router.get("/collection/:id",authMiddleware,async(req,res)=>{
try{
          let roles= await prisma.roleToCollection.findMany({where:{
                collecitonId:{
                    equals:req.params.id
                }
            },include:{
            collection:true,
            profile:true
            }})

            res.json({roles})
        }catch(error){
            res.json({error})
        }
    })
      router.get("/story/:id",authMiddleware,async(req,res)=>{
try{
          let roles= await prisma.roleToStory.findMany({where:{
                storyId:{
                    equals:req.params.id
                }
            },include:{
            story:true,
            profile:true
            }})

            res.json({roles})
        }catch(error){
            res.json({error})
        }
    })
      router.put("/collection",authMiddleware,async(req,res)=>{
        try{
            const {roles}=req.body
          
            let updated= roles.map(role=>{

                if(role.role=="role"){
                    if(role.id){
                    return prisma.roleToCollection.delete({where:{id:role.id}})
                    }
                }else{
                    if(roles.role && roles.id.length>10){
                return prisma.roleToCollection.upsert({
                    where:{
                        id:role.id
                    },
                    update:{
                        role:role.role,
                    },
                    create:{
                        role:role.role,
                        profileId:role.profile.id,
                        collecitonId:role.colleciton.id
                    }
                   , include:{
                        colleciton:true,
                        profile:true
                    }})
                }else{
                    return prisma.roleToCollection.create({data:{
                        role:role.role,
                        profile:{
                            connect:{
                                id:role.profile.id
                            }
                        },
                        collection:{
                            connect:{
                                id:role.collection.id
                            }
                        }
                    },include:{
                        collection:true,
                        profile:true
                    }})
                }}
                })
        let newRoles = await Promise.all(updated)
        res.json({roles:newRoles.filter(role=>!!role)})

            }catch(error){
                res.json({error})
            }
    })
    router.put("/story",authMiddleware,async(req,res)=>{
        try{
            const {roles,profileId,storyId}=req.body
          
            let updated= roles.map(role=>{

                if(role.role=="role"){
                    if(role.id){
                    return prisma.roleToStory.delete({where:{id:role.id}})
                    }
                }else{
                    if(roles.role && roles.id.length>10){
                return prisma.roleToStory.upsert({
                    where:{
                        id:role.id
                    },
                    update:{
                        role:role.role,
                    },
                    create:{
                        role:role.role,
                        profileId:role.profile.id,
                        storyId:role.item.id
                    }
                   , include:{
                        story:true,
                        profile:true
                    }})
                }else{
                    return prisma.roleToStory.create({data:{
                        role:role.role,
                        profile:{
                            connect:{
                                id:role.profile.id
                            }
                        },
                        story:{
                            connect:{
                                id:role.item.id
                            }
                        }
                    },include:{
                        story:true,
                        profile:true
                    }})
                }}
                })
        let newRoles = await Promise.all(updated)
       
        res.json({roles:newRoles.filter(role=>!!role)})

            }catch(error){
                console.log(error)
                res.json({error})
            }
    })
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