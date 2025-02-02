
module.exports = function requestSubscriptionToNewsletter({token,email}){
    let params = new URLSearchParams({token:token})
    return {
         from: process.env.pbEmail, // Sender address
         to: email, // Recipient's email
         subject: `Plumbum Newsletter Update`,
         html: `<!DOCTYPE html>
         <html>
           <head>
             <meta charset="UTF-8">
             <meta name="viewport" content="width=device-width, initial-scale=1.0">
             <title>Plumbum Website Launch Party – You're Invited!</title>
           </head>
           <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px; margin: 0;">
             <div style="max-width: 600px; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: auto;">
               
               <h2 style="color: #065f46; text-align: center;">Plumbum is Growing – Let’s Celebrate!</h2>
               
               <p style="color: #374151; font-size: 16px;">
                 We’re launching something big! Plumbum’s website is going live, and we’re throwing a party to celebrate with our community. 
                 Join us for an evening of creativity, connection, and great conversation.
               </p>
         
               <!-- Event Image Placeholder (Replace with Actual Flyer) -->
               <div style="text-align: center; margin: 20px 0;">
                 <a href="https://partiful.com/e/OGTscKDoU4VPRIRSfnAp" style="text-decoration: none;">
                   <img src="cid:event_flyer" alt="Plumbum Website Launch Party" style="max-width: 100%; border-radius: 8px;">
                 </a>
               </div>
         
               <p style="color: #374151; font-size: 16px; text-align: center;">
                 📅 <strong>February 27, 2025</strong> | 🎉 More details coming soon!
               </p>
         
               <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
         
               <p style="color: #374151; font-size: 16px;">
                 We're happy you joined us. Our emails not meant to overwhelm.  
                 Let us know how often you'd like to hear from us. Our newsletter will begin after February 27.
               </p>
         
               <div style="text-align: center; margin: 20px 0;">
                 <a href="${process.env.DOMAIN}/subscribe?${params.toString()}" style="background-color: #10b981; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-size: 16px; display: inline-block;">Update Email Preferences</a>
               </div>
         
               <p style="color: #374151; font-size: 14px; text-align: center;">
                 Need a break? No hard feelings.  
                 <a href="${process.env.BASEPATH}/auth/unsubscribe?${params.toString()}" style="color: #065f46; text-decoration: underline;">Unsubscribe here</a>.
               </p>
         
               <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
                 © 2025 Plumbum. All rights reserved.
               </p>
             </div>
           </body>
         </html>
         `,
         attachments: [
            {
              filename: "mixer.jpg", // Change to your file name
              path:  __dirname+"/images/mixer.jpg", // Local file path
              cid: "event_flyer", 
            },]
        }}