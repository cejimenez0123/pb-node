const cron = require('node-cron');
const sendEventNewsletterEmail = require('../newsletter/sendEventNewsletterEmail');
const fetchEvents = require('../newsletter/fetchEvents');
// const newsletterTemplate = require('../html/newsletterTemplate');

const weeklyJob = cron.schedule('0 9 * * 0', () => {
  const days = 7
   prisma.user.findMany({where:{emailFrequency:{equals:days}}}).then(users=>{
    let i =0 
    for(const user of users){
     
    fetchEvents(days).then(events=>{

     sleep(1100).then(()=>{
      sendEventNewsletterEmail(user,events,days).then(res=>{
        i+=1
console.log(i,user.email)
    }).catch(err=>{
      console.log(err)
    })
     })
     })}})})


const threeDayJob = cron.schedule('0 10 */3 * *', () => {
  console.log('Running weekly email task');
  let days = 3

  prisma.user.findMany({where:{emailFrequency:{
        lte:3
    }}}).then(users=>{
   fetchEvents(days).then(events=>{
    let i =0 
    for(const user of users){
 
 
      sendEventNewsletterEmail(user,events).then((res)=>{
        i+=1
        console.log(i,user.email)
        console.log("Successful weekly email task")
      }).catch(err=>{
        console.log("Unsuccessful Weekly email")
        console.log(err.message)
      }) } })
    })  })
const monthlyJob = cron.schedule('0 10 * * 0', async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Get the last day of the current month
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const days = lastDayOfMonth - today 

       prisma.user.findMany({where:{emailFrequency:{gte:days}}}).then(users=>{
        let i =0 
        for(const user of users){
         
        fetchEvents(days).then(events=>{
    
         sleep(1100).then(()=>{
          sendEventNewsletterEmail(user,events).then(res=>{
            i+=1
    console.log(i,user.email)
        }).catch(err=>{
          console.log(err)
        })
         })
         })}})})
module.exports = {weeklyJob,threeDayJob,monthlyJob}