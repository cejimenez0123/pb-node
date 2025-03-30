
const prisma = require('../db');
const sendEmail = require("./sendEmail")
const sendEventNewsletterEmail = require("./sendEventNewsletterEmail")

const sendEmails=async ()=>{
let user = await prisma.user.findFirst({where:{email:"christianjimenez0123@gmail.com"}})
  sendEventNewsletterEmail(user).then(res=>{
  

    }).catch(err=>{
      console.log(err)
    })
}
  



sendEmails()
module.exports =sendEmails


