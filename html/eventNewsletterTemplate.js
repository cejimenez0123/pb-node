
const jwt = require('jsonwebtoken');

const eventNewsletterTemplate=(events,user,days)=>{
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    let params = new URLSearchParams({token:token})
    let str = "Weekly"
    return{
      from: `Plumbum <${process.env.pbEmail}>`,
      to:user.email,
      subject: 'Plumbum Writers Community - Upcoming Events🎉',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Plumbum Writers Community - Upcoming Events</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Lora:400;700&family=Open+Sans:wght@300;400;600&display=swap" rel="stylesheet" />
  <style>
    body {
      font-family: 'Open Sans', sans-serif;
      background-color: #E6F2E6;
      margin: 0;
      padding: 0;
    }
    .no-events {
        text-align: center;
        padding: 20px;
        background-color: #F0F7F0; /* Matches the event background */
        border-radius: 8px; /* Matches the event border radius */
        margin-bottom: 15px; /* Matches the event margin bottom */
        font-family: 'Open Sans', sans-serif;
        color: #4A604A; /* Matches the paragraph color */
        font-size: 16px; /* Matches the paragraph font size */
        line-height: 1.6; /* Matches the paragraph line height */
      }
      
      .no-events p {
        margin: 0; /*Reset default paragraph margins*/
      }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #fff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }
 
    .event {
      list-style-type: none;
      margin-bottom: 15px;
      padding: 12px;
      background-color: #F0F7F0;
      border-radius: 8px;
    }
  
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      width: 150px;
      height: auto;
      margin-bottom: 20px;
    }
    h1 {
      font-family: 'Lora', serif;
      color: #2F4F2F;
      font-size: 28px;
    }
    h2 {
      font-family: 'Montserrat', sans-serif;
      color: #3D6B47;
      font-size: 22px;
    }
    p {
      font-family: 'Open Sans', sans-serif;
      color: #4A604A;
      font-size: 16px;
      line-height: 1.8;
    }
    p {
        line-height: 1.6;
        font-size: 16px;
      }
      a {
        color: #3D6B47;
        text-decoration: underline;
        font-weight: 600;
      }
   

    a.button {
      display: inline-block;
      margin-top: 15px;
      padding: 12px 20px;
      background-color: #3D6B47;
      color: #fff;
      text-decoration: none;
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      border-radius: 5px;
    }
    .footer {
      margin-top: 40px;
      font-size: 12px;
      color: #3D6B47;
      text-align: center;
    }
    .footer a {
      color: #2F4F2F;
      text-decoration: none;}
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Plumbum Writers Community - Upcoming NYC Events</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Lora:400;700&family=Open+Sans:wght@300;400;600&display=swap" rel="stylesheet" />
  <style>
    body {
      font-family: 'Open Sans', sans-serif;
      background-color: #E6F2E6;
      color: #2F4F2F;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: auto;
    }
    h1 {
      font-family: 'Lora', serif;
      font-size: 24px;
    }
    h2 {
      font-family: 'Montserrat', sans-serif;
      color: #3D6B47;
      font-size: 20px;
      margin-top: 40px;
    }
    p {
      line-height: 1.6;
    }
    a {
      color: #3D6B47;
      text-decoration: underline;
    }
  

    .footer {
      font-size: 12px;
      color: #4A604A;
      margin-top: 40px;
      text-align: center;
    }
  
  </style>
</head>
<body>
  <div class="container">
    <h1>Hey there, Plumbum writer!</h1>
    <p>Hope things are well! Hope you're enjoying the process! Here's events to get your creative juices flowing!</p>
    
    <h2>🌿 Next ${str} Creative Happenings</h2>
 
    ${events && events.length?events.map(area => 
       ` <h3>${area.area}</h3>
            <br />
              <ul  class="events">
              ${area.events.map((event, i) =>{
                 return event.organizer.displayName.toLowerCase().trim()==area.area.toLowerCase().trim()?`<br/><a  href="${event.htmlLink}"><p>${event.summary} - ${formatDate(event.start.dateTime)} to ${formatDate(event.end.dateTime)}</p></a>`:null
  }  ).join('')}</ul>
          
        `
      ).join(''):`<span class="no-events">
      <p>No events scheduled this time. Stay tuned!</p>
    </span>`}`+` 
    <h2>🎵 Call for DJs and Performers</h2>
    <p>We’re planning a DJ showcase! The theme? *Body Moving is Body Healing*. If you know a DJ or live act who can get people dancing like no one’s watching, send them our way. <a href="mailto:plumbumapp@gmail.com">plumbumapp@gmail.com</a>.</p>
    <h2>💬 Become a user! Post your own weirdness/h2>
    <p>Yep, even on the newsletter you can still join! <a href="${process.env.DOMAIN+"/apply/newsletter"}">become a user here</a>.</p>

    <h2>💬 Join Our Slack Community</h2>
    <p>Yep, we’re on Slack now! Connect with fellow writers, share your work, get feedback, and join writing sprints. Plus, we’re working on adding notifications for when someone comments on your work or posts new writing. Community = accountability, right? <a href="https://join.slack.com/t/plumbumwriters/shared_invite/zt-2zvkzyi02-dRlhqb0wvHAaU~~dUgh7hQ">Join here</a>.</p>

    <h2>📅 Want More Events?</h2>
    <p>We’re also keeping track of the coolest writing-adjacent events in NYC. Think readings, workshops, and maybe a weird puppet show that’s actually genius. Check out the full calendar: <a href="https://plumbum.app/events">Plumbum Calendar</a>.</p>

    <span class="footer">
      <p>Not feeling these updates? No worries. <a href="${process.env.DOMAIN}/subscribe?${params.toString()}">Update your email preferences</a>.</p>
      <p>Plumbum: Where Writers Gather, Procrastinate, and Sometimes Actually Write.</p>
    </span>
  </div>
</body>
</html>`}}
module.exports = eventNewsletterTemplate
    // Render events
function formatDate(isoString) {
        try {
          const date = new Date(isoString);
      
          if (isNaN(date.getTime())) {
            return "Invalid Date";
          }
      
          // Convert to New York City Time
          const options = {
            timeZone: 'America/New_York',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            month: '2-digit',
            day: '2-digit',
          };
      
          const formatter = new Intl.DateTimeFormat('en-US', options);
          return formatter.format(date);
        } catch (error) {
          console.error("Error formatting date:", error);
          return "Invalid Date";
        }
      }