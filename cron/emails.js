const cron = require('node-cron');
const sendEventNewsletterEmail = require('../newsletter/sendEventNewsletterEmail');
const fetchEvents = require('../newsletter/fetchEvents');
const notificationTemplate = require("../html/notificationTemplate")
const prisma = require("../db")
const sleep = require("../utils/sleep")
const sendEmail = require("../newsletter/sendEmail")
const fetchAlerts = require("../newsletter/fetchAlerts")

// const cron = require('node-cron');
// const sendEventNewsletterEmail = require('../newsletter/sendEventNewsletterEmail');
// const fetchEvents = require('../newsletter/fetchEvents');
// const notificationTemplate = require("../html/notificationTemplate");
// const prisma = require("../db");
// const sleep = require("../utils/sleep");
// const sendEmail = require("../newsletter/sendEmail");
// const fetchAlerts = require("../newsletter/fetchAlerts");

// const dailyJob = cron.schedule("0 9 * * *", async () => {

//   // await dailyTask();
// });

// const dailyTask=async ()=>{
//   const users = await prisma.user.findMany({include:{
//     profiles:true
//   }})

//   for(let i=0;i<users.length;i++){
//     const user = users[i]
//     const profile = user.profiles[0]
//     if(profile){
     
//       if (shouldSendEmail(user.lastEmailed, user.emailFrequency)) {
//       let profile = await prisma.profile.findFirst({where:{user:{email:{equals:user.email}}}})
//       let notify = await fetchAlerts(profile)
//      const {comments,roles,following,followers,collections,events} = notify
//       let template = notificationTemplate({email:user.email},notify)
//       await sleep(1000)
// if(comments.length>0||roles.length>0||following.length>0||followers.length>0||collections.length>0||events.length>0){
//       await sendEmail(template)
  
//  await prisma.user.update({where:{id:user.id},data:{
//           lastEmailed: new Date()
//         }})
      
     
     
// }else{
  
// }
//   } else {
//       console.log("Not enough time has passed since the last email.");
//   }
// }
//   }
// }
// const weeklyJob = cron.schedule('0 9 * * 6,0', async () => {
//   try {
//     const today = new Date().getDay();

//     // Saturday → batch 0, Sunday → batch 1
//     const batchIndex = today === 6 ? 0 : 1;

//     await weeklyEmail(batchIndex);
//   } catch (err) {
//     console.error("WEEKLY JOB ERROR: " + err.message);
//   }
// });

// // const weeklyJob = cron.schedule('0 9 * * 0,1', async () => {
// //   try{
// // weeklyEmail()
// // }catch(err){
// //   console.err("WEEKLY JOB ERROR"+err.message)
    
// //   }

// // })
// const WEEKLY_BATCH_SIZE = 100;

// const weeklyEmail = async (batchIndex = 0) => {
//   const days = 7;

//   const users = await prisma.user.findMany({
//     where: {
//       emailFrequency: { not: 0 }
//     },
//     orderBy: { id: "asc" } // IMPORTANT: deterministic order
//   });

//   const start = batchIndex * WEEKLY_BATCH_SIZE;
//   const end = start + WEEKLY_BATCH_SIZE;
//   const batchUsers = users.slice(start, end);

//   const events = await fetchEvents();

//   for (let i = 0; i < batchUsers.length; i++) {
//     const user = batchUsers[i];
//     await sleep(1000);

//     try {
//       const res = await sendEventNewsletterEmail(user, events, days);

//       if (!res?.data?.error) {
//         console.log(`${start + i} Success: ${user.email}`);
//       } else {
//         console.log(`${start + i} Error: ${user.email}`);
//       }
//     } catch (err) {
//       console.log(`ERROR SEND WEEKLY EMAIL TO ${user.email}: ${err.message}`);
//     }
//   }
// };


// function shouldSendEmail(lastEmailTime, frequencyDays) {
//   if (!lastEmailTime) return true; // allow first-time emails

//   const currentTime = Date.now();
//   const previousTime = new Date(lastEmailTime).getTime();
//   const elapsedMs = currentTime - previousTime;
//   const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

//   return elapsedDays >= frequencyDays;
// }


// module.exports = {weeklyJob,dailyJob}


