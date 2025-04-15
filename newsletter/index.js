
const prisma = require('../db');
const sleep = require('../utils/sleep');
const fetchEvents = require('./fetchEvents');
const sendEmail = require("./sendEmail")
const sendEventNewsletterEmail = require("./sendEventNewsletterEmail")


const sendEmails=async ()=>{
  let users = await prisma.user.findMany({
    where: {
      emailFrequency: {
       not:0
      }
    }
  })
  let i = 0 
  const events = await fetchEvents()
  for (let i = 0; i < users.length; i++) {
   let user = users[i]
    console.log("CSC",)
  await sleep(1000)
  sendEventNewsletterEmail(user,events,7).then(res=>{
    console.log(res)
    i+=1
    console.log(i,user)
    }).catch(err=>{
      console.log(err)
    })
  
}}
  




module.exports =sendEmails


