const eventNewsletterTemplate = require("../html/eventNewsletterTemplate");
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
module.exports = async function  sendEventNewsletterEmail(user,events,days=7){
  try {
    const template = eventNewsletterTemplate(events,user,days);
    const response = await resend.emails.send(template);
 
    return response;
  } catch (err) {
    console.error("Resend error:", err);
    throw err;
  }
}
