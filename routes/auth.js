const express = require('express');
const router = express.Router()
const prisma = require("../db");
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken');
const newsletterWelcomeTemplate = require("../html/newsletterWelcome")
const applicationConfirmationTemplate = require("../html/applicationConfirmationTemplate")
const generateMongoId = require("./generateMongoId");
const approvalTemplate = require('../html/approvalTemplate');
const newsletterSurveyTemplate = require('../html/newsletterSurveyTemplate');
const subscriptionConfirmation = require('../html/subscriptionConfirmation');
const feedbackTemplate = require('../html/feedbackTemplate');
const applyTemplate = require('../html/applyTemplate');
const { Resend } = require('resend');
const forgotPasswordTemplate = require('../html/forgotPasswordTemplate');
const recievedReferralTemplate = require('../html/recievedReferralTemplate');
const verifyAppleIdentityToken = require("../utils/verifyAppleIdentityToken");
// const feedbackTemplate = require("../feedbackTemplate");
const crypto = require("crypto");
function isHex(num) {

  return Boolean(num.match(/^0x[0-9a-f]+$/i))
}
module.exports = function (authMiddleware){
  const resend = new Resend(process.env.RESEND_API_KEY);
    router.get("/user",authMiddleware,async(req,res)=>{
      
      res.json({user:req.user})
    })
    async function deleteProfile(id){
        await prisma.hashtagCollection.deleteMany({where:{
          profileId:{
              equals:id
          }
      }})
   
      await prisma.hashtagComment.updateMany({where:{
          profileId:{
              equals:id
          }
      },data:{
        profileId:null
      }})
      await prisma.hashtagStory.deleteMany({where:{
          profileId:{
              equals:id
          }
      }})
       await prisma.userStoryLike.deleteMany({where:{
          profileId:{equals:id}
        }})
       await prisma.userStoryHistory.deleteMany({where:{
          profileId:{equals:id}
      }})
      await prisma.roleToCollection.deleteMany({where:{
        profileId:{
          equals:id
        }
      }})
      await prisma.roleToStory.deleteMany({where:{
        profileId:{
          equals:id
        }
      }})
      await prisma.comment.updateMany({where:{
        profileId:{
          equals:id
        }
      },data:{profileId:null}})
   await prisma.userCollectionHistory.deleteMany({where:{
        profileId:{equals:id}
    }})
   await prisma.profileToCollection.deleteMany({where:{profileId:{
      equals:id
    }}})
    await prisma.collectionToCollection.deleteMany({where:{
      profileId:{
        equals:id
      }
    }})
    await prisma.storyToCollection.deleteMany({where:{
      profileId:{
        equals:id
      }
    }})
    let followsId = await prisma.follow.deleteMany({where:{
      OR:[{followerId:{
          equals:id
      }},{followingId:{
          equals:id
      }}]
  }})
      let profColsId = await prisma.collection.deleteMany({where:{profileId:{
                  equals:id
              }}})
           let profStoriesId = await prisma.story.deleteMany({where:{authorId:{
                  equals:id
              }}})
              
     
         return 
     
   }
    async function createNewProfileForUser({username,profilePicture,selfStatement,isPrivate,userId}){
      const profile = await prisma.profile.create({
        data:{
            username:username?.toLowerCase(),
            profilePic:profilePicture,
            selfStatement,
            isPrivate:isPrivate,
            user:{
                connect:{
                    id:userId
                }
            }
        }
    })
   const homeCol = await prisma.collection.create({data:{
      title:"Home",
      purpose:"Add Collections to home to up with updates",
      isOpenCollaboration:false,
      isPrivate:true,
      profile:{
        connect:{
          id:profile.id
        }
      }
    }
    })
  const archCol= await prisma.collection.create({data:{
      title:"Archive",
      purpose:"Save things for later",
      isOpenCollaboration:false,
      isPrivate:true,
      profile:{
        connect:{
          id:profile.id
        }
      }
    }
    })


    await prisma.profileToCollection.create({
      data:{
        collection:{
          connect:{
            id:homeCol.id
          }
        },
        type:"home",
        profile:{
          connect:{
            id:profile.id
          }
        }
      }
    })
    let profileToColl= await prisma.profileToCollection.create({data:{
      collection:{
          connect:{
              id:archCol.id
          }
      },type:"archive",
      profile:{
          connect:{
              id:profile.id
          }
      }

  },include:{
      collection:true,
      profile:{
          include:{
            likedStories:true,
              followers:true,
              stories:true,
              collections:true,
              profileToCollections:{
                  include:{
                      collection:{
                        include:{
                          storyIdList:true
                        }
                      }
                  }
              }
          }
      }
    }})
    return profileToColl.profile
  }
    router.put("/subscription",async(req,res)=>{
      try{
     
      const {frequency,token}=req.body
     
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const {userId}=decoded
   
      if(frequency==0){
        const user = await prisma.user.update({where:{
          id:userId},data:{
           emailFrequency:0
          }})
          res.json({user,message:"Successfuly Unsubscribed"})
      }else{
        let user = await prisma.user.update({where:{
          id:userId
        },data:{
          emailFrequency:frequency
        }})
        res.json({user,message:"Successfully Updated Prefences"})
      }
   
    }catch(error){
      console.log({error})
      res.json({error})
    }
    })
  //   router.post('/generate-referral', authMiddleware,async (req, res) => {
  //     const userId  = req.user.id;
  //     try {
  //     const DAILY_LIMIT=5
  //     const today = new Date();
  //     today.setHours(0, 0, 0, 0); // Start of the day
  
  //     // Count how many referrals the user has created today
  //     const referralsToday = await prisma.referral.count({
  //         where: {
  //           createdById:{equals:userId},
  //             createdAt: {
  //                 gte: today, // Get referrals created today
  //             },
  //         },
  //     });
  
  
   

  // if (referralsToday >= 5) {
  //   const latestReferral = await prisma.referral.findFirst({
  //     where: {
  //        createdById:{equals:userId},
  //         usageCount: { lt: 5 }, 
  //     },
  //     orderBy: {
  //         createdAt: "desc", // Get the latest one
  //     },
  // });
  // const token = jwt.sign({referralId:latestReferral.id}, process.env.JWT_SECRET);
   
  // res.json({ referralLink: `${process.env.DOMAIN}/register?token=${token}`,message: 'Max Usage Limit of Referral:\nGood job sharing! Add more friends tomorrow. Enjoy your friends today. '  });

  //     }else{
    
  //       const referral = await prisma.referral.create({
  //         data: {
  //           createdBy:{
  //             connect:{
  //               id:userId
  //             }
  //           }
  //         }
  //       });
  //       const token = jwt.sign({referralId:referral.id}, process.env.JWT_SECRET);

  //          res.json({ referralLink: `${process.env.DOMAIN}/register?token=${token}`,referral:referral});
  //    } } catch (error) {
  //       console.error(error);
  //     res.status(500).json({ message: 'Error generating referral link' });
  //     }
  //   });
  router.post('/generate-referral', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const DAILY_LIMIT = 5;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // count referrals created today
    const referralsToday = await prisma.referral.count({
      where: {
        createdById: userId,
        createdAt: { gte: today }
      }
    });

    if (referralsToday >= DAILY_LIMIT) {
      const latestReferral = await prisma.referral.findFirst({
        where: { createdById: userId },
        orderBy: { createdAt: "desc" }
      });

      if (!latestReferral) {
        return res.status(400).json({ message: "No referral exists yet" });
      }

      const token = jwt.sign(
        { referralId: latestReferral.id },
        process.env.JWT_SECRET
      );

      return res.json({
        referralToken: token,
        referralLink: `${process.env.DOMAIN}/register?token=${token}`,
        message: "Daily limit reached"
      });
    }

    // create referral
    const referral = await prisma.referral.create({
      data: {
        createdBy: {
          connect: { id: userId }
        }
      }
    });

    const token = jwt.sign(
      { referralId: referral.id },
      process.env.JWT_SECRET
    );

    return res.json({
      referralToken: token,
      referralLink: `${process.env.DOMAIN}/register?token=${token}`,
      referral
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error generating referral link"
    });
  }
});
//   router.post('/generate-referral', authMiddleware, async (req, res) => {
//   const userId = req.user.id;

