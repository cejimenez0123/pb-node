// const prisma = require('../db')
// const nodemailer = require('nodemailer');
// const cron = require('node-cron');
// // cron.schedule('0 0 * * *', async () => {
// //   // Send emails to users with email frequency of 1 (daily)
// //   await sendEmails(1); // Function to send emails for daily frequency
// // });

// // cron.schedule('0 0 */3 * *', async () => {
// //   // Send emails to users with email frequency of 3 (every 3 days)
// //   await sendEmails(3); // Function to send emails for every 3 days frequency
// // });
// // async function getProfileOfUsersToEmail() {
// //   const now = new Date();

// // const profiles = await prisma.profile.findMany({
// //   where: {
// //     user: {
// //       OR: [
// //         {
// //           emailFrequency:{equals:1},
// //           OR:[
// //             {lastEmailed:{lt:new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)}},
// //             {lastEmailed:{isSet:false}
// //             }
// //           ]
      
// //         },
// //         {
// //           emailFrequency:{equals:3},
// //           OR:[
// //             {lastEmailed: { lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }}, // 3 days
// //             {lastEmailed:{isSet:false}
// //             }
// //           ]
// //         },
// //       ],
// //     },
// //   },
// //   include: {
// //     user:true,
// //     stories: {
// //       include: {
// //         comments: true, 
// //       },
// //     },
// //   },
// // });


// const profilesWithFilteredCommentsBy=(date=new Date("2025-1-1")  )= profiles.filter(prof=>prof.stories.length>0).map((profile) => {
//   const filteredStories = profile.stories.map((story) => {
//     const filteredComments = story.comments.filter(
//       (comment) => new Date(comment.created) >= date


//     );
//     return {
//       ...story,
//       comments: filteredComments,
//     };
//   });

// //   // console.log("rpfoil",profiles)
// //   return {
// //     ...profile,
// //     stories: filteredStories,
// //   };
// // // });
// /
// // }

// async function sendEmails(frequency = 1) {

//   try {
//     const now = new Date();

//     // Fetch profiles based on email frequency and last emailed condition
//     const profiles = await prisma.profile.findMany({
//       where: {
//         user: {
//           emailFrequency: frequency,
//           OR: [
//             {
//               lastEmailed: { lt: new Date(now.getTime() - frequency * 24 * 60 * 60 * 1000) }, // Check if last email was within the frequency range
//             },
//             {
//               lastEmailed:{isSet:false} // Users who have never been emailed
//             },
//           ],
//         },
//       },
//       include: {
//         user:{
//           include:true
//         },
//         stories: {
//           include: {
//             comments: {
//               include:{
//                 story:true,
//                 profile:true
//               }
//             } // Include all comments (filtering will be done after retrieval)
//           },
//         },
//       },
//     });

//     // Now process each profile
//     for (const profile of profiles) {
//       const lastActiveDate = profile.lastActive || now; // If `lastActive` is null, use the current date as fallback

//       // Filter comments for this profile based on `lastActive` and created date
//       const recentComments = profile.stories
//         .filter(story=>story.comments.length>0)
//         .flatMap(story => story.comments) // Flatten all comments from stories
//         .filter(comment => {
//           return comment.created >= new Date(lastActiveDate.getTime() - frequency * 24 * 60 * 60 * 1000); // Filter by `lastActive` date and frequency
//         });

//       // Now send email only if there are recent comments
//       if (recentComments.length > 0) {
//         if(profile.username=="solbao"){

//           sendEmail(profile,recentComments)
//           break
//         }
    
//         // await sendEmail(profile, recentComments); // Pass profile and filtered recent comments to sendEmail function
 
//       }
     
//     }
//   } catch (error) {
//     console.error('Error sending emails:', error);
//   }
// }


// async function sendEmail(profile, newComments) {
//   try{
//   let transporter = nodemailer.createTransport({
//     service: 'gmail', 
//     auth: {
//       user: process.env.pbEmail, 
//       pass: process.env.pbPassword 
//     },
//     from:process.env.pbEmail
//   });
  
// console.log("oop",JSON.stringify(newComments[0].content))
//   const mailOptions = {
//     from: process.env.pbEmail,
//     to: "christianjimenez0123@gmail.com",
//     subject: 'Your Profile Updates',
//     html: `Hi ${profile.username},\n\nYou have new comments:\n\n
     
//     ${newComments.map(comment => {return `<li>- ${comment.content}</li>`})
//       .join('\n')}
//     \n\nBest,\nYour Team`,
//   };
// console.log(`Hi ${profile.username},\n\nYou have new comments:\n\n
     
