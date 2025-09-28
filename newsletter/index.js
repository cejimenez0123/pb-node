
const prisma = require('../db');
const eventNewsletterTemplate = require('../html/eventNewsletterTemplate');
const notificationTemplate = require('../html/notificationTemplate');

const fetchAlerts = require('./fetchAlerts');
const fetchEvents = require('./fetchEvents');

const sendEmail = require("./sendEmail")
const emails = [process.env.myEmail]

// const sendEmails=async ()=>{
//   let users = await prisma.user.findMany({where:{
//     AND:[{emailFrequency:{not:0}},{email:{notIn:emails}}]

//   }})
//   await prisma.user.updateMany({where:{
//     emailFrequency:{not:0}
//   },data:{
//     lastEmailed:new Date()
//   }})

//   for(let i = 0;i<users.length;i+=1){
//   const template = slackEventTemplate({email:users[i].email})
// await sleep(900)
//  let res = await sendEmail(template)
//  console.log(i+emails.length,users[i].email)
//   }
// return "success"
// }
async function sendEmails(){
   // let profile = await prisma.profile.findFirst({where:{user:{email:{equals:process.env.PBEMAIL}}}})
   // // let notify = await fetchAlerts(profile)

   // let user = await prisma.user.findFirst({where:{
   //    email:process.env.PBEMAIL
   // }})
   // const events = await fetchEvents(7)
   // // let email = notificationTemplate(user,notify)
   // let template = eventNewsletterTemplate(events,user,2)
   // return sendEmail(template)
}

module.exports =sendEmails


