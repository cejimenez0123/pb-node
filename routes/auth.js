const express = require('express');
const prisma = require("../db");
const { emit, pid } = require('process');
const crypto = require('crypto');
const { connect } = require('http2');
const { isPrivateIdentifier } = require('typescript');

const router = express.Router()

function generateMongoId(firestoreId) {
    const hash = crypto.createHash('sha1').update(firestoreId).digest();
  
    // Use the first 12 bytes (96 bits) from the hash to create a MongoDB ObjectID
    const mongoObjectId = hash.toString('hex').substring(0, 24);
  
    return mongoObjectId; }
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