const dailyJob = cron.schedule("0 9 * * *", async () => {
  // await dailyTask();
});

const dailyTask = async () => {
  const users = await prisma.user.findMany({ include: { profiles: true } });
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const profile = user.profiles[0];
    if (profile) {
      if (shouldSendEmail(user.lastEmailed, user.emailFrequency)) {
        let notify = await fetchAlerts(profile);
        const { comments, roles, following, followers, collections, events } = notify;
        let template = notificationTemplate({ email: user.email }, notify);
        await sleep(1000);
        if (comments.length > 0 || roles.length > 0 || following.length > 0 || followers.length > 0 || collections.length > 0 || events.length > 0) {
          await sendEmail(template);
          await prisma.user.update({ where: { id: user.id }, data: { lastEmailed: new Date() } });
        }
      } else {
        console.log("Not enough time has passed since the last email.");
      }
    }
  }
};

// --- Weekly newsletter: staggered, quota-aware, scales with user growth ---
//
// Daily send limit is 100. We reserve 10 as headroom for other transactional
// mail (password resets, notifications, etc.) that might fire the same day,
// leaving a real budget of 90 newsletter sends per run.
//
// Instead of a fixed day-of-week -> batchIndex mapping (which silently drops
// users once you exceed 2 * BATCH_SIZE total), we track `lastWeeklyEmailed`
// per user and always send to whoever's waited longest. Each scheduled run
// just claims the next slice. This means:
//   - Growing past 180 users doesn't lose anyone, it just takes an extra day.
//   - A failed/skipped run doesn't desync a hardcoded index.
//   - Sunday acts as a catch-up run for anyone Fri/Sat didn't get to.
const WEEKLY_DAILY_BUDGET = 90; // 100/day limit minus 10 held in reserve
const WEEKLY_FREQUENCY_DAYS = 7;

const weeklyJob = cron.schedule('0 9 * * 5,6,0', async () => {
  try {
    await weeklyEmail();
  } catch (err) {
    console.error("WEEKLY JOB ERROR: " + err.message);
  }
});

const weeklyEmail = async () => {
  const days = WEEKLY_FREQUENCY_DAYS;

  // Anyone opted in, ordered so nulls (never emailed) and the longest-waiting
  // users are always claimed first.
  const candidates = await prisma.user.findMany({
    where: { emailFrequency: { not: 0 } },
    orderBy: [
      { lastWeeklyEmailed: { sort: "asc", nulls: "first" } },
      { id: "asc" }, // stable tiebreaker
    ],
  });

  // Only send to users who are actually due (respects each user's own
  // emailFrequency, same as the daily digest logic).
  const dueUsers = candidates.filter(user => shouldSendEmail(user.lastWeeklyEmailed, days));

  const batchUsers = dueUsers.slice(0, WEEKLY_DAILY_BUDGET);

  if (batchUsers.length === 0) {
    console.log("Weekly newsletter: no users due, skipping run.");
    return;
  }

  const events = await fetchEvents();

  for (let i = 0; i < batchUsers.length; i++) {
    const user = batchUsers[i];
    await sleep(1000);
    try {
      const res = await sendEventNewsletterEmail(user, events, days);
      if (!res?.data?.error) {
        console.log(`${i + 1}/${batchUsers.length} Success: ${user.email}`);
        await prisma.user.update({
          where: { id: user.id },
          data: { lastWeeklyEmailed: new Date() },
        });
      } else {
        console.log(`${i + 1}/${batchUsers.length} Error: ${user.email}`);
      }
    } catch (err) {
      console.log(`ERROR SEND WEEKLY EMAIL TO ${user.email}: ${err.message}`);
    }
  }

  const remaining = dueUsers.length - batchUsers.length;
  if (remaining > 0) {
    console.log(`Weekly newsletter: ${remaining} due users left for the next run.`);
  }
};

function shouldSendEmail(lastEmailTime, frequencyDays) {
  if (!lastEmailTime) return true; // allow first-time emails
  const currentTime = Date.now();
  const previousTime = new Date(lastEmailTime).getTime();
  const elapsedMs = currentTime - previousTime;
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  return elapsedDays >= frequencyDays;
}

module.exports = { weeklyJob, dailyJob };