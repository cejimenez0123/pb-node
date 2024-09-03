const express = require('express');
const prisma = require("../db");


const router = express.Router()

module.exports = function (){
    router.get("/",async (req,res)=>{
        const profiles = await prisma.profile.findMany()

        res.status(200).json({data:profiles})



    })
    router.get("/:id",async (req,res)=>{
        const profile = await prisma.profile.findFirst({where:{
            id: req.params.id
        }})
        res.status(200).json({data:profile})
    })

    return router

}