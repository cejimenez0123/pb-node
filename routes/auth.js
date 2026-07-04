const express = require('express');
const router = express.Router()
const prisma = require("../db");
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken');
const newsletterWelcomeTemplate = require("../html/newsletterWelcome")
const applicationConfirmationTemplate = require("../html/applicationConfirmationTemplate")
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

const { verifyGoogleIdToken } = require('../utils/ verifyGoogleIdToken');
const createNewProfileUser = require('../utils/createNewProfileUser');
const { SPRINT_SLOTS } = require('../cron/sprint');
const requireModerator = require('../middleware/requireModeration');
function isHex(num) {

  return Boolean(num.match(/^0x[0-9a-f]+$/i))
}
 const CURRENT_TERMS_VERSION = "2026-07-01";
module.exports = function (authMiddleware){
     const authMod = [authMiddleware, requireModerator];
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


router.post("/apply", async (req, res) => {


  const {
    email,
    igHandle,
    fullName,
    whyApply,
    howFindOut,
    communityNeeds,
    writingOutcome,
    events,
    selectedEvents,
    otherEvent,
    eventPain,
  } = req.body;

  try {
    const cleanEmail =
      email && email.trim() ? email.trim().toLowerCase() : null;

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        preferredName: fullName,
      },
    });

    // IMPORTANT: ensure full payload goes into template
    const mailOptions = applyTemplate(user, {
      email: cleanEmail,
      igHandle,
      fullName,
      whyApply,
      howFindOut,
      communityNeeds,
      writingOutcome,
      events,
      selectedEvents,
      otherEvent,
      eventPain,
    });

    const template = applicationConfirmationTemplate(user);

    const confirmRes = await resend.emails.send(template);
    if (confirmRes?.error) {
      console.error("CONFIRM EMAIL ERROR:", confirmRes.error);
    }

    const applyRes = await resend.emails.send(mailOptions);
    if (applyRes?.error) {
      console.error("APPLY EMAIL ERROR:", applyRes.error);
      throw new Error(applyRes.error.message);
    }

    const params = new URLSearchParams({
      applicantId: user.id,
      action: "approve",
      email: user.email,
    });

    const path = `/auth/review?${params.toString()}`;

    return res.status(201).json({
      path,
      user,
      message: "Applied Successfully!",
    });

  } catch (error) {

  // Currently just logs and returns raw error
  if (error.code === "P2002") {
    return res.status(409).json({ message: "An account with this email already exists." });
  }
  if (error.code === "P2025") {
    return res.status(404).json({ message: "Something went wrong creating your account." });
  }
  return res.status(500).json({ message: "Unable to process your application. Please try again." });

  }
});
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
   

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({ message: "This reset link has expired. Please request a new one." });
  }
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid reset link." });
  }
  return res.status(500).json({ message: "Unable to reset password. Please try again." });

  }
    })
  
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
             
         } catch (error) {
  if (error.code === "P2025") {
    return res.status(404).json({ message: "No account found with that email." });
  }
  if (error.code === "P2002") {
    return res.status(409).json({ message: "You're already subscribed." });
  }
  return res.status(500).json({ message: "Unable to subscribe. Please try again." });
}

  })
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body
  try {
    let user = await prisma.user.findFirstOrThrow({
      where: { email: { equals: email } },
      include: { profiles: true }
    })

    let mailOptions = forgotPasswordTemplate(user)

    try {
      await resend.emails.send(mailOptions)
    } catch (emailErr) {
      console.error("Email send failed:", emailErr)
      // Still return the vague message so you don't leak whether the account exists
    }

    return res.status(200).json({ message: "If there is an account you will receive an email" })

  } catch (err) {
    return res.status(409).json({ message: "If there is an account you will receive an email" })
  }

})
// backend route
router.post('/accept-terms', authMiddleware, async (req, res) => {
  const { version } = req.body;
  await prisma.user.update({
    where: { id: req.user.id },
    data: { termsAcceptedAt: new Date(), termsVersion: version }
  });
  res.json({ ok: true });
});
//     router.post("/forgot-password",async (req,res)=>{
//         const {email}=req.body

//         try{
//         let user =  await prisma.user.findFirstOrThrow({where:{email:{equals:email
//           }},include:{
//             profiles:true
//           }})

// let mailOptions = forgotPasswordTemplate(user)

//                 resend.emails.send(mailOptions).then(res=>{
//                   res.json({user,message:'Applied Successfully!'});
          
//                 }).catch(err=>{throw err})
                
//               return  res.status(200).json({message:"If there is an account you will recieve an email"})
//                 }catch(err){
 
