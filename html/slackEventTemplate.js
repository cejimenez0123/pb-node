




module.exports = function slackEventTemplate({email}){

    return {
         from: `Plumbum <${process.env.pbEmail}>`,// Sender address
         to: email, // Recipient's email
         subject: `Meet, Write, Connect—Plumbum’s Mixer & Slack Invite`,
         html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plumbum Creative Mixer & Slack</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Montserrat:wght@400;700&family=Open+Sans:wght@400;700&display=swap');

        body { font-family: 'Open Sans', sans-serif; background-color: #f4f4f4; padding: 20px; color: #333; }
        .container { background: #ffffff; padding: 20px; border-radius: 5px; max-width: 600px; margin: auto; text-align: center; }
        h1, h2 { font-family: 'Lora', serif; color: #2c7a7b; }
        p { font-family: 'Montserrat', sans-serif; line-height: 1.5;color: #000000 !important; }
        .button { background: #2c7a7b; color: #ffffff !important; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Plumbum Creative Mixer</h1>
        <p>We're celebrating the launch of Plumbum the website this Thursday!</p>
        <p>Join us at <strong>Sankofa Haus at 7 PM</strong> for a night of creative energy, good company, and writing inspiration.</p>
        <div style="text-align: center; margin: 20px 0;">
        <a href="https://partiful.com/e/OGTscKDoU4VPRIRSfnAp" style="text-decoration: none;">
          <img src="cid:event_flyer" alt="Plumbum Website Launch Party" style="max-width: 12em; border-radius: 8px;">
        </a>
     
        <h2>Our New Slack Community</h2>
        <p>We’re starting a Slack to connect while the website and app are in development.</p>
        <p>Hop in early! We’re already sharing prompts, discussing writing, and posting events.</p>
        <p>Feel free to contribute—share events, ideas, or just say hi.</p>
        
        <a href="https://join.slack.com/t/plumbumwriters/shared_invite/zt-2zvkzyi02-dRlhqb0wvHAaU~~dUgh7hQ" class="button">Join the Slack</a>
    </div>
    </div>
        
</body>
</html>`
,
attachments: [
   {
     filename: "mixer.jpg", // Change to your file name
     path:  __dirname+"/images/mixer.jpg", // Local file path
     cid: "event_flyer", 
   },]

    }}