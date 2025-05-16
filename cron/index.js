const cron = require('node-cron');
const sendEventNewsletterEmail = require('../newsletter/sendEventNewsletterEmail');
const fetchEvents = require('../newsletter/fetchEvents');
const prisma = require("../db")
const sleep = require("../utils/sleep")
const sendEmail = require("../newsletter/sendEmail")
const fetchAlerts = require("../newsletter/fetchAlerts")
const dailyJob = cron.schedule('0 9 * * *', async () => {
   const users = await prisma.user.findMany({where:{email:{equals:process.env.myEmail}},include:{
      profiles:true
    }})
  
    for(let i=0;i<users.length;i++){
      let user = users[i]
      let profile = user.profiles[0]

      if(profile){
      if (shouldSendEmail(user.lastEmailed, user.emailFrequency)) {
        let profile = await prisma.profile.findFirst({where:{user:{email:{equals:emails[0]}}}})
        let notify = await fetchAlerts(profile)
        let email = notificationTemplate({email:user.email},notify)
        await sleep(1000)
      //   sendEmail(email).then(async res=>{
      // prisma.user.update({where:{id:user.id},data:{
      //       lastEmailed: new Date()
      //     }}).then(res=>{})}).catch(res=>{
      //       console.log(user.email,"NOT EMAILED")
      //     })
       
        
    } else {
        console.log("Not enough time has passed since the last email.");
    }
  }
    }
    
})

const weeklyJob = cron.schedule('0 9 * * 0', async () => {
  try{
  weeklyEmail()
}catch(err){
  console.err("WEEKLY JOB ERROR"+err.message)
    
  }

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
    const currentTime = Date.now();
    const elapsedTimeMs = currentTime - lastEmailTime;
    const elapsedTimeDays = elapsedTimeMs / (1000 * 60 * 60 * 24);
  
    return elapsedTimeDays >= frequencyDays;
  }
  

module.exports = {weeklyJob,dailyJob}