//                  return res.status(409).json({err,message:"If there is an account you will recieve an email"})
//                 }
//     })
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
      const profile = await createNewProfileUser({
        username,
        profilePicture,
        selfStatement,
        isPrivate,
        userId: newUser.id,
        writingSprintSlots: sanitizedSlots
      });

     
const token = jwt.sign(
  { userId:  newUser.id , profileId: profile.id },
  process.env.JWT_SECRET
);
      return res.json({
        firstTime: true,
        token,
        profile
      });
    }

    return res.json({
      message: "User already exists. Please login."
    });

 } catch (error) {
  if (error.name === "TokenExpiredError") {
    return res.status(401).json({ message: "This invite link has expired." });
  }
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "This invite link is invalid." });
  }
  if (error.code === "P2002") {
    return res.status(409).json({ message: "This invite has already been used." });
  }
  return res.status(400).json({ message: "Unable to process invite. Please request a new link." });
}
});

router.post("/session", async (req, res) => {
  const { email, password,  identityToken, idToken } = req.body;

  try {
    let user = null;
    let lookupEmail = email;

    // =====================================================
    // 🔵 GOOGLE LOGIN
    // =====================================================
    if (idToken) {
      const googleUser = await verifyGoogleIdToken(idToken);

      if (!googleUser?.sub || !googleUser?.email) {
        return res.status(401).json({ message: "Invalid Google token." });
      }

      lookupEmail = googleUser.email;

      user = await prisma.user.findFirst({
        where: { uId: googleUser.sub },
        include: { profiles: { select: { id: true } } },
      });

      if (!user) {
        user = await prisma.user.findFirst({
          where: { email: googleUser.email },
          include: { profiles: { select: { id: true } } },
        });

        if (user && !user.uId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { uId: googleUser.sub },
            include: { profiles: { select: { id: true } } },
          });
        }
      }

      if (!user) {
        return res.status(404).json({ message: "No account found for this Google ID. Please apply first." });
      }
    }

else if (identityToken) {
  console.log('🍎 APPLE LOGIN ATTEMPT');
  console.log('identityToken (first 30):', identityToken?.slice(0, 30));

  let appleUser;
  try {
    appleUser = await verifyAppleIdentityToken(identityToken);

  } catch (e) {
    console.error('❌ verifyAppleIdentityToken FAILED:', e.message);
    return res.status(401).json({ message: `Apple token verification failed: ${e.message}` });
  }

  if (!appleUser?.sub) {
    console.error('❌ No sub in appleUser');
    return res.status(401).json({ message: "Invalid Apple token." });
  }

  user = await prisma.user.findFirst({
    where: { uId: appleUser.sub },
    include: { profiles: { select: { id: true } } },
  });
  console.log('sub lookup result:', user ? `found user ${user.id}` : 'no user found');

  if (!user && appleUser.email) {
    console.log('trying email fallback:', appleUser.email);
    user = await prisma.user.findFirst({
      where: { email: appleUser.email },
      include: { profiles: { select: { id: true } } },
    });
    console.log('email lookup result:', user ? `found user ${user.id}` : 'no user found');

    if (user && !user.uId) {
      console.log('stamping sub onto user:', user.id);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { uId: appleUser.sub },
        include: { profiles: { select: { id: true } } },
      });
    }
  }

  if (!user) {
    console.error('❌ No user found for sub:', appleUser.sub, 'email:', appleUser.email);
    return res.status(404).json({ message: "No account found for this Apple ID. Please apply first." });
  }
}
    // =====================================================
    // 📧 EMAIL/PASSWORD LOGIN
    // =====================================================
    if (!user && lookupEmail) {
      user = await prisma.user.findFirst({
        where: { email: lookupEmail },
        include: { profiles: { select: { id: true } } },
      });
    }

    // =====================================================
    // 🔐 PASSWORD CHECK
    // =====================================================
    if (password) {
      if (!user) {
        return res.status(404).json({ message: "No account found with that email." });
      }

      if (!user.password) {
        return res.status(409).json({ message: "This account uses Google or Apple login." });
      }

      const valid = bcrypt.compareSync(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Incorrect password." });
      }
    }

    // =====================================================
    // 🚫 FINAL GUARDS
    // =====================================================
    if (!user?.id) {
      return res.status(404).json({ message: "No account found. Please apply first." });
    }

 

    if (!user.profiles?.length) {
      return res.status(403).json({ message: "Account found but no profile exists. Please complete registration." });
    }

    // =====================================================
    // 🟢 UPDATE ACTIVITY
    // =====================================================
    await prisma.profile.updateMany({
      where: { userId: user.id },
      data: { lastActive: new Date(), isActive: true },
    });

    const freshUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
      include: { profiles: { select: { id: true } } },
    });

    const profileId = freshUser?.profiles?.[0]?.id;

    if (!profileId) {
      return res.status(403).json({ message: "Profile missing. Please contact support." });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        user: { select: { lastLogin: true } },
        profileToCollections: {
          include: {
            collection: {
              include: {
                storyIdList: { select: { story: { select: { id: true, title: true } } } },
                childCollections: { select: { childCollection: { select: { id: true, title: true } } } },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return res.status(403).json({ message: "Profile could not be loaded." });
    }


    const termsCurrent = freshUser.termsVersion === CURRENT_TERMS_VERSION;

    const token = jwt.sign(
      { userId: freshUser.id, profileId: profile.id },
      process.env.JWT_SECRET
    );
 return res.json({ token, profile, termsCurrent });
  } catch (error) {
    console.error("SESSION ERROR:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token." });
    }

    return res.status(500).json({ message: "Unable to log in. Please try again." });
  }
});

