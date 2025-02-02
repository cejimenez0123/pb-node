const prisma = require('../db')
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken")

const requestSubscriptionToNewsletter = require("../html/requestSubscriptionToNewsLetter")
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
      const token = jwt.sign({ userId:user.id }, process.env.JWT_SECRET);
     let mailOptions = requestSubscriptionToNewsletter({token,email:user.email})
     await transporter.sendMail(mailOptions);
     console.log("Success news")
      }else{
        console.log("Can find user")
        
      }
}
const sendEmails=async ()=>{

    const users = await prisma.user.findMany()

for(const user of users){
    await sleep(1000)
    sendEmail(user).then(res=>{
        console.log(user.email)
    })
}
     
          
}  

// sendEmails().then()


// function sleep(ms) {
//   return new Promise((resolve) => {
//     setTimeout(resolve, ms);
//   });
// }