//   try {
//     const DAILY_LIMIT = 5;

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const referralsToday = await prisma.referral.count({
//       where: {
//         createdById: userId,
//         createdAt: { gte: today }
//       }
//     });

//     if (referralsToday >= DAILY_LIMIT) {
//       const latestReferral = await prisma.referral.findFirst({
//         where: {
//           createdById: userId
//         },
//         orderBy: { createdAt: "desc" }
//       });

//       const token = jwt.sign(
//         { referralId: latestReferral.id },
//         process.env.JWT_SECRET
//       );

//       return res.json({
//         referralLink: `${process.env.DOMAIN}/register?token=${token}`,
//         message: "Daily limit reached"
//       });
//     }

//     const referral = await prisma.referral.create({
//       data: {
//         createdBy: {
//           connect: { id: userId }
//         }
//       }
//     });

//     const token = jwt.sign(
//       { referralId: referral.id },
//       process.env.JWT_SECRET
//     );

//     return res.json({
//       referralLink: `${process.env.DOMAIN}/register?token=${token}`,
//       referral
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error generating referral link" });
//   }
// });
//     router.post("/referral",authMiddleware,async (req,res)=>{
//     const {email,name}=req.body
// try{

// const user = await prisma.user.create({
//   data:{
//     email:email.toLowerCase(),
//     verified:false,
//   }
// })


   

// const mailOptions = recievedReferralTemplate(email,name)

          
  
//              resend.emails.send(mailOptions).then(()=>{
//               res.json({user,message:'Referred Succesfully!'});
//             }).catch(err=>{
//               throw err
//             })

//         }catch(error){
//   res.json({error})
// }})
// router.post("/referral", authMiddleware, async (req, res) => {
//   const { email, name } = req.body;

//   try {
//     if (!email || !name) {
//       return res.status(400).json({ message: "Missing email or name" });
//     }

//     const normalizedEmail = email.toLowerCase();

//     const existingUser = await prisma.user.findUnique({
//       where: { email: normalizedEmail }
//     });

//     if (existingUser) {
//       return res.status(400).json({ message: "User already referred" });
//     }

//     const user = await prisma.user.create({
//       data: {
//         email: normalizedEmail,
//         verified: false,
//       }
//     });
// const token = jwt.sign({ applicantId:user.id}, process.env.JWT_SECRET);
//     const mailOptions = recievedReferralTemplate(email, name,token);

//    const response = await resend.emails.send(mailOptions);

// console.log("Resend response:", response);
// if (!response || response.error) {
//   console.error("Email failed:", response?.error);
//   return res.status(500).json({
//     message: "Email failed to send",
//     error: response?.error
//   });
// }
//     return res.json({
//       user,
//       message: "Referred successfully!",
//       emailId: response.id
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       message: "Something went wrong"
//     });
//   }
// });
router.post("/invite", authMiddleware, async (req, res) => {
  const { email, name } = req.body;

  try {
    if (!email || !name) {
      return res.status(400).json({ message: "Missing email or name" });
    }

    const normalizedEmail = email.toLowerCase();

    const userId = req.user.id;

    // 1. Create referral (or reuse existing one)
    const referral = await prisma.referral.create({
      data: {
        createdBy: {
          connect: { id: userId }
        }
      }
    });

    // 2. Generate token
    const token = jwt.sign(
      { referralId: referral.id },
      process.env.JWT_SECRET
    );

    // 3. Send referral link (NOT user creation)
    const mailOptions = recievedReferralTemplate(
      normalizedEmail,
      name,
      token
    );

    const response = await resend.emails.send(mailOptions);

    if (!response || response.error) {
      return res.status(500).json({
        message: "Email failed to send",
        error: response?.error
      });
    }

    return res.json({
      message: "Referral sent successfully",
      referralId: referral.id
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong"
    });
  }
});
    router.post("/apply",async (req,res)=>{
   
        const {
            idToken,
            googleId,
            igHandle,
            fullName,
            email,
        } = req.body
        
        let user 
    try{
      let mail = email??""
      if(idToken){
        let payload = await verifyAppleIdentityToken(idToken)
        mail = payload.email
      
      user = await prisma.user.findFirst({where:{
        email:{equals:mail}
      }})
        if(!user||!user.id){
          user = await prisma.user.create({data:{
            email:mail,
            preferredName:fullName??"",
            igHandle:igHandle??"",
        }})
     
          let mailOptions = applyTemplate(user,req.body,false)
          let template = applicationConfirmationTemplate(user)

         await resend.emails.send(template)
       let response  =  await resend.emails.send(mailOptions)
                const params = new URLSearchParams({
          applicantId:user.id,
          action:"approve",
          email,
        });
        const parms = `/auth/review?`+params.toString()

         res.status(201).json({path:parms,user,message:'Applied Successfully!'});
    
      }else{
        throw new Error("Not Unique")
      }
  }else if(googleId){

    user = await prisma.user.findFirst({where:{
      googleId:{equals:googleId}
    }})
    if(!user){
        user = await prisma.user.create({data:{
          email:payload.email,
          preferredName:fullName,
          igHandle:igHandle,
      }})
   
        let mailOptions = applyTemplate(user,req.body,false)
        let template = applicationConfirmationTemplate(user)

       await resend.emails.send(template)
     let response  =  await resend.emails.send(mailOptions)
              const params = new URLSearchParams({
        applicantId:user.id,
        action:"approve",
        email,
      });
      const parms = `/auth/review?`+params.toString()

       res.status(201).json({path:parms,user,message:'Applied Successfully!'});
    }
  }else if(email){
    
        user = await prisma.user.create({data:{
            email:email,
            preferredName:fullName,
            igHandle:igHandle,
        }})
     

          let mailOptions = applyTemplate(user,req.body,false)
            let template = applicationConfirmationTemplate(user)
           await resend.emails.send(template)
         let response  =  await resend.emails.send(mailOptions)
         if(response.error){
          throw response.err
         }else{
         const params = new URLSearchParams({
          applicantId:user.id,
          action:"approve",
          email,
        });
        const parms = `/auth/review?`+params.toString()

         res.status(201).json({path:parms,user,message:'Applied Successfully!'});
      }}
  
            }catch(error){
      
              console.log(error)
                  res.status(403).json({user,error,message:error.message})
                
            }

    })
    router.post("/reset-password",async(req,res)=>{
      
      try{
        const { token,password} = req.body
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const hashedPassword = await bcrypt.hash(password, 10)
     const user = await prisma.user.update({where:{
       id:decoded.id
    },data:{
        verified:true,
        password:hashedPassword
    },include:{
      profiles:true
    }})
    res.json({profile:user.profiles[0]})
  }catch(error){
   
    res.json({error})
  }
    })
    async function createNewProfileCollections(profile){
      const homeCol = await prisma.collection.create({data:{
        title:"Home",
        purpose:"Add Collections to home to up with updates",
        isOpenCollaboration:false,
        isPrivate:true,
        profile:{
          connect:{
            id:profile.id
          }
        }
      }
      })
    const archCol= await prisma.collection.create({data:{
        title:"Archive",
        purpose:"Save things for later",
        isOpenCollaboration:false,
        isPrivate:true,
        profile:{
          connect:{
            id:profile.id
          }
        }
      }
      })
      await prisma.profileToCollection.create({
        data:{
          collection:{
            connect:{
              id:homeCol.id
            }
          },
          type:"home",
          profile:{
            connect:{
              id:profile.id
            }
          }
        }
      })
      let profileToColl= await prisma.profileToCollection.create({data:{
        collection:{
            connect:{
                id:archCol.id
            }
        },type:"archive",
        profile:{
            connect:{
                id:profile.id
            }
        }

    },include:{
        collection:true,
        profile:{
            include:{
              likedStories:true,
                followers:true,
                stories:true,
                collections:true,
                profileToCollections:{
                  include:{
                    collection:{
                      include:{
                        storyIdList:true
                      }
                    }
                }
                }
            }
        }
    }})

    }
    router.get("/unsubscribe",async (req,res)=>{
      try{
      const {token}= req.query
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const {userId}=decoded
      const user = await prisma.user.update({where:{
        id:userId
     },data:{
        emailFrequency:0
     },include:{
    
     }})
     let params = new URLSearchParams({unsubscribe:"true",token})
     res.redirect(process.env.DOMAIN+"/subscribe?"+params.toString())
      }catch(error){
        res.json({error})
      }
    })

    router.post("/newsletter/apply",async (req,res)=>{
   
      const {
          email,
      } = req.body

  try{
      const user = await prisma.user.update({where:{
        email:email
        
      },data:{
        subscription:"basic"
      }})
      
          let mailOptions = applyTemplate(user,req.body,false)
          let response =  await resend.emails.send(mailOptions)
          let applyWelcome = newsletterWelcomeTemplate(user)
          let welcomeRes =  await resend.emails.send(applyWelcome)
          if(response.data){
          const params = new URLSearchParams({
            applicantId:user.id,
            action:"approve",
            email,
            newsletter:true,
          });
          let parms = `/auth/review?`+params.toString()
        
          res.status(201).json({path:parms,user,message:'Applied Successfully!'});
        }else{
          throw response.error
        }
             
          }catch(error){
              if(error.message.includes("Unique")){
                  res.status(409).json({message:"User has already applied"})
              }
                console.log(error)
                res.status(403).json({error})
              
          }

  })

    router.post("/forgot-password",async (req,res)=>{
        const {email}=req.body

        try{
        let user =  await prisma.user.findFirstOrThrow({where:{email:{equals:email
          }},include:{
            profiles:true
          }})

let mailOptions = forgotPasswordTemplate(user)

                resend.emails.send(mailOptions).then(res=>{
                  res.json({user,message:'Applied Successfully!'});
          
                }).catch(err=>{throw err})
                
                res.status(200).json({message:"If there is an account you will recieve an email"})
                }catch(err){
   console.log(err)
                  res.status(409).json({err,message:"If there is an account you will recieve an email"})
                }
    })
    router.get('/review', async (req, res) => {
 
   
      try {
        const {applicantId,action,email} = req.query;

        if (action=="approve"&&email) {
            
         
          let user = await prisma.user.update({where:{
            id:applicantId,},data:{
              subscription:"basic",
              verified:true
            }}) 
      
           
         

          const mailOptions = approvalTemplate(user)
          let response = await resend.emails.send(mailOptions)
          if(response.error){
            throw response.error
          }
          res.status(200).json({ message: `User ${action}'d successfully` });
            
      
          }else{
            console.log(response.error)
            res.json({message:"Not interested"})
          }
    
  }catch (error) {
    console.log(error)
          res.status(409).json(error)
  }
      });
      router.delete("/",authMiddleware,async(req,res)=>{
        try{
        const userId = req.user.id
        const profile = req.user.profiles[0]
        await prisma.referral.deleteMany({where:{
          createdById:{
            equals:userId,
          }
        }})
     await deleteProfile(profile.id)
     await prisma.user.delete({where:{
      id:userId
     }})
     res.json({message:"Delete Successss"})
        }catch(err){
          console.log(err)
          res.status(409).json({error:err})
        }
      })

    //   router.post('/use-referral', async (req, res) => {
    //     const { token, email, password ,username,profilePicture,selfStatement,isPrivate} = req.body;
      
    //     try {
      
    //       const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //       const {referralId}=decoded
    //       const referral = await prisma.referral.findUnique({ where: { id:referralId} });
          
    //       if (!referral){
    //         return res.status(400).json({ message: 'Invalid referral link' });
    //       }else{
    //       if (referral.usageCount >= referral.maxUses){
    //          return res.status(403).json({ message: 'Referral limit reached' });

    //       }else{
    //     let newUser = await  prisma.user.findFirst({where:{
    //         email:{
    //           equals:email
    //         }
    //       },include:{
    //         profiles:true
    //       }})
    //       const hashedPassword = await bcrypt.hash(password, 10);
    //       if(!newUser){

    //    newUser = await prisma.user.create({
    //         data: {
    //           email:email.toLowerCase(),
    //           password:hashedPassword, // You should hash the password before storing it
    //           referredById: referral.createdById
    //         },include:{
    //           profiles:true
    //         }
    //       });
    //     }
    
    //     if(newUser&&newUser.profiles && newUser.profiles.length==0){
    // const profile =  await createNewProfileForUser({username,profilePicture,selfStatement,isPrivate,userId:newUser.id})
          
    //       await prisma.referral.update({
    //         where: {id:referralId },
    //         data: { usageCount: { increment: 1 } }
    //       });
        
    //      const userToken = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET);
    //       res.json({ firstTime:true,message: 'User created successfully',token:userToken,profile:profile});
    //     }else{
         
    //       res.json({ message:"User already exists. Go to forgot password at login"});
    //     }}}
    //     } catch (error) {
    //       console.log(error);
    //       res.status(400).json({ message: 'Error processing referral' });
    //     }
    //   });
router.post('/use-referral', async (req, res) => {
  const { token, email, password, username, profilePicture, selfStatement, isPrivate } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { referralId } = decoded;

    const referral = await prisma.referral.findUnique({
      where: { id: referralId }
    });

    if (!referral) {
      return res.status(400).json({ message: 'Invalid referral link' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Find or create user (idempotent-safe pattern)
    let newUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: { profiles: true }
    });

    if (!newUser) {
      newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          referredById: referral.createdById
        },
        include: { profiles: true }
      });
    }

    // 2. HARD GUARD: enforce maxUses (NO race-safe counter needed here)
    const currentUses = await prisma.referralUse.count({
      where: { referralId }
    });

    if (currentUses >= referral.maxUses) {
      return res.status(403).json({ message: 'Referral limit reached' });
    }

    // 3. INSERT FIRST (this is the Mongo-safe lock)
    try {
      await prisma.referralUse.create({
        data: {
          referralId,
          userId: newUser.id
        }
      });
    } catch (err) {
      // duplicate prevention (RACE CONDITION SAFETY)
      if (err.code === "P2002") {
        return res.status(409).json({
          message: "This referral was already used by this user"
        });
      }
      throw err;
    }

    // 4. Only AFTER successful insert → create profile
    if (newUser.profiles.length === 0) {
      const profile = await createNewProfileForUser({
        username,
        profilePicture,
        selfStatement,
        isPrivate,
        userId: newUser.id
      });

      const userToken = jwt.sign(
        { userId: newUser.id },
        process.env.JWT_SECRET
      );

      return res.json({
        firstTime: true,
        token: userToken,
        profile
      });
    }

    return res.json({
      message: "User already exists. Please login."
    });

  } catch (error) {
    console.log(error);
    res.status(400).json({ message: 'Error processing referral' });
  }
});
// router.post('/use-referral', async (req, res) => {
//   const { token, email, password, username, profilePicture, selfStatement, isPrivate } = req.body;

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const { referralId } = decoded;

