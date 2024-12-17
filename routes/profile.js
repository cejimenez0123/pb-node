const express = require('express');
const prisma = require("../db");
const generateMongoId = require("./generateMongoId");
const router = express.Router()
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs")
module.exports = function (authMiddleware){
    router.get("/",async (req,res)=>{
        const profiles = await prisma.profile.findMany()

        res.status(200).json({profiles:profiles})



    })
    router.post("/",authMiddleware,async(req,res)=>{
      const  {password,username,profilePicture,selfStatement,privacy}=req.body
    try{
        const applicant = jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWT_SECRET);
        const hashedPassword = await bcrypt.hash(password, 10);
         let user = await prisma.user.update({
            where:{
                id:applicant.applicantId
            },data:{
                password:hashedPassword,
                verified:true
            }
        })
try{
   
        let profile = await prisma.profile.create({data:{
            user:{
                connect:{
                    id:user.id,
                   
                }
            },
            profilePic:profilePicture,
             username:username,
            selfStatement:selfStatement,
            isPrivate:privacy
        }})
        const verifiedToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '23h' });
        res.json({profile,token:verifiedToken})
    }catch(error){
        
        res.status(409).json({error: new Error("Username already taken")})
    }
    }catch(error){
    
        res.status(409).json({error})
    }
    
    
    
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
    router.get("/user/protected",authMiddleware,async (req,res)=>{
        try{
            console.log(res.user)
        if(req.user){
            const profiles = await prisma.profile.findMany({where:{
                user:{
                    id: req.user.id
                }
            }})
          
             
                res.status(200).json({profiles:profiles})
    
     
        }
     
    }catch(e){
        res.status(404).json({message:"User not found"})
    }
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