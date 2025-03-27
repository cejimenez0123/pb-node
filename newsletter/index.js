const prisma = require('../db')
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken")
const workshopTemplate = require("../html/workshopTemplate")
const fetchPublicEvents = require("../utils/docs");
const eventNewsletterTemplate = require('../html/eventNewsletterTemplate');
// const requestSubscriptionToNewsletter = require("../html/requestSubscriptionToNewsLetter")
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));


}
const sendEmail=async (user)=>{
   
    let transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
          user: process.env.pbEmail, 
          pass: process.env.pbPassword
        },
        from:process.env.pbEmail
      });

     
      if(user){
    
        transporter.sendMail(workshopTemplate({email:user.email}))
return
      }else{
        console.log("Can't find user")
  return        
      }
}
const sendEmails=async ()=>{

//     const users = await prisma.user.findMany()
let i =0 
// for(const user of users){
//     await sleep(1100)
    let user = {email:"christianjimenez0123@gmail.com"}
    // sendEmail(user)
    sendEventNewsletterEmail(user).then(res=>{
        i+=1

    }).catch(err=>{
      console.log(err)
    })
}
// }   
const sendEventNewsletterEmail=async (user)=>{
  let downtownEvents = await fetchPublicEvents(process.env.DOWNTOWN_CAL_ID)
  let uptownEvents = await fetchPublicEvents(process.env.UPTOWN_CAL_ID)
  let queensEvents = await fetchPublicEvents(process.env.QUEENS_CAL_ID)
  events=[{area:"Downtown",events:downtownEvents},{area:"Uptown",events:uptownEvents},{area:"Queens",events:queensEvents}]
  let transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.pbEmail, 
      pass: process.env.pbPassword
    },
    from:process.env.pbEmail
  });

  transporter.sendMail(eventNewsletterTemplate({events,email:user.email}))
 if(user){
  return
 }else{
      
  return        
      }
} 


sendEmails().then(()=>{
    console.log("Success news")
})