//     const referral = await prisma.referral.findUnique({
//       where: { id: referralId }
//     });

//     if (!referral) {
//       return res.status(400).json({ message: 'Invalid referral link' });
//     }

//     // 🔥 NEW: enforce max uses using REAL count (not usageCount)
//     const currentUses = await prisma.referralUse.count({
//       where: { referralId }
//     });

//     if (currentUses >= referral.maxUses) {
//       return res.status(403).json({ message: 'Referral limit reached' });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     // 1. Find or create user
//     let newUser = await prisma.user.findFirst({
//       where: { email: email.toLowerCase() },
//       include: { profiles: true }
//     });

//     if (!newUser) {
//       newUser = await prisma.user.create({
//         data: {
//           email: email.toLowerCase(),
//           password: hashedPassword,
//           referredById: referral.createdById
//         },
//         include: { profiles: true }
//       });
//     }

//     // 2. Prevent duplicate referral usage (CRITICAL)
//     try {
//       await prisma.referralUse.create({
//         data: {
//           referralId,
//           userId: newUser.id
//         }
//       });
//     } catch (err) {
//       if (err.code === "P2002") {
//         return res.status(409).json({
//           message: "User already used this referral"
//         });
//       }
//       throw err;
//     }

//     // 3. Create profile if needed
//     if (newUser.profiles.length === 0) {
//       const profile = await createNewProfileForUser({
//         username,
//         profilePicture,
//         selfStatement,
//         isPrivate,
//         userId: newUser.id
//       });

