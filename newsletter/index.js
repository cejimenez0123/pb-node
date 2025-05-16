
const prisma = require('../db');
const notificationTemplate = require('../html/notificationTemplate');

const fetchAlerts = require('./fetchAlerts');

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
   let profile = await prisma.profile.findFirst({where:{user:{email:{equals:emails[0]}}}})
   let notify = await fetchAlerts(profile)
   let user = await prisma.user.findFirst({where:{email:{equals:emails[0]}}})

   let email = notificationTemplate(user,notify)
   return sendEmail(email)
}


module.exports =sendEmails


