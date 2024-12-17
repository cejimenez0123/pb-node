const express = require('express');
const prisma = require("../db");
const resend = require("..")
const bcrypt = require("bcryptjs")
const crypto = require('crypto');
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
    router.post("/referral",authMiddleware,async (req,res)=>{
    const {email}=req.body
const referralToken = crypto.randomBytes(32).toString('hex');
        let referral = await prisma.referral.create({
            data:{
        email:email,
        referralToken:referralToken,
        isUsed:false
            }})
    let transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
          user: process.env.pbEmail, 
          pass: process.env.pbPassword 
        }
      });
    //   await prisma.user.create({email:email,verified:false})
        let mailOptions = {
            from:  process.env.pbEmail,
            to:email ,// Email to yourself
            subject: 'You’ve Been Invited to Join Plumbum!',
              html: `
                
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Plumbum Referral</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          background-color: #2E2E2E;
          color: #D4D4D4;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .container {
          text-align: center;
          background-color: #1D1D1D;
          border-radius: 10px;
          padding: 40px 30px;
          width: 80%;
          max-width: 600px;
          box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
        }
        h1 {
          font-size: 3em;
          color: #A9C5D3;
          margin-bottom: 20px;
          letter-spacing: 2px;
        }
        p {
          font-size: 1.2em;
          margin: 20px 0;
          color: #D4D4D4;
        }
        a {
          font-size: 1.4em;
          color: #B1A7D5;
          text-decoration: none;
          padding: 10px 20px;
          border: 2px solid #B1A7D5;
          border-radius: 5px;
          transition: background-color 0.3s, color 0.3s;
        }
        a:hover {
          background-color: #B1A7D5;
          color: #1D1D1D;
        }
        .footer {
          margin-top: 30px;
          font-size: 0.9em;
          color: #A9C5D3;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Plumbum</h1>
        <p>Hello,</p>
        <p>You've been invited to join Plumbum, a place where creativity and community come together. We believe your voice can make a difference in this artistic space.</p>
        <p>To get started, simply click the link below and sign up:</p>
        <a href="${process.env.DOMAIN}/signup?token=${referralToken}" target="_blank">Join Plumbum</a>
        <p class="footer">If you did not request this invitation, feel free to ignore this email.</p>
      </div>
    </body>
    </html>
              `
          };
          try {
            await transporter.sendMail(mailOptions);
            res.json({message:'Applied Successfully!'});
          } catch (error) {
            console.error(error);
            res.json({error})
          }})

    router.post("/apply",async (req,res)=>{
        const {
            igHandle,
            fullName,
            email,
            whyApply,
            howFindOut
        } = req.body

    try{
       let user = await prisma.user.create({data:{
            email:email,
            preferredName:fullName,
            igHandle:igHandle,
        }})
        let transporter = nodemailer.createTransport({
            service: 'gmail', 
            auth: {
              user: process.env.pbEmail, 
              pass: process.env.pbPassword 
            }
          });
        //   await prisma.user.create({email:email,verified:false})
            let mailOptions = {
                from: email,
                to: process.env.pbEmail, // Email to yourself
                subject: 'New Plumbum Application',
                  html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Application Review</title>
                      <style>
                        body {
                          font-family: Arial, sans-serif;
                          background-color: #f9f9f9;
                          color: #333;
                          padding: 20px;
                        }
                        .container {
                          background: #fff;
                          padding: 20px;
                          border-radius: 8px;
                          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                          font-size: 1.5em;
                          margin-bottom: 20px;
                        }
                        .info {
                          margin-bottom: 20px;
                        }
                        .info p {
                          margin: 5px 0;
                        }
                        .form {
                          margin-top: 20px;
                        }
                        button {
                          background: #4CAF50;
                          color: white;
                          border: none;
                          padding: 10px 20px;
                          font-size: 1em;
                          border-radius: 5px;
                          cursor: pointer;
                          transition: background 0.3s;
                        }
                        button:hover {
                          background: #45a049;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">Review Plumbum Applicant</div>
                        <div class="info">
                        <p><strong>Name:</strong> ${fullName}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Instagram Handle:</strong> ${igHandle}</p>
                        <p><strong>Why did they apply:</strong> ${whyApply}</p>
                        <p><strong>How did they find out:</strong> ${howFindOut}</p>
                        </div>
                        <div class="form">
                          <form action="${process.env.BASEPATH+"/auth/review"}" method="POST">
                            <input type="hidden" name="applicantId" value="${user.id}" />
                            <button type="submit" name="action" value="approve">Approve</button>
                          
                          </form>
                        </div>
                      </div>
                    </body>
                    </html>
                  `
              };
              try {
                await transporter.sendMail(mailOptions);
                res.json({message:'Applied Successfully!'});
              } catch (error) {
                console.error(error);
                res.json({error})
              }

            }catch(error){
                console.log(error)
                if(error.message.includes("Unique")){
                    res.json({message:"User has already applied"})
                }
            }
    })
    router.post('/review', async (req, res) => {
        const { applicantId, action } = req.body;
      
        try {
          if (!applicantId || !action) {
            return res.status(400).json({ message: 'Missing applicantId or action' });
          }
          let transporter = nodemailer.createTransport({
            service: 'gmail', 
            auth: {
              user: process.env.pbEmail, 
              pass: process.env.pbPassword 
            }
          });
          const token = jwt.sign({ applicantId }, process.env.JWT_SECRET, { expiresIn: '7d' });

          // Define the secure sign-up link
          const signupLink = process.env.DOMAIN+`/signup?token=${token}`;
      
          const user = await prisma.user.update({
            where:{
                id:applicantId
            },
            data:{
                verified:true
            }
        })
         
          if (user) {
            if (action === 'approve') {
             


                const mailOptions = {
                    from: process.env.pbEmail, // Sender address
                    to: user.email, // Recipient's email
                    subject: 'Congratulations! Your Application Has Been Approved 🎉',
                    html: `
                      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                        <h1 style="color: #5A5A5A;">Welcome to Plumbum, ${user.preferredName}!</h1>
                        <p style="font-size: 16px; color: #5A5A5A;">
                          We’re thrilled to let you know that your application has been approved. 
                          You’re now part of a vibrant community of creators, thinkers, and writers.
                        </p>
                        <p style="font-size: 16px; color: #5A5A5A;">
                          Click the button below to log in and start exploring:
                        </p>
                        <a href="${signupLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
                        Complete Sign-Up
                      </a>
                        <p style="font-size: 14px; color: #5A5A5A; margin-top: 20px;">
                          If you have any questions, feel free to reach out to us at plumbumapp@gmail.com
                        </p>
                        <footer style="font-size: 12px; color: #9E9E9E; margin-top: 20px;">
                          &copy; ${new Date().getFullYear()} Plumbum. All rights reserved.
                        </footer>
                      </div>
                    `,
                  };
                  await transporter.sendMail(mailOptions);
           
            } else if (action === 'reject') {
         
            } else {
              return res.status(400).json({ message: 'Invalid action' });
            }
      
            // await user.save();
            return res.status(200).json({ message: `User ${action}'d successfully` });
          }
      
          // If no application or user is found
          res.status(404).json({ message: 'Applicant not found' });
      
        } catch (error) {
          console.error('Error processing application:', error);
          res.status(500).json({ message: 'Internal server error' });
        }
      });
    router.post("/session",async (req,res)=>{
        const { email, password, uId } = req.body;
  
        try {
          if(uId){
         
          const user = await prisma.user.findFirstOrThrow({ where: { uId:uId } });
      
          if (!user ) {
            return res.status(401).json({ message: 'Invalid email or password' });
          }
          
        
          const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '23h' });

      
          res.json({ token });
        }else{
            try{
            const user = await prisma.user.findUnique({ where: { email:email.toLowerCase() } });
            if (!user || !bcrypt.compareSync(password, user.password)) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '2d' });
            res.json({ token });
            } catch (error) {
                res.status(402).json({ message: 'Error logging in' });
            }
        }
        } catch (error) {
          res.status(402).json({ message: 'Error logging in' });
        }
    })
    router.post("/verify",async (req,res)=>{

    })
    router.post("/register",authMiddleware,async (req,res)=>{
        const{ id, token, uId,email,password,username,
        profilePicture,selfStatement,privacy
       }=req.body
        let mongoId = generateMongoId(uId)
        if (!email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
          }
      
    
      
        //   // Hash password securely (at least 10 rounds)
          const hashedPassword = await bcrypt.hash(password, 10);
          const verifiedToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '23h' });
        //   // Create new user in Prisma
        //   const user = await prisma.user.create({
        //     data: { email, password: hashedPassword },
        //   });
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