//       const userToken = jwt.sign(
//         { userId: newUser.id },
//         process.env.JWT_SECRET
//       );

//       return res.json({
//         firstTime: true,
//         message: "User created successfully",
//         token: userToken,
//         profile
//       });
//     }

//     return res.json({
//       message: "User already exists. Go to login or forgot password."
//     });

//   } catch (error) {
//     console.log(error);
//     res.status(400).json({ message: 'Error processing referral' });
//   }
// });
//       router.post("/session", async (req, res) => {
//   const { email, password, uId, identityToken } = req.body;

//   try {
//     let user = null;

//     // --- Apple Login ---
//     if (identityToken) {
//       const payload = await verifyAppleIdentityToken(identityToken);
//       user = await prisma.user.findFirst({
//         where: { email: payload.email },
//         select: {
//           id: true,
//           email: true,
//           profiles: { select: { id: true, username: true, profilePic: true, location: true } }
//         }
//       });
//     }

//     // --- Google Login ---
//     else if (uId) {
//       user = await prisma.user.findFirst({
//         where: { uId },
//         select: {
//           id: true,
//           email: true,
//           profiles: { select: { id: true, username: true, profilePic: true, location: true } }
//         }
//       });

//       // Fallback: find by email if needed
//       if (!user && email) {
//         user = await prisma.user.findFirst({
//           where: { email },
//           select: {
//             id: true,
//             email: true,
//             uId: true,
//             profiles: { select: { id: true, username: true, profilePic: true, location: true } }
//           }
//         });