router.post("/reports", authMiddleware, async (req, res) => {
  const { contentType, contentId, reportedProfileId, reason, reasonDetails } = req.body;

  if (!contentType || !contentId || !reportedProfileId || !reason) {
    return res.status(400).json({ error: new Error("Missing required report fields") });
  }

 

  try {
    const report = await prisma.report.create({
      data: {
        reporterProfileId: req.user.profiles[0].id,
        reportedProfileId,
        contentType,
        contentId,
        reason,
        reasonDetails: reasonDetails?.trim() || null,
      },
    });
        const reportedProfile = await prisma.profile.findUnique({
      where: { id: reportedProfileId },
      select: { username: true },
    });
  resend.emails.send(
      adminNotificationTemplate({
        type: "report",
        reporterUsername: req.user.profiles[0].username,
        reportedUsername: reportedProfile?.username ?? "unknown",
        reason,
        reasonDetails,
        contentType,
        contentId,
      })
    ).catch((err) => console.error("Report notification email failed:", err));

    res.json({ report });
  } catch (error) {
    console.log(error);
    res.status(409).json({ error });
  }
});
// router.post("/blocks", authMiddleware, async (req, res) => {
//   const { blockedProfileId, reason } = req.body;
//   if (!blockedProfileId) {
//     return res.status(400).json({ error: "blockedProfileId is required" });
//   }
//   const blockerProfileId = req.user.profiles[0].id;
//   if (blockedProfileId === blockerProfileId) {
//     return res.status(400).json({ error: "You can't block yourself" });
//   }

//   try {
//     const existing = await prisma.block.findUnique({
//       where: {
//         blockerProfileId_blockedProfileId: {
//           blockerProfileId,
//           blockedProfileId,
//         },
//       },
//     });

//     if (existing) {
//       // Already blocked — treat as success, no duplicate report
//       return res.json({ block: existing });
//     }

//     const block = await prisma.block.create({
//       data: { blockerProfileId, blockedProfileId, reason },
//     });

//     await prisma.report.create({
//       data: {
//         reporterProfileId: blockerProfileId,
//         reportedProfileId: blockedProfileId,
//         contentType: "profile_block",
//         contentId: blockedProfileId,
//         reason: reason || "User blocked via block action",
//       },
//     });

//     console.log(`🚫 Block: profile ${blockerProfileId} blocked ${blockedProfileId}`);
//     res.json({ block });
//   } catch (error) {
//     console.log("POST BLOCKS XL ",error);
//     res.status(500).json({ error: "Failed to block user" });
//   }
// });
router.post("/blocks", authMiddleware, async (req, res) => {
  const { blockedProfileId, reason } = req.body;
  if (!blockedProfileId) {
    return res.status(400).json({ error: "blockedProfileId is required" });
  }
  const blockerProfileId = req.user.profiles[0].id;
  if (blockedProfileId === blockerProfileId) {
    return res.status(400).json({ error: "You can't block yourself" });
  }

  try {
    const existing = await prisma.block.findUnique({
      where: {
        blockerProfileId_blockedProfileId: { blockerProfileId, blockedProfileId },
      },
    });

    if (existing) {
      return res.json({ block: existing });
    }

    const block = await prisma.block.create({
      data: { blockerProfileId, blockedProfileId, reason },
    });

    await prisma.report.create({
      data: {
        reporterProfileId: blockerProfileId,
        reportedProfileId: blockedProfileId,
        contentType: "profile_block",
        contentId: blockedProfileId,
        reason: reason || "User blocked via block action",
      },
    });

    const [blockerProfile, blockedProfile] = await Promise.all([
      prisma.profile.findUnique({ where: { id: blockerProfileId }, select: { username: true } }),
      prisma.profile.findUnique({ where: { id: blockedProfileId }, select: { username: true } }),
    ]);

    resend.emails.send(
      adminNotificationTemplate({
        type: "block",
        reporterUsername: blockerProfile?.username ?? "unknown",
        reportedUsername: blockedProfile?.username ?? "unknown",
        reason,
      })
    ).catch((err) => console.error("Block notification email failed:", err));

    console.log(`🚫 Block: profile ${blockerProfileId} blocked ${blockedProfileId}`);
    res.json({ block });
  } catch (error) {
    console.log("POST BLOCKS XL ", error);
    res.status(500).json({ error: "Failed to block user" });
  }
});

