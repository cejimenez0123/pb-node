const cron = require('node-cron');
const sendEventNewsletterEmail = require('../newsletter/sendEventNewsletterEmail');
const fetchEvents = require('../newsletter/fetchEvents');
const notificationTemplate = require("../html/notificationTemplate")
const prisma = require("../db")
const sleep = require("../utils/sleep")
const sendEmail = require("../newsletter/sendEmail")
const fetchAlerts = require("../newsletter/fetchAlerts")
const { Resend } = require('resend');
const { readItems } = require('@directus/sdk');
const {directus} = require("../utils/directus")
async function TEST(){
const allPosts = await directus.request(readItems('posts'));
console.log("ALL POSTS:", allPosts);
const somePosts = await directus.request(
  readItems('posts', {
    filter: { status: { _eq: 'published' } },
    sort: ['-date_created'],
    fields: ['id', 'title', 'date_created'],
    limit: 3
  })
)
console.log("SOME POSTS:", somePosts)
}
TEST()

const dailyJob = cron.schedule("0 9 * * *", async () => {

  // await dailyTask();
});

const dailyTask=async ()=>{
  const users = await prisma.user.findMany({include:{
    profiles:true
  }})

  for(let i=0;i<users.length;i++){
    const user = users[i]
    const profile = user.profiles[0]
    if(profile){
     
      if (shouldSendEmail(user.lastEmailed, user.emailFrequency)) {
      let profile = await prisma.profile.findFirst({where:{user:{email:{equals:user.email}}}})
      let notify = await fetchAlerts(profile)
     const {comments,roles,following,followers,collections,events} = notify
      let template = notificationTemplate({email:user.email},notify)
      await sleep(1000)
if(comments.length>0||roles.length>0||following.length>0||followers.length>0||collections.length>0||events.length>0){
      await sendEmail(template)
        console.log(i,profile.username)
 await prisma.user.update({where:{id:user.id},data:{
          lastEmailed: new Date()
        }})
      
     
     
}else{
  console.log(user.username,"NOT EMAILED:NOTHING TO SHOW")
}
  } else {
      console.log("Not enough time has passed since the last email.");
  }
}
  }
}
const weeklyJob = cron.schedule('0 9 * * 6,0', async () => {
  try {
    const today = new Date().getDay();

    // Saturday → batch 0, Sunday → batch 1
    const batchIndex = today === 6 ? 0 : 1;

    await weeklyEmail(batchIndex);
  } catch (err) {
    console.error("WEEKLY JOB ERROR: " + err.message);
  }
});

// const weeklyJob = cron.schedule('0 9 * * 0,1', async () => {
//   try{
// weeklyEmail()
// }catch(err){
//   console.err("WEEKLY JOB ERROR"+err.message)
    
//   }

// })
const WEEKLY_BATCH_SIZE = 100;

const weeklyEmail = async (batchIndex = 0) => {
  const days = 7;

  const users = await prisma.user.findMany({
    where: {
      emailFrequency: { not: 0 }
    },
    orderBy: { id: "asc" } // IMPORTANT: deterministic order
  });

  const start = batchIndex * WEEKLY_BATCH_SIZE;
  const end = start + WEEKLY_BATCH_SIZE;
  const batchUsers = users.slice(start, end);

  const events = await fetchEvents();

  for (let i = 0; i < batchUsers.length; i++) {
    const user = batchUsers[i];
    await sleep(1000);

    try {
      const res = await sendEventNewsletterEmail(user, events, days);

      if (!res?.data?.error) {
        console.log(`${start + i} Success: ${user.email}`);
      } else {
        console.log(`${start + i} Error: ${user.email}`);
      }
    } catch (err) {
      console.log(`ERROR SEND WEEKLY EMAIL TO ${user.email}: ${err.message}`);
    }
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



// async function processScheduledCampaigns() {
//   const now = new Date();

//   const campaigns = await prisma.campaign.findMany({
//     where: {
//       status: 'scheduled',
//       sendAt: { lte: now },
//     },
//     include: { group: true },
//   });

//   for (const campaign of campaigns) {
//     const users = await prisma.user.findMany({
//       where: {
//         groups: { some: { groupId: campaign.groupId } }, // assuming relation
//       },
//     });

//     const payload = users.map((u) => ({
// //       from: 'Your App <no-reply@yourapp.com>',
// //       to: [u.email],
// //       subject: campaign.subject,
// //       html: campaign.htmlBody,
//     }));


//     await prisma.campaign.update({
//       where: { id: campaign.id },
//       data: { status: 'sent', sentAt: new Date() },
//     });
// //   }
// // }



module.exports = {weeklyJob,dailyJob}