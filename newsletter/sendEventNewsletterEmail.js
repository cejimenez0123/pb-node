const prisma = require("../db");
const eventNewsletterTemplate = require("../html/eventNewsletterTemplate");
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function  sendEventNewsletterEmail(user,events,days=7){
  try {
    if(shouldSendEmail(user.lastEmailed,user.emailFrequency)){
    const template = eventNewsletterTemplate(events,user,days);

    const response = await resend.emails.send(template);
     await prisma.user.update({where:{id:user.id},data:{lastEmailed:new Date()}})
    return response;
    }else{
      throw new Error("Email frequency: It's been less than "+user.emailFrequency+" days since the last email was sent.");
    }
  } catch (err) {
    console.error("Resend error:", err);
    throw err;
  }
}
  function shouldSendEmail(lastEmailTime, frequencyDays) {
    const currentTime = Date.now();
    const elapsedTimeMs = currentTime - lastEmailTime;
    const elapsedTimeDays = elapsedTimeMs / (1000 * 60 * 60 * 24);
  
    return elapsedTimeDays >= frequencyDays;
  }