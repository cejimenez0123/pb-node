const express = require('express');
const prisma = require("../db");
const comment = require('./comment');



const router = express.Router()

module.exports = function (authMiddleware){



        router.post("/",authMiddleware,async(req,res)=>{

            const {follower,following}=req.body

try{

       const follow = await prisma.follow.create({data:{
            followingId:following.id,
            followerId:follower.id},include:{
                follower:true,
                following:{
                    include:{
                        followers:true,     
                    }
                }
            }})

       res.json({follow}) 

}catch(error){
    console.log(error)
    res.json({error})
}

        })

return router

}