
const jwt = require('jsonwebtoken');


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
        { date: parseEventDate("Sat. August 9th", today.getFullYear()), description: "Open Mic @ Boogie Down Grind" }, // Exclude this in workshop filter?
        { date: parseEventDate("Mon. August 11th", today.getFullYear()), description: "Writers Workshop @ Andrew Freedman Home" },
        { date: parseEventDate("Sat. August 23rd", today.getFullYear()), description: "Writers Workshop @ Boogie Down Grind" },
        { date: parseEventDate("Thurs. August 28th", today.getFullYear()), description: "Mixer @ ndrew Freedman Home" } // Exclude this in workshop filter?
      ];
      
      // 1. Filter out events before today (optional, if you only want upcoming)
      const upcomingEvents = allEvents.filter(event => event.date >= today);
      // 2. Sort by date (earliest first)
      upcomingEvents.sort((a, b) => a.date - b.date);
      // 3. Take the next two events
      const nextTwoEvents = upcomingEvents.slice(0, 2);
      
    function formatDate(date) {
      // Format as "Month Day" (e.g., "June 9")
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
    
    const htmlList = `
      <ul>
        ${nextTwoEvents.map(event => `<li><strong>${formatDate(event.date)}</strong>: ${event.description}</li>`).join('')}
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
         ${ // <ul>
          //   <li><strong>May 31</strong>: Workshop & community check-in</li>
          //   <li><strong>June 9</strong>: Hybrid generative session + feedback</li>
          // </ul>
          htmlList
        }
          <p>RSVP and full details will be posted in Slack and on the calendar!</p>
      
          <h2>🌿 This Week’s Creative Events</h2>
          ${events && events.length ? events.map(area => 
            `<h3>${area.area}</h3>
            <ul>
              ${area.events.map(event => 
                event.organizer.displayName.toLowerCase().trim() === area.area.toLowerCase().trim() ? 
                `<li class="event"><a href="${event.htmlLink}">${event.summary} - ${formatDate(event.start.dateTime)} to ${formatDate(event.end.dateTime)}</a></li>` 
                : ''
              ).join('')}
            </ul>`
          ).join('') : `<div class="event"><p>No events scheduled this time. Stay tuned!</p></div>`}
      
          <h2>📅 Summer Schedule Preview</h2>
          <p>Want to see what’s ahead? Check out our Summer 2025 Schedule below!</p>
          <img src="https://drive.usercontent.google.com/download?id=1P6hpXQQYqW1ceSr6_2bYWLMz827De_wL&export=view&authuser=0" alt="Summer Schedule" width="100%" style="border-radius: 8px;" />
      
          <h2>🎵 Call for DJs and Musical Acts</h2>
          <p>We’re planning a dance and music showcase! The theme? <em>Body Moving is Body Healing</em>. We’re seeking DJs, vocalists, and live performers who bring the vibes. Know someone? Hit us up at <a href="mailto:plumbumapp@gmail.com">plumbumapp@gmail.com</a>.</p>
      
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
function dateEvents(events, user, days) {
        // (Assuming you want to use allEvents from above, not the 'events' param)
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
        let params = new URLSearchParams({ token: token });
        let str = "Weekly";
      
        // As above: filter, sort, select next two
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingEvents = allEvents.filter(event => event.date >= today);
        upcomingEvents.sort((a, b) => a.date - b.date);
        const nextTwoEvents = upcomingEvents.slice(0, 2);
      
        // Generate HTML
        const htmlList = `
          <ul>
            ${nextTwoEvents.map(event => `<li><strong>${formatDate(event.date)}</strong>: ${event.description}</li>`).join('')}
          </ul>
        `;
      
        return htmlList;
      }