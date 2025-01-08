const prisma = require('../db')
const nodemailer = require('nodemailer');
const cron = require('node-cron');
async function getProfileOfUsersToEmail() {
    const now = new Date();

    const profiles = await prisma.profile.findMany({
      where: {
        user: {
          OR: [
            {
              emailFrequency: 1,
              lastEmailed: { lt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) }, // 1 day
            },
            {
              emailFrequency: 3,
              lastEmailed: { lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }, // 3 days
            },
          ],
        },
      },
      include: {
        stories: {
          include: {
            comments: true, // Fetch all comments; filtering will be done later
          },
        },
      },
    });
    
    // Process profiles and filter comments based on `lastActive`
    const profilesWithFilteredComments = profiles.map((profile) => {
      const filteredStories = profile.stories.map((story) => {
        const filteredComments = story.comments.filter(
          (comment) => new Date(comment.created) >= new Date(profile.lastActive)
        );
        return {
          ...story,
          comments: filteredComments,
        };
      });
    
      return {
        ...profile,
        stories: filteredStories,
      };
    });
    
    // Use profilesWithFilteredComments as the processed data for emailing
    console.log(profilesWithFilteredComments);
    

}

const sendEmailToUser=async ()=>{
    let transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
          user: process.env.pbEmail, 
          pass: process.env.pbPassword 
        }
      });

        let mailOptions = {
            from:  process.env.pbEmail,
            to:email ,// Email to yourself
            subject: `<!DOCTYPE html>
            <html>
            <head>
              <style>
                /* Include Tailwind Emerald Colors */
                body {
                  font-family: Arial, sans-serif;
                  background-color: #f9fafb; /* light neutral */
                  margin: 0;
                  padding: 0;
                }
                .email-container {
                  max-width: 600px;
                  margin: 0 auto;
                  background: #ffffff;
                  border: 1px solid #e5e7eb; /* light gray border */
                  border-radius: 8px;
                  overflow: hidden;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .header {
                  background-color: #10b981; /* emerald */
                  color: #ffffff;
                  text-align: center;
                  padding: 20px;
                }
                .header h1 {
                  margin: 0;
                  font-size: 24px;
                  font-weight: bold;
                }
                .content {
                  padding: 20px;
                  color: #1f2937; /* cool gray */
                }
                .comments {
                  margin-top: 20px;
                }
                .comment {
                  background-color: #f0fdf4; /* light emerald */
                  border: 1px solid #d1fae5; /* emerald border */
                  border-radius: 8px;
                  padding: 15px;
                  margin-bottom: 15px;
                }
                .footer {
                  text-align: center;
                  font-size: 14px;
                  color: #6b7280; /* gray */
                  padding: 15px;
                  background-color: #f3f4f6; /* light neutral */
                }
                .footer a {
                  color: #10b981;
                  text-decoration: none;
                }
                .footer a:hover {
                  text-decoration: underline;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <!-- Header Section -->
                <div class="header">
                  <h1>Plumbum</h1>
                  <p>Encouraging your creative journey</p>
                </div>
            
                <!-- Content Section -->
                <div class="content">
                  <h2>Hello, [User's Name]!</h2>
                  <p>You have new comments on your profile. Here's what people are saying:</p>
                  
                  <!-- Comments Section -->
                  <div class="comments">
                    <!-- Example Comment -->
                    <div class="comment">
                      <p><strong>[Commenter’s Name]:</strong> “This is an amazing story! I loved the ending.”</p>
                    </div>
                    <div class="comment">
                      <p><strong>[Commenter’s Name]:</strong> “Your poem was so moving. It resonated deeply with me.”</p>
                    </div>
                  </div>
            
                  <p>
                    Keep writing, sharing, and inspiring. Your creativity makes a difference. 
                  </p>
                  <p>
                    <a href="[Plumbum Website URL]" style="color: #10b981; text-decoration: none;">Visit your profile</a>
                  </p>
                </div>
            
                <!-- Footer Section -->
                <div class="footer">
                  <p>You’re receiving this email because you signed up for updates from Plumbum.</p>
                  <p>
                    <a href="[Unsubscribe URL]">Unsubscribe</a> | <a href="[Preferences URL]">Update Email Preferences</a>
                  </p>
                </div>
              </div>
            </body>
            </html>`
          };
        //   <p>
        //              <a href="[Unsubscribe URL]">Unsubscribe</a> | <a href="[Preferences URL]">Update Email Preferences</a>
        //             </p>
          try {
            await transporter.sendMail(mailOptions);
            // res.json({message:'Referred Succesfully!'});
          } catch (error) {
            console.error(error);
            res.json({error})
}
}
getProfileOfUsersToEmail()
cron.schedule('0 8 * * *', async () => {
  console.log('Running scheduled email job...');

  try {
    const {profiles} = await getProfileOfUsersToEmail();
    // console.log(JSON.stringify(profiles[0]))
//     for (const user of profiles) {
//    console.log(user)

//       if (user.comments.length > 0) {
//         await sendEmail(user, user.comments);

//         // Update the user's lastEmailed timestamp
//         await prisma.profile.update({
//           where: { id: user.id },
//           data: { lastEmailed: new Date() },
//         });
//       }
//     }

//     console.log('Emails sent successfully!');
  } catch (error) {
    console.error('Error in scheduled email job:', error);
  }}
);