//         // If user exists but uId not set, update
//         if (user && !user.uId) {
//           await prisma.user.update({
//             where: { email },
//             data: { uId },
//           });
//         }
//       }
//     }

//     // --- Email/Password Login ---
//     else if (email) {
//       user = await prisma.user.findFirst({
//         where: { email },
//         select: {
//           id: true,
//           email: true,
//           password: true,
//           profiles: { select: { id: true, username: true, profilePic:true, location:true} }
//         }
//       });

//       if (!user || !bcrypt.compareSync(password, user.password)) {
//         return res.status(409).json({ message: "Invalid email or password" });
//       }
//     }

//     // --- User not found ---
//     if (!user || !user.profiles || user.profiles.length === 0) {
//       return res.status(403).json({ message: "No profile found. Please create one." });
//     }

//     // Update profile activity
//     await prisma.profile.updateMany({
//       where: { userId: user.id },
//       data: { lastActive: new Date(), isActive: true },
//     });

//     // Issue JWT
//     const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

//     // Return shallow user/profile data
//     res.json({ token, profile: user.profiles[0] });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });
router.post("/session", async (req, res) => {
  const { email, password, uId, identityToken } = req.body;

  try {
    let user = null;

   
    if (identityToken) {
      const payload = await verifyAppleIdentityToken(identityToken);
      user = await prisma.user.findFirst({
        where: { email: payload.email },
        include: {
          profiles: {
            select:{
              id:true
            }
              
              
          
          }
        }
      });
    }
    // --- Google OAuth login ---
    else if (uId) {
      user = await prisma.user.findFirst({
        where: { uId:uId },
        include: {
          profiles: {
            select:{
              id:true
            }
              
            }}
      });

      // If user not found by googleId, link account by email
      
      if(email){
        try{
       user = await  prisma.user.findFirstOrThrow({where:{email:{equals:email}}})
        }catch{
       return res.status(403).json({ message: "No profile found. Apply Today." });
        }
      }
      if (!user && email) {
        user = await prisma.user.update({
          where: { email },
          data: { googleId: uId },
          include: {
            profiles: {
              select:{
                id:true
              }
            // include: {
            //   collections:true,
            //   stories: true,
            //   rolesToCollection:{
            //     include:{
            //       // profile:true,
            //       collection:true
            //     }
            //   },
            //   profileToCollections: {
            //     include: {
            //       collection: {
            //         include: {
            //           storyIdList: {
            //             include: {
            //               story: { include: { author: true } }
            //             }
            //           }
                    // }
                //   }
                // }
             // }
            }
        //  }
          }
        });
      }
    }
    // --- Email/password login ---
    else if (email) {
      user = await prisma.user.findFirst({
        where: { email },
        include: {
         profiles: {
            select: {
             id:true
              },
              
                  
                
              
            
          }
        }
      });


  // ✅ NEW: user exists but no profiles
  if (!user.profiles || user.profiles.length === 0) {
    return res.status(403).json({ message: "No profile found. Please create one." });
  }
      // Check password only for email login
      if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
        return res.status(409).json({ message: "Invalid email or password" });
      }
    }
// If user still not found
    if (!user&&!user.id) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update profile activity
     await prisma.profile.updateMany({
      where: { userId: user.id},
      data: { lastActive: new Date(), isActive: true }
    });
   user =  await prisma.user.findFirst({where:{
      id:{
        equals:user.id
        
      },
    },include:{
      profiles:{
        select:{
          id:true
        }
      }
    }})
    let profile = await prisma.profile.findFirst({where:{id:{
      equals:user.profiles[0].id,}},include:{
      profileToCollections:true,
      // collections:true,
      // stories:true
    }
    })
    console.log("X",user)
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
console.log("Y",profile)
    res.json({ token, profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//  router.post("/session", async (req, res) => {
//   const { email, password, uId, identityToken } = req.body;

//   try {
//     let user = null;

//     // --- Apple OAuth login ---
//     if (identityToken) {
//       const payload = await verifyAppleIdentityToken(identityToken);
//       user = await prisma.user.findFirst({
//         where: { email: payload.email },
//         include: {
//           profiles: {
//             select:{
//               id:true
//             }
            
//           }
//         }
//       });
//     }
//     // --- Google OAuth login ---
//     else if (uId) {
//       user = await prisma.user.findFirst({
//         where: { uId:uId },
//         include: {
//           profiles:{
//             select:{
//               id:true
//             }
//           }}}
//       )


//   if (email) {
//       user = await prisma.user.findFirst({
//         where: { email },
//         include: {
//          profiles:{
//           select:{
//             id:true
//           }
//          }
//         }
//       });
//     }
//       // Check password only for email login
//   if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
//         return res.status(409).json({ message: "Invalid email or password" });
//   }
    
//   }
  
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//   let profile = await  prisma.profile.findFirst({where:{
//     id:user.profiles[0].id
//   },include:{
//     location:true,
//     collections:true,
//     stories:true,
//     profileToCollections:{
//       include:{
//         collection:true
//       }
//     }
//   }})

//     const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

//    return res.json({ token, profile});
//   }
// }} catch (error) {
//     console.error(error);
//     res.status(408).json({ error: "Internal server error" });
//   }
// });
//       router.post("/session", async (req, res) => {
//   const { email, password, uId, identityToken } = req.body;

//   try {
//     let user = null;

   
//     if (identityToken) {
//       const payload = await verifyAppleIdentityToken(identityToken);
//       user = await prisma.user.findFirst({
//         where: { email: payload.email },
//         include: {
//           profiles: {
//             include: {
//               collections:true,
//               stories: true,
//               rolesToCollection:{
//                 include:{
//                   // profile:true,
//                   collection:true
//                 }
//               },
//               profileToCollections: {
//                 include: {
//                   collection: {
//                     include: {
//                       storyIdList: {
//                         include: {
//                           story: { include: { author: true } }
//                         }
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       });
//     }
//     // --- Google OAuth login ---
//     else if (uId) {
//       user = await prisma.user.findFirst({
//         where: { uId:uId },
//         include: {
//           profiles: {
//             include: {
//               collections:true,
//               stories: true,
//               rolesToCollection:{
//                 include:{
//                   // profile:true,
//                   collection:true
//                 }
//               },
//               profileToCollections: {
//                 include: {
//                   collection: {
//                     include: {
//                       storyIdList: {
//                         include: {
//                           story: { include: { author: true } }
//                         }
//                       }
//                     }
//                   }
//                 }
//               }}}}
//       });

//       // If user not found by googleId, link account by email
      
//       if(email){
//         try{
//        user = await  prisma.user.findFirstOrThrow({where:{email:{equals:email}},include:{
      
//        profiles: {
        
//             include: {
//               profileToCollections:{
//                 include:{
//                   collection:{
//                     include:{
//                       childCollections:true,
//                       storyIdList:true
//                     }
//                   }
//                 }
//               },
//               collections:true,
//               stories: true,
//               rolesToCollection:{
//                 include:{collection:true}}}
//        }}})
//         }catch{
//        return res.status(403).json({ message: "No profile found. Apply Today." });
//         }
//       }
//       if (!user && email) {
//         user = await prisma.user.update({
//           where: { email },
//           data: { googleId: uId },
//           include: {
//             profiles: {
//             include: {
//               collections:true,
//               stories: true,
//               rolesToCollection:{
//                 include:{
//                   // profile:true,
//                   collection:true
//                 }
//               },
//               profileToCollections: {
//                 include: {
//                   collection: {
//                     include: {
//                       storyIdList: {
//                         include: {
//                           story: { include: { author: true } }
//                         }
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//           }
//         });
//       }
//     }
//     // --- Email/password login ---
//     else if (email) {
//       user = await prisma.user.findFirst({
//         where: { email },
//         include: {
//          profiles: {
//             include: {
//               collections:true,
//               stories: true,
//               rolesToCollection:{
//                 include:{
//                   // profile:true,
//                   collection:true
//                 }
//               },
//               profileToCollections: {
//                 include: {
//                   collection: {
//                     include: {
//                       storyIdList: {
//                         include: {
//                           story: { include: { author: true } }
//                         }
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       });


