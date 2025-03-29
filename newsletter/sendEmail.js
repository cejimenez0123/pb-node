
const nodemailer = require('nodemailer');

module.exports = sendEmail=async (template)=>{

    const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
          user: process.env.pbEmail, 
          pass: process.env.pbPassword
        },
        from:process.env.pbEmail
      });
transporter.sendMail(template).then(res=>{
console.log("Success")
return
 }).catch(err=>{
   console.log(err)
   console.log(err.message)
   return err
 })


}