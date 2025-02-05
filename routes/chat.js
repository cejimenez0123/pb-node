const express = require('express');
const prisma = require("../db");
const { createLocation } = require('../utils/locationUtil');
const router = express.Router()

module.exports = function (authMiddleware){

    router.post("/:chatId/message", async (req, res) => {
        const { chatId } = req.params;
        const { senderId, content } = req.body;
      
        const message = await prisma.message.create({
          data: {
            chatId,
            senderId,
            content,
          },
        });
      
        res.json({message});
      });
      router.post("/collection/:colId", async (req, res) => {
        const { colId,isGlobal=false,name="" } = req.params;
       let collection = await prisma.collection.update({where:{
            id:colId
        },data:{
            chat:{
                create:{
                    name:name,
                    isGlobal:isGlobal
                }
            }
        },include:{
            chat:{
                
            }
        }})
      
      
      
        res.json({chat:collection.chat});
      });

return router
}