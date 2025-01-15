// const express = require('express');
// const prisma = require("./db");
// const jwt = require('jsonwebtoken');
// const nodemailer = require('nodemailer');
// const router = express.Router()
// const runPlease = async ()=>{
 
// let transporter = nodemailer.createTransport({
//     service: 'gmail', 
//     auth: {
//       user: process.env.pbEmail, 
//       pass: process.env.pbPassword 
//     }
//   ,
//     from: process.env.pbEmail, 
//   });
//   let username = "PoeticallyNate"
//   let email = "ndillard4970@gmail.com"
//   const token = jwt.sign({ username,email }, process.env.JWT_SECRET);
//   const forgetPasswordLink = process.env.DOMAIN+`/reset-password?token=${token}`


//         const mailOptions = {
//             from: process.env.pbEmail, // Sender address
//             to: email, // Recipient's email
//             subject: 'Reset Password',
//             html: `
//               <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
//                 <h1 style="color: #5A5A5A;">Welcome to Plumbum!</h1>
//                 <p style="font-size: 16px; color: #5A5A5A;">
//                 Hi! We're sorry for the inconvience, but we need you to reset your password! </p>
//                 <p style="font-size: 16px; color: #5A5A5A;">
//                   Click the button to reset password:
//                 </p>
//                 <a href="${forgetPasswordLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
// Reset Pasword
//               </a>
//                 <p style="font-size: 14px; color: #5A5A5A; margin-top: 20px;">
//                   If you have any questions, feel free to reach out to us at plumbumapp@gmail.com
//                 </p>
//                 <footer style="font-size: 12px; color: #9E9E9E; margin-top: 20px;">
//                   &copy; ${new Date().getFullYear()} Plumbum. All rights reserved.
//                 </footer>
//               </div>
//             `,
//           };
//           await transporter.sendMail(mailOptions);
// }
// // runPlease().then(res=>{

// // })