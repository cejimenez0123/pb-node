const prisma = require('../db')
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken")
const workshopTemplate = require("../html/workshopTemplate")
// const requestSubscriptionToNewsletter = require("../html/requestSubscriptionToNewsLetter")
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));


}
// const sendEmail=async (user)=>{
   
//     let transporter = nodemailer.createTransport({
//         service: 'gmail', 
//         auth: {
//           user: process.env.pbEmail, 
//           pass: process.env.pbPassword
//         },
//         from:process.env.pbEmail
//       });

     
//       if(user){
    
//         transporter.sendMail(workshopTemplate({email:user.email}))
// return
//       }else{
//         console.log("Can find user")
//   return        
//       }
// }
// const sendEmails=async ()=>{

//     const users = await prisma.user.findMany()
// let i =0 
// for(const user of users){
//     await sleep(1100)
//     // let user = {email:"christianjimenez0123@gmail.com"}
//     sendEmail(user).then(res=>{
//         i+=1
//     console.log(`${i}+${user.email}`)
//     }).catch(err=>{
//       console.log(err)
//     })
// }
// }   
          


// sendEmails().then(()=>{
//     console.log("Success news")
// })
