const express = require('express');
const prisma = require("../db");


const router = express.Router()

module.exports = function (){
    router.get("/",async (req,res)=>{
        const collection = await prisma.collection.findMany({where:{isPrivate:false}})

        res.status(200).json({data:collection})



    })
    router.get("/:id",async (req,res)=>{
        const collection = await prisma.collection.findFirst({where:{
            id: req.params.id
        }})
        res.status(200).json({data:collection})
    })
    router.post("/:id")

    return router

}