//   // ✅ NEW: user exists but no profiles
//   if (!user.profiles || user.profiles.length === 0) {
//     return res.status(403).json({ message: "No profile found. Please create one." });
//   }
//       // Check password only for email login
//       if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
//         return res.status(409).json({ message: "Invalid email or password" });
//       }
//     }
// // If user still not found
//     if (!user&&!user.id) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Update profile activity
//     await prisma.profile.updateMany({
//       where: { userId: user.id },
//       data: { lastActive: new Date(), isActive: true }
//     });

//     const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
// // console.log("FCUCKCD",user)
//     res.json({ token, profile:user.profiles[0]});
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

    router.post("/newsletter",async (req,res)=>{
      try{
      const{
        
          fullName,
          igHandle,
          email,
          frequency,
          thirdPlaces
     
      
        
      }=req.body
      const user = await prisma.user.create({data:{
        email:email.toLowerCase(),
        subscription: "newsletter",
        preferredName:fullName,
        igHandle:igHandle,    
        emailFrequency:frequency??7
    }})

    const token = jwt.sign({ userId:user.id }, process.env.JWT_SECRET);
    let surveyTemplate = newsletterSurveyTemplate({params:req.body})
    let confirmationTemplate = subscriptionConfirmation({token,email:email})
    await resend.emails.send(confirmationTemplate)
    await resend.emails.send(surveyTemplate)
         
            res.status(201).json({user,message:'Success'});
          }catch(error){
            console.log(error)

            res.status(409).json({error})
          }
    })
   

