const cron = require('node-cron');
const sendEventNewsletterEmail = require('../newsletter/sendEventNewsletterEmail');
const fetchEvents = require('../newsletter/fetchEvents');
const prisma = require("../db")
const sleep = require("../utils/sleep")
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


module.exports = weeklyJob