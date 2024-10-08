const express = require('express');
const prisma = require("../db");
const resend = require("..")
const jwt = require('jsonwebtoken');
const generateMongoId = require("./generateMongoId");
const lib = require('passport');
const nodemailer = require('nodemailer');
const router = express.Router()
module.exports = function (authMiddleware){
    router.post("/user",async (req,res)=>{
        const {email}= req.body
        let user = await prisma.user.create({email})
        res.json({user})
    })
    router.post("/apply",async (req,res)=>{
        const body = req.body
        const {
            igHandle,
            fullName,
            email,
            whyApply,
            howFindOut
        }=body
        let transporter = nodemailer.createTransport({
            service: 'gmail', 
            auth: {
              user: process.env.pbEmail, 
              pass: process.env.pbPassword 
            }
          });
        //   await prisma.user.create({email:email,verified:false})
            let mailOptions = {
                from: process.env.myEmail,
                to: process.env.myEmail, // Email to yourself
                subject: 'New Plumbum Application',
                text: ` \n
                        \n
                        Name: ${fullName}\n
                        Email: ${email}\n
                        Instagram Handle: ${igHandle}\n
                        Why did they apply:${whyApply}\n
                        How did they find out:${howFindOut}`
              };
              try {
                await transporter.sendMail(mailOptions);
                res.json({message:'Applied Successfully!'});
              } catch (error) {
                console.error(error);
                res.json({error})
              }
    })
    router.post("/session",async (req,res)=>{
        const { email, uId } = req.body;
  
        try {
          
          // Find user by username
          const user = await prisma.user.findFirstOrThrow({ where: { uId:uId } });
      
          if (!user ) {
            return res.status(401).json({ message: 'Invalid email or password' });
          }
      
        
          const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '23h' });

      
          res.json({ token });
        } catch (error) {
          res.status(402).json({ message: 'Error logging in' });
        }
    })
    router.post("/verify",async (req,res)=>{

    })
    router.post("/register",async (req,res)=>{
        const{ id, uId,email,password,username,
        profilePicture,selfStatement,privacy
       }=req.body
        let mongoId = generateMongoId(uId)

        const user = await prisma.user.upsert({where:{
            id: id
        },data:{
            id:mongoId,
            email:email,
            verified:true
        }})
        const profile = await prisma.profile.create({
            data:{
                username:username,
                profilePic:profilePicture,
                selfStatement,
                isPrivate:privacy,
                user:{
                    connect:{
                        id:mongoId
                    }
                }
            }
        })
        res.json({profile})
    })
    router.post("/referral",async (req,res)=>{

    })
    router.get("/user/:userId/profile",async (req,res)=>{
        const {userId} = req.params
        const profiles = await prisma.profile.findMany({where:{user:{
            id:userId
        }}})
        res.status(200).json({data:profiles})
    })

    router.post("/",async (req,res)=>{
        try{
           
                const {id,email,uId,profile,pages,books,libraries}= req.body
            console.log(email,profile)
               let mongoId = generateMongoId(id)
        
        let user = await  prisma.user.create({data:{
            email:email,
            uId:id,
            verified:false
        }
        })
       let prof = await prisma.profile.create({
            data:{
               
                profilePic:profile.profilePicture,
                username:profile.username,
                
                selfStatement:profile.selfStatement,
                user:{
                    connect:{
                    id:user.id
                }},
                isPrivate:profile.privacy  
            }
        })
        let collection = await prisma.collection.create({data:{
            title:"Saved",
            profile:{
                connect:{
                    id:prof.id
                }
            },
            purpose:"Save your inspiration"
            ,isPrivate:true,
            isOpenCollaboration:false
        }})
        let pageCol = pages.map(page=>{
            let type = page.type
            if(type=="html/text"){
                type = "html"
            }
            return prisma.story.create({data:{
                id: generateMongoId(page.id),
                title:page.title,
                data:page.data,
                type:type,
                commentable:page.commentable,
                author:{
                    connect:{
                        id: prof.id
                    }
                }
            }})
        })
       await Promise.all(pageCol)
        let bookCol = books.map(async book=>{
             prisma.collection.create({
                data:{
                    id: generateMongoId(book.id),
                    title:book.title,
                    purpose:book.purpose,
                    isPrivate:book.privacy,
                    isOpenCollaboration:book.writingIsOpen,
                    profile:{
                        connect:{
                            id:prof.id
                        }
                    }
                }
            })
           let promises = book.pageIdList.map(async pid=>{
               return prisma.storyToCollection.create({data:{
                    story:{
                        connect:{id:generateMongoId(pid)}
                    },
                    collection:{
                        connect:{
                            id:generateMongoId(book.id)
                        }
                    }
                }})
            })
            return Promise.all(promises)
        })
        await Promise.all(bookCol)
        let libCol = libraries.map(async lib=>{

          await prisma.collection.create({data:{
                id: generateMongoId(lib.id),
                title:lib.name,
                purpose:lib.purpose,
                isPrivate:lib.privacy,
                isOpenCollaboration: lib.writingIsOpen,
                profile:{
                    connect:{
                        id:prof.id
                    }
                }
            }})
        
            lib.pageIdList.map(async pid=>{
               await prisma.storyToCollection.create({data:{
                    story:{
                        connectOrCreate:{
                            where:{
                                id: generateMongoId(pid),
                            },create:{
                                title:"Unititle'd",
                                data:"",
                                isPrivate:true,
                                commentable:true,
                                author:{
                                    connect:{
                                        id: prof.id
                                    }
                                },
                                type:"html"

                            }
                            
                        }
                    },
                    collection:{
                        connect:{
                            id:generateMongoId(lib.id)
                        }
                    }
                }})
            })
       
            lib.bookIdList.map(async bid=>{
                await prisma.collectionToCollection.create({data:{
                    parentCollection:{
                        connect:{
                            id:generateMongoId(lib.id)
                    },
                 
            },childCollection:{
                connect:{id:generateMongoId(bid)}
            }}})
            })
        })
        await Promise.all(libCol)
        await prisma.profileToCollection.create({data:{
            profile:{connect:{id:prof.id}},
            collection:{connect:{id:collection.id}}
        }})
        res.json({profile})
    }catch(e){
        console.log(e)
    }
    })
    
    

    return router
}