router.get(
  "/blocked",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id; // from your auth middleware

      const user = await User.findById(userId)
        .select("blockedUserIds")
        .lean();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If you want full profiles of blocked users, join/populate here.
      // Example if you store only IDs:
      const blockedUserIds = user.blockedUserIds || [];

      // Optional: populate basic info if you have a Profile model
      // const blockedProfiles = await Profile.find({ userId: { $in: blockedUserIds } })
      //   .select("userId username profilePic")
      //   .lean();

      res.json({ blockedUserIds });
      // or: res.json({ blocked: blockedProfiles });
    } catch (err) {
      console.error("Error fetching blocked list:", err);
      res.status(500).json({ error: "Failed to fetch blocked list" });
    }
  }
);
// server/routes/blocks.js (or wherever your /auth/blocks route is)
// GET /auth/admin/blocks
router.get("/admin/blocks", authMod, async (req, res) => {
  try {
    const blocks = await prisma.block.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        blockerProfile: { select: { username: true } },
        blockedProfile: { select: { username: true } },
      },
    });

    const events = blocks.map((b) => ({
      id: b.id,
      blockerProfileId: b.blockerProfileId,
      blockedProfileId: b.blockedProfileId,
      blockerUsername: b.blockerProfile.username,
      blockedUsername: b.blockedProfile.username,
      reason: b.reason,
      createdAt: b.createdAt,
      acknowledged: b.acknowledged,
    }));

    res.json({ events });
  } catch (error) {
    console.error("Error fetching block events:", error);
    res.status(500).json({ error: "Failed to fetch block events" });
  }
});

// POST /auth/admin/blocks/acknowledge
router.post("/admin/blocks/acknowledge", authMod, async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    const updated = await prisma.block.update({
      where: { id: eventId },
      data: { acknowledged: true, acknowledgedAt: new Date() },
    });

    res.json({ ok: true, id: updated.id });
  } catch (error) {
    console.error("Error acknowledging block event:", error);
    res.status(500).json({ error: "Failed to acknowledge block event" });
  }
});
router.get("/blocks", authMiddleware, async (req, res) => {
  try {
    const blockerProfileId = req.user.profiles[0].id;

    // Get blocked IDs
    const blocks = await prisma.block.findMany({
      where: { blockerProfileId },
      select: { blockedProfileId: true },
    });

    const blockedProfileIds = blocks.map((b) => b.blockedProfileId);

    // Fetch profile info for each blocked profile
    const blockedProfiles = await prisma.profile.findMany({
      where: {
        id: { in: blockedProfileIds },
      },
      select: {
        id: true,
        username: true,
        profilePic: true,
      },
    });

    console.log(
      `User ${blockerProfileId} has blocked profiles:`,
      blockedProfiles
    );

    res.json({
      blockedProfiles, // [{ id, username, profilePic }, ...]
    });
  } catch (error) {
    console.error(error);
    res.status(409).json({ error });
  }
});


router.delete("/blocks/:blockedProfileId", authMiddleware, async (req, res) => {
  try {
    await prisma.block.delete({
      where: {
        blockerProfileId_blockedProfileId: {
          blockerProfileId: req.user.profiles[0].id,
          blockedProfileId: req.params.blockedProfileId,
        },
      },
    });
    res.json({ ok: true });
  } catch (error) {
    console.log(error);
    res.status(409).json({ error });
  }
});

// routes/moderationAdmin.js


router.get("/admin/reports", authMod, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { status: "pending" },
      include: { reportedProfile: { select: { username: true } } },
      orderBy: { createdAt: "asc" },
    });

    const grouped = {};
    for (const r of reports) {
      if (!grouped[r.reportedProfileId]) {
        grouped[r.reportedProfileId] = {
          reportedProfileId: r.reportedProfileId,
          username: r.reportedProfile?.username ?? "unknown",
          reports: [],
        };
      }
      grouped[r.reportedProfileId].reports.push({
        id: r.id,
        contentType: r.contentType,
        contentId: r.contentId,
        reason: r.reason,
        reasonDetails: r.reasonDetails, // ← include details
      });
    }

    res.json({ reports: Object.values(grouped) });
  } catch (error) {
    console.log(error);
    res.status(409).json({ error });
  }
});

