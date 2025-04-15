


module.exports = function feedbackTemplate({email,name,purpose,subject,message}){
    return {
         from: `${name} <${email}>`,// Sender address
         to: process.env.PBEMAIL,  // Recipient's email
         subject: `${purpose}:${subject}`,
         html: `
           <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                <p>${message}</p>
                <div>${email}</div>
           </div>
         `,
       };
 }