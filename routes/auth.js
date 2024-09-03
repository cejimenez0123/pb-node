const express = require('express');
const prisma = require("../db");
const { emit, pid } = require('process');
const crypto = require('crypto');
const { connect } = require('http2');

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
       
   
    res.json(docs)
        })
    
        // Promise.all(promises)
    
    

    return router
}