// router.get("/admin/reports", authMod, async (req, res) => {
//   try {
//     const reports = await prisma.report.findMany({
//       where: { status: "pending" },
//       include: { reportedProfile: { select: { username: true } } },
//       orderBy: { createdAt: "asc" },
//     });

//     const grouped = {};
//     for (const r of reports) {
//       if (!grouped[r.reportedProfileId]) {
//         grouped[r.reportedProfileId] = {
//           reportedProfileId: r.reportedProfileId,
//           username: r.reportedProfile?.username ?? "unknown",
//           reports: [],
//         };
//       }
//       grouped[r.reportedProfileId].reports.push({
//         id: r.id,
//         contentType: r.contentType,
//         contentId: r.contentId,
//         reason: r.reason,
//       });
//     }

//     res.json({ reports: Object.values(grouped) });
//   } catch (error) {
//     console.log(error);
//     res.status(409).json({ error });
//   }
// });

router.post("/admin/ban", authMod,async (req, res) => {
  const { reportedProfileId, reportIds } = req.body;
  try {
    await prisma.profile.update({
      where: { id: reportedProfileId },
      data: { isBanned: true },
    });
    await prisma.report.updateMany({
      where: { id: { in: reportIds } },
      data: { status: "actioned" },
    });
    res.json({ ok: true });
  } catch (error) {
    console.log(error);
    res.status(409).json({ error });
  }
});

router.post("/admin/dismiss", authMod, async (req, res) => {
  const { reportIds } = req.body;
  try {
    await prisma.report.updateMany({
      where: { id: { in: reportIds } },
      data: { status: "dismissed" },
    });
    res.json({ ok: true });
  } catch (error) {
    console.log(error);
    res.status(409).json({ error });
  }
});

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


router.post("/register", async (req, res) => {
  const {
    referralToken, 
    password,
    username,
    profilePicture,
    selfStatement,
    privacy,
    frequency,
    writingSprintSlots
  } = req.body;
   const validSlotIds = Object.keys(SPRINT_SLOTS);
  const sanitizedSlots = Array.isArray(writingSprintSlots)
    ? writingSprintSlots.filter((s) => validSlotIds.includes(s))
    : [];
  if (!referralToken || !username || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  let decoded;
  try {
    decoded = jwt.verify(referralToken, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const { applicantId, referralId } = decoded;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: applicantId },
      include: { profiles: true }
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Already registered
    if (existingUser.profiles.length > 0) {
   
  const token = jwt.sign(
  { userId: existingUser.id, profileId: profile.id },
  process.env.JWT_SECRET
);
      return res.json({
        message: "User already has profile",
        profile: existingUser.profiles[0],
        token: verifiedToken
      });
    }

    // ✅ Handle referral (if present in token)
    if (referralId) {
      try {
        const referral = await prisma.referral.findUnique({
          where: { id: referralId }
        });

        if (!referral) {
          console.log("Invalid referral");
        } else if (referral.createdById === existingUser.id) {
          console.log("Self-referral blocked");
        } else if (referral.usageCount >= referral.maxUses) {
          console.log("Referral maxed out");
        } else {
          await prisma.referral.update({
            where: { id: referralId },
            data: {
              usageCount: { increment: 1 }
            }
          });

          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              referredById: referralId
            }
          });
        }
      } catch (err) {
       if (err.code === 'P2002' && err.meta?.target?.includes('username')) {
    return res.status(409).json({ message: "Username is already taken" });
  }
  return res.status(500).json({ message: "Something went wrong" });
      }
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        verified: true,
        emailFrequency: parseInt(frequency) || 1
      }
    });
    const profile = await  createNewProfileUser({username,profilePicture,selfStatement,isPrivate:privacy,userId:updatedUser.id,writingSprintSlots:sanitizedSlots})


  
  const verifiedToken = jwt.sign(
  { userId: updatedUser.id, profileId: profile.id },
  process.env.JWT_SECRET
);
    return res.json({
      message: "User registered successfully",
      profile:profile,
      token: verifiedToken
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

    
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


async function sendEmailSafe(options, label) {
  const res = await resend.emails.send(options)

  if (res.error) {
    console.error(`${label} failed:`, res.error)
    throw new Error(res.error.message)
  }

  return res
}