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
const weeklyEmail=()=>{
  const days = 7
 prisma.user.findMany({where:{emailFrequency:{equals:days}}}).then(users=>{
  let i =0 
  
  for(const user of users){
   
   fetchEvents(days).then(events=>{
  sleep(1200).then(()=>sendEventNewsletterEmail(user,events,days).then(res=>{
    i+=1
console.log(i,user.email)

}).catch(err=>{

  }))})}})}
const threeDayJob = cron.schedule('0 10 */3 * *',async () => {
  console.log('Running weekly email task');
  let days = 3

  let users =await prisma.user.findMany({where:{   emailFrequency: {
    gt: 0, 
    lte: 3   
  }}})
   let events= await fetchEvents(days)
    for(const user of users){
 
      try{
      sendEventNewsletterEmail(user,events).then((res)=>{
        i+=1
        console.log(i,user.email)
        console.log("Successful weekly email task")
      }).catch(err=>{
        console.log("Unsuccessful Weekly email")
        console.log(err.message)
      })
    }catch(err){
      console.err("three day JOB ERROR"+err.message)
    }
     }})
     
const monthlyJob = cron.schedule('0 12 1-7 * 0', async () => {


  const days = 27
     let users = await prisma.user.findMany({where:{emailFrequency:{gte:days}}})
        let i =0 
        for(const user of users){
         
       const events = await fetchEvents(days)
    try{
         sleep(1200).then(()=>{
          sendEventNewsletterEmail(user,events,days).then(res=>{
            i+=1
    console.log(i,user.email)
    console.log("Successful Monthly email task")
        }).catch(err=>{
          console.log("Unsuccessful Monthly email task")
          console.log(err)
        })
         })}catch(err){
          console.err("Monthly JOB ERROR"+err.message)
         }
         }
        })
module.exports = {weeklyJob,threeDayJob,monthlyJob}