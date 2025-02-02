const prisma = require('../db')
const nodemailer = require('nodemailer');
const jwt = require("jsonwebtoken")
const requestSubscriptionToNewsletter = require("../html/requestSubscriptionToNewsLetter")
const sendEmail=async ()=>{
    const email = "plumbumapp@gmail.com"
    let transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
          user: email, 
          pass: "yime vzxy ymni murh"
        },
        from:email
      });

     let user = await prisma.user.findMany({where:{
        email:{
            equals:email
        }
      }})
      user = user[0]
      if(user){
      const token = jwt.sign({ userId:user.id }, process.env.JWT_SECRET);
     let mailOptions = requestSubscriptionToNewsletter({token,email})
     await transporter.sendMail(mailOptions);
     return "scuess"
      }else{
        console.log("Can find user")
        return "Can't find user"
      }
}
sendEmail().then(res=>console.log(res))