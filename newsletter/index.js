
const prisma = require('../db');
const fetchEvents = require('./fetchEvents');
const sendEmail = require("./sendEmail")
const sendEventNewsletterEmail = require("./sendEventNewsletterEmail")


const sendEmails=async ()=>{
  let user = await prisma.user.findFirst({where:{email:"christianjimenez0123@gmail.com"}})
  const events = await fetchEvents()
  sendEventNewsletterEmail(user,events).then(res=>{
    console.log(res)
    console.log(user.email)
    }).catch(err=>{
      console.log(err)
    })
}
  



sendEmails()
module.exports =sendEmails


