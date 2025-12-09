const cron = require('node-cron');
const sendEventNewsletterEmail = require('../newsletter/sendEventNewsletterEmail');
const fetchEvents = require('../newsletter/fetchEvents');
const notificationTemplate = require("../html/notificationTemplate")
const prisma = require("../db")
const sleep = require("../utils/sleep")
const sendEmail = require("../newsletter/sendEmail")
const fetchAlerts = require("../newsletter/fetchAlerts")



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
const weeklyJob = cron.schedule('0 9 * * 0,1', async () => {
  // try{
weeklyEmail()
// }catch(err){
//   console.err("WEEKLY JOB ERROR"+err.message)
    
//   }

})
const weeklyEmail=async()=>{
  const days = 7
  let users = await prisma.user.findMany({
    where: {
      emailFrequency: {
       not:0
      }
    }
  })

  const events = await fetchEvents()
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    await sleep(1000)
  sendEventNewsletterEmail(user,events,days).then(res=>{
    if(!res.data.error){
      console.log(i,"Success: "+user.email)
    }else{
      console.log(i,"Error "+user.email)
    }
    
  }).catch(err=>{
console.log("ERROR SEND WEEKLY EMAIL TO "+user.email+":"+err.message)
  })}}

function shouldSendEmail(lastEmailTime, frequencyDays) {
  if (!lastEmailTime) return true; // allow first-time emails

  const currentTime = Date.now();
  const previousTime = new Date(lastEmailTime).getTime();
  const elapsedMs = currentTime - previousTime;
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

  return elapsedDays >= frequencyDays;
}


// weeklyEmail().then()

module.exports = {weeklyJob,dailyJob}