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
const { google } = require('googleapis');

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
            username:username,
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
      console.log("token",token)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const {userId}=decoded
        console.log("Decode",decoded)
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
    router.post('/generate-referral', authMiddleware,async (req, res) => {
      const userId  = req.user.id;
      try {
      const DAILY_LIMIT=5
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of the day
  
      // Count how many referrals the user has created today
      const referralsToday = await prisma.referral.count({
          where: {
            createdById:{equals:userId},
              createdAt: {
                  gte: today, // Get referrals created today
              },
          },
      });
  
  
   

  if (referralsToday >= 5) {
    const latestReferral = await prisma.referral.findFirst({
      where: {
         createdById:{equals:userId},
          usageCount: { lt: 5 }, 
      },
      orderBy: {
          createdAt: "desc", // Get the latest one
      },
  });
  const token = jwt.sign({referralId:latestReferral.id}, process.env.JWT_SECRET);
   
  res.json({ referralLink: `${process.env.DOMAIN}/register?token=${token}`,message: 'Max Usage Limit of Referral:\nGood job sharing! Add more friends tomorrow. Enjoy your friends today. '  });

      }else{
    
        const referral = await prisma.referral.create({
          data: {
            createdBy:{
              connect:{
                id:userId
              }
            }
          }
        });
        const token = jwt.sign({referralId:referral.id}, process.env.JWT_SECRET);

           res.json({ referralLink: `${process.env.DOMAIN}/register?token=${token}`,referral:referral});
     } } catch (error) {
        console.error(error);
      res.status(500).json({ message: 'Error generating referral link' });
      }
    });
    router.post("/referral",authMiddleware,async (req,res)=>{
    const {email,name}=req.body
try{

const user = await prisma.user.create({
  data:{
    email:email.toLowerCase(),
    verified:false,
  }
})


   

const mailOptions = recievedReferralTemplate(email,name)

          
  
             resend.emails.send(mailOptions).then(()=>{
              res.json({user,message:'Referred Succesfully!'});
            }).catch(err=>{
              throw err
            })

        }catch(error){
  res.json({error})
}})

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
        let user =  await prisma.user.findFirstOrThrow({where:{email:{equalsemail
          }},include:{
            profiles:true
          }})