// ${newComments.map(comment => {return `<li>- ${comment.content}</li>`})
//   .join('\n')}
// \n\nBest,\nYour Team`)
  // await transporter.sendMail(mailOptions);
 
//   return 
// }catch(error){
//   console.log(error)
// }
// }
// const sendEmailToUser=async ()=>{
//     let transporter = nodemailer.createTransport({
//         service: 'gmail', 
//         auth: {
//           user: process.env.pbEmail, 
//           pass: process.env.pbPassword 
//         },
//         from:process.env.pbEmail
//       });

//         let mailOptions = {
//             from:  process.env.pbEmail,
//             to:"christianjimenez0123@gmail.com" ,// Email to yourself
//             subject: `<!DOCTYPE html>
//             <html>
//             <head>
//               <style>
//                 /* Include Tailwind Emerald Colors */
//                 body {
//                   font-family: Arial, sans-serif;
//                   background-color: #f9fafb; /* light neutral */
//                   margin: 0;
//                   padding: 0;
//                 }
//                 .email-container {
//                   max-width: 600px;
//                   margin: 0 auto;
//                   background: #ffffff;
//                   border: 1px solid #e5e7eb; /* light gray border */
//                   border-radius: 8px;
//                   overflow: hidden;
//                   box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//                 }
//                 .header {
//                   background-color: #10b981; /* emerald */
//                   color: #ffffff;
//                   text-align: center;
//                   padding: 20px;
//                 }
//                 .header h1 {
//                   margin: 0;
//                   font-size: 24px;
//                   font-weight: bold;
//                 }
//                 .content {
//                   padding: 20px;
//                   color: #1f2937; /* cool gray */
//                 }
//                 .comments {
//                   margin-top: 20px;
//                 }
//                 .comment {
//                   background-color: #f0fdf4; /* light emerald */
//                   border: 1px solid #d1fae5; /* emerald border */
//                   border-radius: 8px;
//                   padding: 15px;
//                   margin-bottom: 15px;
//                 }
//                 .footer {
//                   text-align: center;
//                   font-size: 14px;
//                   color: #6b7280; /* gray */
//                   padding: 15px;
//                   background-color: #f3f4f6; /* light neutral */
//                 }
//                 .footer a {
//                   color: #10b981;
//                   text-decoration: none;
//                 }
//                 .footer a:hover {
//                   text-decoration: underline;
//                 }
//               </style>
//             </head>
//             <body>
//               <div class="email-container">
//                 <!-- Header Section -->
//                 <div class="header">
//                   <h1>Plumbum</h1>
//                   <p>Encouraging your creative journey</p>
//                 </div>
            
//                 <!-- Content Section -->
//                 <div class="content">
//                   <h2>Hello, [User's Name]!</h2>
//                   <p>You have new comments on your profile. Here's what people are saying:</p>
                  
//                   <!-- Comments Section -->
//                   <div class="comments">
//                   ${}
//                     <!-- Example Comment -->
//                     <div class="comment">
//                       <p><strong>[Commenter’s Name]:</strong> “This is an amazing story! I loved the ending.”</p>
//                     </div>
//                     <div class="comment">
//                       <p><strong>[Commenter’s Name]:</strong> “Your poem was so moving. It resonated deeply with me.”</p>
//                     </div>
//                   </div>
            
//                   <p>
//                     Keep writing, sharing, and inspiring. Your creativity makes a difference. 
//                   </p>
//                   <p>
//                     <a href="[Plumbum Website URL]" style="color: #10b981; text-decoration: none;">Visit your profile</a>
//                   </p>
//                 </div>
            
//                 <!-- Footer Section -->
//                 <div class="footer">
//                   <p>You’re receiving this email because you signed up for updates from Plumbum.</p>
//                   <p>
//                     <a href="[Unsubscribe URL]">Unsubscribe</a> | <a href="[Preferences URL]">Update Email Preferences</a>
//                   </p>
//                 </div>
//               </div>
//             </body>
//             </html>`
//           };
//         //   <p>
//         //              <a href="[Unsubscribe URL]">Unsubscribe</a> | <a href="[Preferences URL]">Update Email Preferences</a>
//         //             </p>
//           try {
//             await transporter.sendMail(mailOptions);
//             // res.json({message:'Referred Succesfully!'});
//           } catch (error) {
//             console.error(error);
//             res.json({error})
// }
// }

// sendEmails()