
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
module.exports = sendEmail=async (template)=>{
  try {
    const response = await resend.emails.send(template);
    console.log(response)
    return response;
  } catch (err) {
    console.error("Resend error:", err);
    throw err;
  }
}

