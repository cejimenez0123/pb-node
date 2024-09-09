const express = require('express');
const prisma = require("../db");
const { emit, pid } = require('process');
const crypto = require('crypto');
const { connect } = require('http2');
const { isPrivateIdentifier } = require('typescript');
const generateMongoId = require("./generateMongoId")
const router = express.Router()


module.exports = function (){
    router.get("/user/:userId/profile",async (req,res)=>{
        const {userId} = req.params
        const profiles = await prisma.profile.findMany({where:{user:{
            id:userId
        }}})
        res.status(200).json({data:profiles})
    })
    router.post("/",async (req,res)=>{
        const {id,title,data,approvalScore,privacy,profileId,commentable,type}=req.body.data
        const sId = generateMongoId(id) 
        const uId = generateMongoId(profileId)
        let pType= type
        if(type=="html/text"){
            pType="html"
        }
        let docs =  await prisma.story.create({data:{
                id:sId,
                title:title,
                data:data,
                author:{
                    connect:{
                        id:uId
                    }
                },
                approvalScore:approvalScore,
                isPrivate:privacy,
                commentable:commentable,
                type:pType
            }})
            
   
    res.json(docs)
        })
    
        // Promise.all(promises)
    
    

    return router
}

