
const nodemailer = require('nodemailer');
const fetchPublicEvents = require("../utils/docs");
const eventNewsletterTemplate = require('../html/eventNewsletterTemplate');
const prisma = require('../db');


const sendEmails=async ()=>{
  
let user = await prisma.user.findFirst({where:{email:"christianjimenez0123@gmail.com"}})
  
  sendEventNewsletterEmail(user).then(res=>{
  

    }).catch(err=>{
      console.log(err)
    })
}
  
const sendEventNewsletterEmail=async (user)=>{
  let downtownEvents = await fetchPublicEvents(process.env.DOWNTOWN_CAL_ID)
  let uptownEvents = await fetchPublicEvents(process.env.UPTOWN_CAL_ID)
  let queensEvents = await fetchPublicEvents(process.env.QUEENS_CAL_ID)
  let virtualEvents = await fetchPublicEvents(process.env.VIRTUAL_CAL_ID)
  const events=[{area:"Downtown",events:downtownEvents},{area:"Uptown",events:uptownEvents},{area:"Queens",events:queensEvents},{area:"Virtual",events:virtualEvents}]  
      const template =  eventNewsletterTemplate({events,user:user})
    sendEmail(template).then(res=>{
      // i+=1
  }).catch(err=>{
    console.log(err)
  })

  
} 

const sendEmail=async (template)=>{

  const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.pbEmail, 
        pass: process.env.pbPassword
      },
      from:process.env.pbEmail
    });
transporter.sendMail(template).then(res=>{


}).catch(err=>{
 console.log(err)
 console.log(err.message)
})
return

}
sendEmails()
module.exports =sendEmails


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));


}