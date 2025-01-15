
 const express = require('express');
const prisma = require("./db");
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const router = express.Router()
const runPlease = async ()=>{
 
let transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.pbEmail, 
      pass: process.env.pbPassword 
    }
  ,
    from: process.env.pbEmail, 
  });
  const user = await prisma.user.findFirst({where:{email:{
    equals:"mayavantifelman@gmail.com"
  }}})
  
  const token = jwt.sign({ applicantId:"6787ecd69f14afdbb1c1e87b" }, process.env.JWT_SECRET);

  
  const signupLink = process.env.DOMAIN+`/signup?token=${token}`;
      
  const mailOptions = {
    from: process.env.pbEmail, // Sender address
    to: user.email, // Recipient's email
    subject: 'Congratulations! Your Application Has Been Approved 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h1 style="color: #5A5A5A;">Welcome to Plumbum, ${user.preferredName}!</h1>
        <p style="font-size: 16px; color: #5A5A5A;">
          We’re thrilled to let you know that your application has been approved. 
          You’re now part of a vibrant community of creators, thinkers, and writers.
        </p>
        <p style="font-size: 16px; color: #5A5A5A;">
          Click the button below to log in and start exploring:
        </p>
        <a href="${signupLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
        Complete Sign-Up
      </a>
        <p style="font-size: 14px; color: #5A5A5A; margin-top: 20px;">
          If you have any questions, feel free to reach out to us at plumbumapp@gmail.com
        </p>
        <footer style="font-size: 12px; color: #9E9E9E; margin-top: 20px;">
          &copy; ${new Date().getFullYear()} Plumbum. All rights reserved.
        </footer>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
  return "success"
}
runPlease().then(res=>{
console.log(res)
 })