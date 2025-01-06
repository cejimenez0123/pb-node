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
        router.delete("/:id",authMiddleware,async(req,res)=>{

            const id = req.params.id

try{
      let follow = await prisma.follow.findFirst({where:{
            id:{equals:id}
        }})
       if(follow){await prisma.follow.delete({where:{
        id:id
       }})

    }
    console.log(req.user)
       let profile = await prisma.profile.findFirst({where:{
        id: {equals:req.user.profiles[0].id}
       },include:{
        followers:true
       }})
    
       res.json({profile}) 

}catch(error){
    console.log(error)
    res.json({error})
}

        })

return router

}