router.post("/api/email-webhook", async (req, res) => {
  const email = req.body;

  console.log("Incoming Email:", email);

  const {
    from,
    to,
    subject,
    text,
    html
  } = email;

  // Save to DB
  // Trigger notification
  // Convert into feedback entry
  // etc.

  res.status(200).send("OK");
});



    const RESEND_WEBHOOK_SECRET = process.env.RESEND_SECRET;

function verifySignature(req) {
  const signature = req.headers["resend-signature"];
  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", RESEND_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return signature === expected;
}

// ---- Feedback form submission (send email) ----
router.post("/feedback", async (req, res) => {
  try {
    const { preferredName, email, subject, purpose, message } = req.body;

    const template = feedbackTemplate({
      name: preferredName,
      email,
      subject,
      purpose,
      message,
    });

    await resend.emails.send(template);
    console.log("Sent Feedback")
    return res.status(201).json({ message: "Success" });
  } catch (err) {
    console.error("Feedback error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ---- Webhook for receiving email replies ----
router.post("/email-webhook", express.json(), (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const email = req.body;

  console.log("Received Email:", {
    from: email.from,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    attachments: email.attachments,
  });


  return res.status(200).json({ received: true });
});




    router.post("/apply/ios",async (req,res)=>{
      let user = null
      const {idToken,fullName,igHandle} = req.body
  const payload = await verifyAppleIdentityToken(idToken)
  
     user =await prisma.user.findFirst({where:{
      email:{equals:payload.email}
     }})
  if(!!user){
    throw new Error("Not Unique")
  }else{
    user = await prisma.user.create({data:{
        email:payload.email.toLowerCase(),
        preferredName:fullName,
        igHandle:igHandle,
    }})
 

      let mailOptions = applyTemplate(user,req.body,false)

     let response  =  await resend.emails.send(mailOptions)
     if(response.error){
      throw response.err
     }else{
     const params = new URLSearchParams({
      applicantId:user.id,
      action:"approve",
      email,
    });
    const parms = `/auth/review?`+params.toString()

     res.status(201).json({path:parms,user,message:'Applied Successfully!'});
  }
}
    })

    router.post("/google",async (req,res)=>{
      const {email,googleId, accessToken}=req.body
      let user = await prisma.user.findFirst({where:{
        email:email
      }})
      if(user.googleId==googleId){
       user = await prisma.user.update({
            where:{
              email:email
            },
            data:{
              googleId:googleId
            }
          })
          let profile= await prisma.profile.findFirst({where:{
            userId:user.id
          }})
          res.json({profile})
      }else{
        res.json({message:"No user found"})
      }
    })
//     router.post("/register", async (req, res) => {
//   const {
//     token,
//     email,
//     password,
//     username,
//     profilePicture,
//     selfStatement,
//     privacy,
//     frequency
//   } = req.body;

//   // ✅ Validate early
//   if (!token || !username) {
//   return res.status(400).json({ message: "Missing required fields" });
// }

//   let decoded;
//   try {
//     decoded = jwt.verify(token, process.env.JWT_SECRET);
//     console.log("Decoded token:", decoded);
//   } catch (err) {
//     console.log("Token verification error:", err);
//     return res.status(401).json({ message: "Invalid or expired token" });
//   }

//   try {
//     // ✅ Find user instead of upsert
//     const existingUser = await prisma.user.findUnique({
//       where: { id: decoded.applicantId },
//       include: { profiles: true }
//     });

//     if (!existingUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // ✅ Prevent duplicate profile creation
//     if (existingUser.profiles.length > 0) {
//       const verifiedToken = jwt.sign(
//         { userId: existingUser.id },
//         process.env.JWT_SECRET
//       );

//       return res.json({
//         message: "User already has profile",
//         profile: existingUser.profiles[0],
//         token: verifiedToken
//       });
//     }

//     // ✅ Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // ✅ Update user safely
//     const updatedUser = await prisma.user.update({
//       where: { id: existingUser.id },
//       data: {
//         password: hashedPassword,
//         verified: true,
//         email,
//         emailFrequency: parseInt(frequency) || 1
//       }
//     });

//     // ✅ Create profile
//     const profile = await prisma.profile.create({
//       data: {
//         username: username.toLowerCase(),
//         profilePic: profilePicture,
//         selfStatement,
//         isPrivate: privacy,
//         user: {
//           connect: { id: updatedUser.id }
//         }
//       }
//     });

//     await createNewProfileCollections(profile);

//     // ✅ Consistent token naming
//     const verifiedToken = jwt.sign(
//       { userId: updatedUser.id },
//       process.env.JWT_SECRET
//     );

//     return res.json({
//       firstTime: true,
//       profile,
//       token: verifiedToken
//     });

//   } catch (error) {
//     console.error(error);

//     // ✅ Prisma unique constraint
//     if (error.code === "P2002") {
//       return res.status(409).json({
//         message: "Username is not unique"
//       });
//     }

//     return res.status(500).json({
//       message: "Something went wrong",
//       error: error.message
//     });
//   }
// });
router.post("/register", async (req, res) => {
 const {
  authToken,
  referralToken,
  email,
  password,
  username,
  profilePicture,
  selfStatement,
  privacy,
  frequency
} = req.body;
  console.log("Register request body:", req.body);
  // ✅ Basic validation
if (!authToken || !username || !password) {
  return res.status(400).json({ message: "Missing required fields" });
}
  let decodedAuth;
  try {
    decodedAuth = jwt.verify(authToken, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired auth token" });
  }

let referralId = null;

if (referralToken) {
  try {
    const decodedReferral = jwt.verify(
      referralToken,
      process.env.JWT_SECRET
    );
    referralId = decodedReferral.referralId;
  } catch (err) {
    console.log("Invalid referral token (ignored)");
  }
}

  try {
    // ✅ Find user
    console.log("Decoded auth token:", decodedAuth);
    const existingUser = await prisma.user.findUnique({
      where: { id: decodedAuth.userId },
      include: { profiles: true }
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Idempotent: already has profile
    if (existingUser.profiles.length > 0) {
      const verifiedToken = jwt.sign(
        { userId: existingUser.id },
        process.env.JWT_SECRET
      );

      return res.json({
        message: "User already has profile",
        profile: existingUser.profiles[0],
        token: verifiedToken
      });
    }

    // ✅ Handle referral safely
    if (referralId) {
      const referral = await prisma.referral.findUnique({
        where: { id: referralId }
      });

      if (!referral) {
        console.log("Invalid referral ID");
      } else if (referral.createdById === existingUser.id) {
        console.log("Self-referral blocked");
      } else if (referral.usageCount >= referral.maxUses) {
        console.log("Referral maxed out");
      } else {
        try {
          // 🔒 Prevent duplicates (unique constraint)
          await prisma.referralUse.create({
            data: {
              referralId,
              userId: existingUser.id
            }
          });

          // ✅ Increment usage
          await prisma.referral.update({
            where: { id: referralId },
            data: {
              usageCount: { increment: 1 }
            }
          });

          // ✅ Link user → referral
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              referredById: referralId
            }
          });

        } catch (err) {
          if (err.code === "P2002") {
            console.log("Referral already used (safe)");
          } else {
            throw err;
          }
        }
      }
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Update user
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        verified: true,
        email,
        emailFrequency: parseInt(frequency) || 1
      }
    });

    // ✅ Create profile
    const profile = await prisma.profile.create({
      data: {
        username: username.toLowerCase(),
        profilePic: profilePicture,
        selfStatement,
        isPrivate: privacy,
        user: {
          connect: { id: updatedUser.id }
        }
      }
    });

    await createNewProfileCollections(profile);

    // ✅ Return auth token
    const verifiedToken = jwt.sign(
      { userId: updatedUser.id },
      process.env.JWT_SECRET
    );

    return res.json({
      firstTime: true,
      profile,
      token: verifiedToken
    });

  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Username is not unique"
      });
    }

    return res.status(500).json({
      message: "Something went wrong",
      error: error.message
    });
  }
});
//     router.post("/register",async (req,res)=>{
    