let mailOptions = forgotPasswordTemplate(user)

                resend.emails.send(mailOptions).then(res=>{
                  res.status(201).json({path:parms,user,message:'Applied Successfully!'});
          
                }).catch(err=>{throw err})
                
                res.status(200).json({message:"If there is an account you will recieve an email"})
                }catch(err){
   
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

      router.post('/use-referral', async (req, res) => {
        const { token, email, password ,username,profilePicture,selfStatement,isPrivate} = req.body;
      
        try {
      
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const {referralId}=decoded
          const referral = await prisma.referral.findUnique({ where: { id:referralId} });
          
          if (!referral){
            return res.status(400).json({ message: 'Invalid referral link' });
          }else{
          if (referral.usageCount >= referral.maxUses){
             return res.status(403).json({ message: 'Referral limit reached' });

          }else{
        let newUser = await  prisma.user.findFirst({where:{
            email:{
              equals:email
            }
          },include:{
            profiles:true
          }})
          const hashedPassword = await bcrypt.hash(password, 10);
          if(!newUser){

       newUser = await prisma.user.create({
            data: {
              email:email.toLowerCase(),
              password:hashedPassword, // You should hash the password before storing it
              referredById: referral.createdById
            },include:{
              profiles:true
            }
          });
        }
    
        if(newUser&&newUser.profiles && newUser.profiles.length==0){
    const profile =  await createNewProfileForUser({username,profilePicture,selfStatement,isPrivate,userId:newUser.id})
          console.log(profile)
          await prisma.referral.update({
            where: {id:referralId },
            data: { usageCount: { increment: 1 } }
          });
        
         const userToken = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET);
          res.json({ firstTime:true,message: 'User created successfully',token:userToken,profile:profile});
        }else{
         
          res.json({ message:"User already exists. Go to forgot password at login"});
        }}}
        } catch (error) {
          console.log(error);
          res.status(400).json({ message: 'Error processing referral' });
        }
      });
      router.post("/session", async (req, res) => {
  const { email, password, uId, identityToken } = req.body;
console.log(req.body)
  try {
    let user = null;

    // --- Apple OAuth login ---
    if (identityToken) {
      const payload = await verifyAppleIdentityToken(identityToken);
      user = await prisma.user.findFirst({
        where: { email: payload.email },
        include: {
          profiles: {
            include: {
              stories: true,
              profileToCollections: {
                include: {
                  collection: {
                    include: {
                      storyIdList: {
                        include: {
                          story: { include: { author: true } }
                        }
                      }
                    }
                  }
                }
              }
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
            include: {
              stories: true,
              profileToCollections: {
                include: {
                  collection: {
                    include: {
                      storyIdList: {
                        include: {
                          story: { include: { author: true } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      // If user not found by googleId, link account by email
      if (!user && email) {
        user = await prisma.user.update({
          where: { email },
          data: { googleId: uId },
          include: {
            profiles: {
              include: {
                stories: true,
                profileToCollections: {
                  include: {
                    collection: {
                      include: {
                        storyIdList: {
                          include: {
                            story: { include: { author: true } }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
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
            include: {
              stories: true,
              profileToCollections: { include: { collection: true } }
            }
          }
        }
      });

      // Check password only for email login
      if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
        return res.status(409).json({ message: "Invalid email or password" });
      }
    }

    // If user still not found
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update profile activity
    await prisma.profile.updateMany({
      where: { userId: user.id },
      data: { lastActive: new Date(), isActive: true }
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//     router.post("/session",async (req,res)=>{
//         const { email, password, uId,identityToken} = req.body;
      
//        try{
      
//         let user = null
//         if(identityToken){

//         const payload = await verifyAppleIdentityToken(identityToken)
//         user = await prisma.user.findFirst({where:{email:{equals:payload.email}}})
       
//       }else if(uId){


//           user = await prisma.user.findFirst({where:{
//               googleId:uId
//             },include:{
//               profiles:{
//             include:{
//               stories:true,
//               profileToCollections:{
//                 include:{
//                   collection:{
//                     include:{
//                       storyIdList:{
//                         include:{
//                           story:{
//                             include:{
//                               author:true
//                             }
//                           }
//                         }
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//             }})
//           if(!user){
//            user = await prisma.user.update({where:{
//               email:email,
              
//             },data:{
//               googleId:uId
//             },include:{
//               profiles:{
//             include:{
//               stories:true,
              
//               profileToCollections:{
//                 include:{
//                   collection:{
//                     include:{
//                       storyIdList:{
//                         include:{
//                           story:{
//                             include:{
//                               author:true
//                             }
//                           }
//                         }
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//               }
//             }})
//           }

        

//         }else{
//           user = await prisma.user.findFirst({ where: { email:email },include:{profiles:{
//             include:{
//               stories:true,
//               profileToCollections:{
//                 include:{
//                   collection:true
//                 }
//               }
//             }
//           }}});
//           if(uId){
//           user = await prisma.user.update({where:{
//               email:email
//             },data:{
//               googleId:uId,
//               lastActive: new Date(),
//           isActive:true
//             },include:{
//               profiles:{
//             include:{
//               stories:true,
//               profileToCollections:{
//                 include:{
//                   collection:{
//                     include:{
//                       storyIdList:{
//                         include:{
//                           story:{
//                             include:{
//                               author:true
//                             }
//                           }
//                         }
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//             }})
//           }
//           if(identityToken){
//             const payload = await verifyAppleIdentityToken(identityToken)
//         user = await prisma.user.findFirst({where:{email:{equals:payload.email}},include:{
//           profiles:{
//             include:{
//               stories:true,
//               profileToCollections:{
//                 include:{
//                   collection:{
//                     include:{
//                       storyIdList:{
//                         include:{
//                           story:{
//                             include:{
//                               author:true
//                             }
//                           }
//                         }
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }})
     
//           }
//           if(!user){
//                  user = await prisma.user.findFirst({where:{email:{equals:email}},include:{
//           profiles:{
//             include:{
//               stories:true,
//               profileToCollections:{
//                 include:{
//                   collection:{
//                     include:{
//                       storyIdList:{
//                         include:{
//                           story:{
//                             include:{
//                               author:true
//                             }
//                           }
//                         }
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }})
//           }
//          if (!bcrypt.compareSync(password, user.password) ) {
            
//                 return res.status(409).json({ message: 'Invalid email or password' });
//             }
//         }
         
      
//         await prisma.profile.updateMany({where:{
//           userId:{
//             equals:user.id
//           }
//         },data:{
//           lastActive: new Date(),
//           isActive:true
//        }})

//         const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
//         res.json({ token,user});
   
       
// }catch(error){
// console.log(error)
//   res.status(404).json({error})
// }

// })
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
    router.post("/feedback",async (req,res)=>{
      try{
      const{
          preferredName,
          email,
          subject,
          purpose,
          message
      }=req.body
    
let template = feedbackTemplate({email,name:preferredName,subject,message,purpose})

resend.emails.send(template).then(()=>{
  res.status(201).json({message:'Success'});
}).catch(err=>{
  throw err
})
          }catch(error){
            console.log(error)

            res.status(409).json({error})
          }
    })
    


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
    router.post("/register",async (req,res)=>{
    
        const{token,idToken,email,googleId,password,username,
        profilePicture,selfStatement,privacy,frequency
       }=req.body
     
       try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
     
      if(!token || (!username || !password)){
         return res.status(400).json({ message: 'Missing required fields' });
        }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user =  await prisma.user.update({where:{
          id:decoded.applicantId
      },data:{
        password:hashedPassword,
    verified:true,
    emailFrequency:parseInt(frequency)
      },include:{
        profiles:true
      }})
       const verifiedToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
       let profile 

        if(user.profiles.length<1){
            
              profile = await prisma.profile.create({
            data:{
                username:username,
                profilePic:profilePicture,
                selfStatement,
                isPrivate:privacy,
                user:{
                    connect:{
                        id:user.id
                    }
                }
            }
         
        })
         await createNewProfileCollections(profile)
        res.json({firstTime:true,profile:profile,token:verifiedToken})
      }else{
return res.json({ message: 'User has profile',profile:user.profiles[0],idToken:verifiedToken });
   
}

        
    } catch(error){
        console.log(error)
        if(error.message.includes("Unique")){
          res.status(409).json("USERNAME IS NOT UNIQUE")
        }else{

        res.status(409).json({error})
        }
      }
    })

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
        
      //  let prof = await prisma.profile.create({
      //       data:{
               
      //           profilePic:profile.profilePicture,
      //           username:profile.username,
                
      //           selfStatement:profile.selfStatement,
      //           user:{
      //               connect:{
      //               id:user.id
      //           }},
      //           isPrivate:profile.privacy  
      //       }
      //   })
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

