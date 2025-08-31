
const jwt = require('jsonwebtoken');
const { parse } = require('path');


const eventNewsletterTemplate=(events,user,days)=>{
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    let params = new URLSearchParams({token:token})
    const today = new Date();
    today.setHours(0, 0, 0, 0);


    
      today.setHours(0, 0, 0, 0);
      
      const allEvents = [
        { date: parseEventDate("Mon. June 9th", today.getFullYear()), description: "Writers Workshop @ Andrew Freedman Home" },
        { date: parseEventDate("Sat. June 21st", today.getFullYear()), description: "Writers Workshop @ Boogie Down Grind" },
        { date: parseEventDate("Mon. July 14", today.getFullYear()), description: "Writers Workshop @ Andrew Freedman Home" },
        { date: parseEventDate("Sat. July 19th", today.getFullYear()), description: "Writers Workshop @ Boogie Down Grind" },
        { date: parseEventDate("Sat. August 16th", today.getFullYear()), description: "Open Mic @ Bronxlandia",link:"https://partiful.com/e/4xLnLRiDC2QDvs1PUId8" }, 
        { date: parseEventDate("Mon. August 11th", today.getFullYear()), description: "Writers Workshop @ Andrew Freedman Home",link:"https://partiful.com/e/hCkUYQlaHLrbg36xMLmH" },
        // { date: parseEventDate("Sat. August 23rd", today.getFullYear()), description: "Writers Workshop @ Boogie Down Grind" },
        { date: parseEventDate("Thurs. August 28th", today.getFullYear()), description: "Mixer @ Andrew Freedman Home" } 
      ];
      
      // 1. Filter out events before today (optional, if you only want upcoming)
      const upcomingEvents = allEvents.filter(event => event.date >= today);
    
      upcomingEvents.sort((a, b) => a.date - b.date);
      // 3. Take the next two events
      const nextTwoEvents = upcomingEvents.slice(0, 2);
      
      function formatDate(date) {
        if (!date) return ''; // Return empty string if null or undefined
      
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d)) return ''; // Return empty string if invalid date
      
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      }
      
    
    const htmlList = `
      <ul>
        ${nextTwoEvents.map(event => `<a href="${event.link??""}"><li><strong>${formatDate(event.date)}</strong>: ${event.description}</li></a>`).join('')}
      </ul>
    `;
    
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
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #fff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
          }
          h1 {
            font-family: 'Lora', serif;
            font-size: 28px;
            color: #2F4F2F;
            margin-bottom: 20px;
          }
          h2 {
            font-family: 'Montserrat', sans-serif;
            font-size: 22px;
            color: #3D6B47;
            margin-top: 30px;
          }
          p {
            font-size: 16px;
            color: #4A604A;
            line-height: 1.6;
          }
          a {
            color: #3D6B47;
            font-weight: 600;
            text-decoration: underline;
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
          .event {
            background-color: #F0F7F0;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 10px;
          }
          .footer {
            margin-top: 40px;
            font-size: 12px;
            color: #3D6B47;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Hey there, Plumbum writer!</h1>
          <p>Hope you’re writing, resting, and thriving. We’ve got a whole summer of creativity coming up — and you’re invited!</p>
      
          <h2>📝 Upcoming Writer Workshops</h2>
          <p>Join us for generative writing sessions, constructive feedback, and fresh inspiration:</p>
         ${ 
          htmlList
        }
          <p>RSVP and full details will be posted in Slack and on the calendar!</p>
      
          <h2>🌿 This Week’s Creative Events</h2>
          ${events && events.length ? events.map(area => 
            `<h3>${area.area}</h3>
            <ul>
              ${area.events.map(event => 
                event.organizer.displayName.toLowerCase().trim() === area.area.toLowerCase().trim() ? 
                `<li class="event"><a href="${linkifyFirstUrl(event.description)}">${event.summary} - ${formatEventDate(event.start.dateTime)} to ${formatEventDate(event.end.dateTime)}</a></li>` 
                : ''
              ).join('')}
            </ul>`
          ).join('') : `<div class="event"><p>No events scheduled this time. Stay tuned!</p></div>`}
      
       
          <h2>🎵 We have our acts for the Mixer</h2>
          <ul>
          <li><a href="https://www.instagram.com/anevolution_"> Anevolution_ </a></li>
         <li> <a href="https://www.instagram.com/e.8az6/"> Eric.az</a></li>
          <li><a href="https://www.instagram.com/sagi_868/"> Sagi</a></li>
          </ul>
          <p>Are mixer is coming up on Thursday August 28th. The theme is foward so dress looking ahead to who you want to be with new and old clothes.
          <h2>👥 Join Our Slack</h2>
          <p>Our Slack is where it all happens — writing sprints, live edits, meme exchanges, and drop-in hangouts. <a href="https://join.slack.com/t/plumbumwriters/shared_invite/zt-2zvkzyi02-dRlhqb0wvHAaU~~dUgh7hQ">Join here</a>.</p>
      
          <h2>🌐 Post Your Own Weirdness</h2>
          <p>Got something creative brewing? Become a Plumbum user and share your own work on the platform. <a href="${process.env.DOMAIN}/apply/newsletter">Apply here</a>.</p>
      
          <h2>📚 Want More Events?</h2>
          <p>We also highlight writing-adjacent events across NYC — from readings to puppet shows. Explore the <a href="https://plumbum.app/events">Plumbum Calendar</a>.</p>
      
          <div class="footer">
            <p>Don't want these emails? <a href="${process.env.DOMAIN}/subscribe?${params.toString()}">Update your preferences here</a>.</p>
            <p>Plumbum: Where Writers Gather, Procrastinate, and Sometimes Actually Write.</p>
          </div>
        </div>
      </body>
      </html>
      `,

}}
module.exports = eventNewsletterTemplate
    // Render events
function parseEventDate(dateString, year) {
      // Remove day of week abbreviations (e.g., "Mon. ", "Tue. ")
      let cleanedDateString = dateString.replace(/(Mon\.|Tue\.|Wed\.|Thu\.|Fri\.|Sat\.|Sun\.|Thurs\.)/g, '');
      // Remove ordinal suffixes (e.g., "9th" -> "9")
      cleanedDateString = cleanedDateString.replace(/(\d+)(st|nd|rd|th)/g, '$1').trim();
      // Append the year for accurate parsing
      const date = new Date(`${cleanedDateString}, ${year}`);
      // Set time to 00:00:00.000 to compare dates based on day
      date.setHours(0, 0, 0, 0);
      return date;
    }
    
function formatEventDate(isoString) {
        try {
          const date = new Date(isoString);
      
          if (isNaN(date.getTime())) {
            return "Invalid Date";
          }
      
          // Convert to New York City Time
          const options = {
            timeZone: 'America/New_York',
            weekday:"short",
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

const linkifyFirstUrl=(text) =>{
  if (!text) return '';

  // Remove HTML tags
  const strippedText = text.replace(/<[^>]*>/g, '');

  // Match the first URL in plain text
  const urlRegex = /(https?:\/\/[^\s]+)/i;
  const match = strippedText.match(urlRegex);

  if (!match) return ''; // No URL found

  const url = match[0];
 
  return url;
}
  
 