//         const{token,idToken,email,googleId,password,username,
//         profilePicture,selfStatement,privacy,frequency
//        }=req.body
     
//        try{
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//       if(!token || (!username || !password)){
//          return res.status(400).json({ message: 'Missing required fields' });
//         }
//       const hashedPassword = await bcrypt.hash(password, 10);
//       const user =  await prisma.user.upsert({where:{
//           id:decoded.applicantId
//       },data:{
//         password:hashedPassword,
//     verified:true,
//     emailFrequency:parseInt(frequency)
//       },include:{
//         profiles:true
//       }})
//        const verifiedToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
//        let profile 

//         if(user.profiles.length<1){
            
//               profile = await prisma.profile.create({
//             data:{
//                 username:username?.toLowerCase(),
//                 profilePic:profilePicture,
//                 selfStatement,
//                 isPrivate:privacy,
//                 user:{
//                     connect:{
//                         id:user.id
//                     }
//                 }
//             }
         
//         })
//          await createNewProfileCollections(profile)
      
//         res.json({firstTime:true,profile:profile,token:verifiedToken})
//       }else{
           
// return res.json({ message: 'User has profile',profile:user.profiles[0],idToken:verifiedToken });
   
// }

        
//     } catch(error){
//         console.log(error)
//         if(error.message.includes("Unique")){
//           res.status(409).json("USERNAME IS NOT UNIQUE")
//         }else{

//         res.status(409).json({error})
//         }
//       }
//     })

    router.post("/",async (req,res)=>{
        try{
           
                const {id,email,uId,profile,pages,books,libraries}= req.body
            
        
        let user = await  prisma.user.create({data:{
            email:email.toLowerCase(),
            uId:id,
            verified:false
        }
        ,include:{
          profiles:true
        }})
        
    
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
       res.json({error})
    }
    })
    router.delete("/session",authMiddleware,async (req,res)=>{

         try{     
      if(req.user){
        await prisma.profile.updateMany({where:{
            userId:{equals:req.user.id}
            
        },data:{
            isActive:false,
        }})
  
      
         
        res.status(200).json({message:"Logged Out"})

 
    }
 
}catch(e){
  console.log(e)
    res.status(404).json({message:"User not found"})
}



    })
    router.get("/check-username", async (req, res) => {
      const { username } = req.query;
  
      if (!username) {
          return res.status(400).json({ message: "Username is required" });
      }
  
      try {
          const existingUser = await prisma.profile.findUnique({
              where: { username },
          });
  
          if (existingUser) {
              return res.json({ available: false, message: "Username is already taken" });
          }
  
          return res.json({ available: true, message: "Username is available" });
  
      } catch (error) {
          console.error("Error checking username:", error);
          return res.status(500).json({ message: "Internal server error" });
      }
  });   

    return router
}

