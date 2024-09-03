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

    router.post("/",async (req,res)=>{
        const docs = req.body.data
        // const { id,profilePicture,username,selfStatement,bookmarkLibraryId,homeLibraryId,userId,privacy,created}= docs
       
        const {id,name,profileId,pageIdList,bookIdList,updatedAt,created,writingIsOpen,privacy,purpose}=docs
        // let doc = docs[0]
        console.log(docs)
        const cId = generateMongoId(id)
        let uId = generateMongoId(profileId)
        console.log("profileId",uId)
        // try{
            // const doc = await prisma.collection.upsert({
            //     where: {
            //       id: cId
            //     },
            //     update: {
            //         title:name,
            //         purpose:purpose,
            //         profile:{
            //             connectOrCreate:{where:{id:uId},create:{id:uId,username:uId}}
            //         },
            //         isPrivate:privacy,
            //         isOpenCollaboration:writingIsOpen,
            //         updated:new Date()
            //     },
            //     create: {
            //         title:name,
            //         purpose:purpose,
            //         profile:{
            //             connectOrCreate:{where:{id:uId},create:{id:uId,username:uId}}
            //         },
            //         isPrivate:privacy,
            //         isOpenCollaboration:writingIsOpen,
            //         updated:new Date()
            //     },
            //   })
        //     prisma.collection.upsert
        // const result = await prisma.collection.update({
        //         where: {
        //           id: cId
        //         },
        //         data:{
        //             title:name,
        //             purpose:purpose,
        //             profile:{
        //                 connectOrCreate:{where:{id:uId},create:{id:uId}}
        //             },
        //             isPrivate:privacy,
        //             isOpenCollaboration:writingIsOpen,
        //             updated:new Date()
        //         },
           
               
        //       })
         

//         let promise = pageIdList.map(pageId=>{
//             try{
//             let lId = generateMongoId(pageId)
           
//            return prisma.storyToCollection.create({
//                 data:{
//                    collection:{
//                     connect:{id:cId}
//                    },
//                    story:{
//                     connectOrCreate:{
//                         where:{id:lId},
//                         create:{
//                             id:lId,
//                             title:"Untitled",
//                             commentable:false,
//                             author:{
//                                 connect:{
//                                     id:uId
//                                 }
//                             }
                           
//                         }
//                     }
                          
//                         }
    
  
// }})
// }catch(e){
//     console.log(e)
// }})
// console.log(Promise.all(promise))
        let promises = bookIdList.map(bookId=>{
            try{
            let lId = generateMongoId(bookId)
            return prisma.collectionToCollection.create({data:{
                childCollection:{
                    connectOrCreate:{
                        where:{id:lId},
                create:{
                    id:lId,
                    title:"Untitled",
                    purpose:"",
                    isPrivate:true,
                    isOpenCollaboration:false,
                    profile:{connect:{id:uId}}

                }}},
                parentCollection:{
                    connect:{
                        id:cId}
                    }
                }})}catch(e){
            console.log(e)
        }
    })
    console.log(Promise.all(promises))
   
    res.json(docs)
        })
    
        // Promise.all(promises)
    
    

    return router
}

