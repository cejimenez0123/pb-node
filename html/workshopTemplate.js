
module.exports = function workshopTemplate({email}){
    // let params = new URLSearchParams({token:token})
        return {
             from: `Plumbum <${process.env.pbEmail}>` // Sender address
             to: email, // Recipient's email
             subject: `Plumbum Workshop Tomorrow: Write Your Creative Future with Us`,
             html:`<!DOCTYPE html>
             <html>
             <head>
                 <meta charset="UTF-8">
                 <title>Plumbum Writers Workshop – Writing Our Creative Futures</title>
                 <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Lora:400;700&family=Open+Sans:wght@300;400;600&display=swap" rel="stylesheet">
                 <style>
                     body {
                         font-family: 'Open Sans', sans-serif;
                         background-color: #E6F2E6; /* Soft Calm Green */
                         margin: 0;
                         padding: 0;
                     }
                     .container {
                         max-width: 600px;
                         margin: 20px auto;
                         background: #ffffff;
                         padding: 20px;
                         border-radius: 8px;
                         box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
                     }
                     h1 {
                         font-family: 'Lora', serif;
                         color: #2F4F2F; /* Deep Green */
                         font-size: 24px;
                         font-weight: 700;
                     }
                     h2 {
                         font-family: 'Montserrat', sans-serif;
                         color: #3D6B47; /* Medium Green */
                         font-size: 20px;
                         font-weight: 600;
                         margin-top: 20px;
                     }
                     p, li {
                         font-family: 'Open Sans', sans-serif;
                         font-size: 16px;
                         color: #4A604A; /* Soft Dark Green */
                         line-height: 1.6;
                     }
                     ul {
                         padding-left: 20px;
                     }
                     .button {
                         display: inline-block;
                         padding: 12px 20px;
                         margin: 15px 0;
                         background-color: #3D6B47; /* Medium Green */
                         color: #ffffff !important;
                         text-decoration: none;
                         border-radius: 5px;
                         font-family: 'Montserrat', sans-serif;
                         font-weight: 600;
                     }
                     .footer {
                         text-align: center;
                         font-size: 12px;
                         color: #3D6B47; /* Medium Green */
                         margin-top: 20px;
                     }
                     .footer a {
                         color: #2F4F2F; /* Deep Green */
                         text-decoration: none;
                         font-weight: 600;
                     }
                 </style>
             </head>
             <body>
                 <div class="container">
                 <h1>✨ Writing Our Creative Futures ✨</h1>
                 <p>Join us <strong>tomorrow</strong> for a transformative writers' workshop inspired by <strong>N.K. Jemisin</strong>. We’ll be exploring the question: <strong>"Why not?"</strong>—breaking past barriers to write the stories we truly want for ourselves.</p>
                 <p>This is a space to push past self-doubt, embrace creative freedom, and envision a future through writing.</p>
                 <span style="text-align: center;>
                 <a href="https://partiful.com/e/jLzoS5nNZsdhoQV2uZva">
                 <img src="cid:workshop" alt="Wrtiers Workshop" style="margin:auto; max-width: 18em; border-radius: 8px;"/></a>
               <br/><a href="https://partiful.com/e/jLzoS5nNZsdhoQV2uZva">RSVP here</a>
               </span>
                     <h2>📢 Join Our New Slack Community!</h2>
                     <p>We now have a dedicated Slack space for writers to connect, get feedback, and stay inspired. You’ll find:</p>
                     <ul>
                         <li>A shared <a href="https://plumbum.app/calendar">calendar<a/> of NYC writing events & creative meetups</li>
                         <li>Daily writing sprints & accountability check-ins</li>
                         <li>Opportunities to collaborate and suggest events</li>
                     </ul>
                     <p><a href="https://join.slack.com/t/plumbumwriters/shared_invite/zt-2zvkzyi02-dRlhqb0wvHAaU~~dUgh7hQ" class="button">Join the Slack Community</a></p>
             
                     <h2>🔔 Stay Updated with Email Notifications</h2>
                     <p>We're working on new email notifications so you can stay connected with the community. Soon, you'll be able to receive updates when:</p>
                     <ul>
                         <li>You get feedback on your posted work</li>
                         <li>New writing is shared by your fellow writers</li>
                         <li>Special events and writing challenges are announced</li>
                     </ul>
                     <p>Stay tuned—more ways to keep the creative energy flowing are on the way!</p>
             
                     <h2>🎶 Seeking DJs & Live Acts for Our Showcase!</h2>
                     <p>We're planning a DJ showcase—because <strong>body moving is body healing</strong>. If you know DJs or live acts who can get people dancing, send them our way!</p>
                     <p>Have suggestions for collaborators, locations, or future events? We’d love to hear it through the <a href="https://plumbum.app/feedback">feedback page.</a></p>
             
                     <p>Let’s create, move, and heal—together.</p>
                     <p>See you at the workshop!</p>
             
                     <div class="footer">
                         <p>Plumbum Writers Workshop | <a href="https://plumbum.app">Visit Our Website</a></p>
                     </div>
                 </div>
             </body>
             </html>
             `,
attachments: [
   {
     filename: "workshop.png", // Change to your file name
     path:  __dirname+"/images/workshop.png", // Local file path
     cid: "workshop", 
   },]

    }}