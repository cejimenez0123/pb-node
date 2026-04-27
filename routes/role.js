const express = require('express');
const prisma = require("../db");
const generateMongoId = require("./generateMongoId");
const router = express.Router()
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const getStory = require('../utils/getstory');

module.exports = function (authMiddleware){
    router.get("/collection/:id",authMiddleware,async(req,res)=>{
try{
          let roles= await prisma.roleToCollection.findMany({where:{
                collectionId:{
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
    router.put("/collection", authMiddleware, async (req, res) => {
  try {
    const { roles = [] } = req.body;

    const ops = roles.map((role) => {
      // DELETE
      if (role.role === "none" && role.id) {
      return prisma.roleToCollection.deleteMany({
  where: { id: role.id },
});
      }

      // UPDATE (existing role)
      if (role.id) {
       
        return prisma.roleToCollection.upsert({
          where: { id: role.id },
          update: {
            role: role.role,
          },
          create: {
            role: role.role,
            profileId: role.profile.id,
            collectionId: role.item.id,
          },
          include: {
            collection: true,
            profile: true,
          },
        });
      }

      // CREATE (new role)
   if(role.role!="none"){
    
    return prisma.roleToCollection.upsert({
  where: {
    profileId_collectionId: {
      profileId: role.profile.id,
      collectionId: role.item.id,
    },
  },
  update: {
    role: role.role,
  },
  create: {
    role: role.role,
    profile: {
      connect: { id: role.profile.id },
    },
    collection: {
      connect: { id: role.item.id },
    },
  },
  include: {
    collection: true,
    profile: true,
  },
});}
    });

    const newRoles = (await Promise.all(ops)).filter(Boolean);

    const collectionId = roles?.[0]?.item?.id;

    const collection = collectionId
      ? getCollectionById(collectionId)
      : null;

    // const col = collectionId
    //   ? await getCollectionById(collectionId)
    //   : null;
// await prisma.collection.findFirst({
//           where: { id: collectionId },
//           include: {
//             storyIdList: true,
//             childCollections: true,
//             roles: {
//               include: { profile: true },
//             },
//             profile: true,
//           },
//         })
    return res.json({
      collection: collection,
      roles: newRoles,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error });
  }
});
    //   router.put("/collection",authMiddleware,async(req,res)=>{
    //     try{
    //         const {roles}=req.body
          
    //         let updated= roles.map(role=>{

    //             if(role.role=="role"){
    //                 if(role.id){
    //                 return prisma.roleToCollection.delete({where:{id:role.id}})
    //                 }
    //             }else{
    //                 if(roles.role && roles.id.length>10){
    //             return prisma.roleToCollection.upsert({
    //                 where:{
    //                     id:role.id
    //                 },
    //                 update:{
    //                     role:role.role,
    //                 },
    //                 create:{
    //                     role:role.role,
    //                     profileId:role.profile.id,
    //                     collectionId:role.item.id
    //                 }
    //                , include:{
    //                     collection:true,
    //                     profile:true
    //                 }})
    //             }else{
    //                 return prisma.roleToCollection.create({data:{
    //                     role:role.role,
    //                     profile:{
    //                         connect:{
    //                             id:role.profile.id
    //                         }
    //                     },
    //                     collection:{
    //                         connect:{
    //                             id:role.item.id
    //                         }
    //                     }
    //                 },include:{
    //                     collection:true,
    //                     profile:true
    //                 }})
    //             }}
    //             })
    //     let newRoles = await Promise.all(updated)
    //     let collection = await prisma.collection.findFirst({where:{id:{equals:roles[0].item.id}}
    //         ,include:{
    //             storyIdList:true,
    //             childCollections:true,
    //             roles:{
    //                 include:{
    //                     profile:true,
    //                 }
    //             },
    //             profile:true
    //         }})
    //      let col =await getCollectionById(roles[0].item.id)
    //     res.json({collection:col,roles:newRoles.filter(role=>!!role)})

    //         }catch(error){
    //             console.log(error)
    //             res.json({error})
    //         }
    // })
router.put("/story", authMiddleware, async (req, res) => {
  try {
    const { roles = [] } = req.body;

    if (!roles.length) {
      return res.json({ roles: [], story: null });
    }

    const storyId = roles[0]?.item?.id;

    const operations = roles.map((role) => {
      const profileId = role.profile.id;
      const currentStoryId = role.item.id;

      // 🗑 DELETE
      if (role.role === "none") {
        return prisma.roleToStory.deleteMany({
          where: {
            profileId,
            storyId: currentStoryId,
          },
        });
      }

      // 🔄 UPSERT (composite key)
      return prisma.roleToStory.upsert({
        where: {
          profileId_storyId: {
            profileId,
            storyId: currentStoryId,
          },
        },
        update: {
          role: role.role,
        },
        create: {
          role: role.role,
          profileId,
          storyId: currentStoryId,
        },
        include: {
          profile: true,
          story: true,
        },
      });
    });

    const [newRoles, story] = await Promise.all([
      Promise.all(operations),
      getStory(storyId),
    ]);

    return res.json({
      roles: newRoles,
      story,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error });
  }
});

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
        },include:{
            profile:true
        }})
        res.json({message:"Success"})

    }catch(err){
        res.status(409).json({error:err})
    }    })

    router.post("/collection",authMiddleware,async(req,res)=>{
        let {type,profileId,collectionId}=req.body
        try{
      let role= await prisma.roleToCollection.findFirst({where:{
        AND:[{profileId:{
            equals:profileId
        }},{collectionId:{
            equals:collectionId
        }}]

      },include:{
        profile:true,
        collection:true
    }})
    
    if(!role){

    
    role = await prisma.roleToCollection.create({data:{
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
    
        let collection = await prisma.collection.findFirst({where:{
            id:collectionId
         },include:{
             roles:true,
             childCollections:true,
             storyIdList:true
         }})
           const col = await getCollectionById(collectionId)
        res.json({role,collection:col})
    }else{
        let collection = await prisma.collection.findFirst({where:{
            id:collectionId
         },include:{
             roles:true,
             childCollections:true,
             storyIdList:true
         }})
        const col = await getCollectionById(collectionId)
        res.json({role,collection:col})
    } 
        
    }catch(error){
        console.log({error})
        res.status(409).json({error})
    }
    })
    router.delete("/collection/:id",authMiddleware,async(req,res)=>{
     
try{
       let data = await prisma.roleToCollection.delete({where:{id:req.params.id},include:{
    profile:true,
    collection:true}
       })
        res.json({message:"Deleted Successfully"})

}catch(err){
    
    res.status(409).json({error:err})
}
    })
    router.delete("/story/:id",authMiddleware,async(req,res)=>{
        try{

         await prisma.roleToStory.delete({where:{id:req.params.id}})
  
          res.json({message:"Deleted Succesfully"})
        }catch(err){
            res.status(409).json({error:err})
        }
      })
      router.patch("/collection/:id",authMiddleware,async(req,res)=>{
     
        try{
               await prisma.roleToCollection.update({where:{id:req.params.id},data:{
               role:req.body.role
               }})
                let collection = await prisma.collection.findFirst({where:{
                    id:{
                        equals:req.params.id
                    }
                },include:{
                    roles:true,
                    storyIdList:true,
                    childCollections:true,
                    
                }})
                let col = await getCollectionById(req.params.id)
                res.json({collection:col})
        
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
async function getCollectionById(id) {
  // Fetch the collection with all relations
  const collection = await prisma.collection.findFirst({
    where: { id },
    include: {
      storyIdList: {
        include: {
          story: { include: { author: true } },
        },
      },
      parentCollections: {
        include: {
          parentCollection: {
            select: { id: true, roles: true },
          },
        },
      },
      childCollections: {
        include: {
          parentCollection: true,
          childCollection: {
            include: {
              storyIdList: {
                include: {
                  story: { include: { author: true } },
                },
              },
            },
          },
        },
      },
      roles: {
        include: { profile: true },
      },
      profile: true,
    },
  });

  if (!collection) return null;

  // ✅ Filter out entries with missing story
  const orphanedEntries = collection.storyIdList.filter((s) => !s.story);

  // ✅ Delete them from the database
  if (orphanedEntries.length > 0) {
    const orphanIds = orphanedEntries.map((entry) => entry.id);
   await prisma.story.deleteMany({where:{id:{in:orphanIds}}})
   
    // Remove them from the local object as well
    collection.storyIdList = collection.storyIdList.filter((s) => s.story);
  }

  return collection;
}
