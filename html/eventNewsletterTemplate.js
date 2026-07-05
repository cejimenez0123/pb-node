
const jwt = require('jsonwebtoken');



const eventNewsletterTemplate = (events, user, days) => {
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  const params = new URLSearchParams({ token: token });
  const unsubscribeUrl = `${process.env.DOMAIN}/subscribe?${params.toString()}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fixed: removed stray leading commas that produced `undefined` entries
  const allEvents = [
    { date: parseEventDate("Sat. July. 18th", today.getFullYear()), description: "Writers Workshop X Coffee Rave" },
    { date: parseEventDate("Sat. Aug. 15th", today.getFullYear()), description: "Spark Open Mic" },
  ];

  // 1. Filter out events before today
  const upcomingEvents = allEvents.filter(event => event.date >= today);

  upcomingEvents.sort((a, b) => a.date - b.date);
  // 3. Take the next two events
  const nextTwoEvents = upcomingEvents.slice(0, 2);

  function formatDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }

  const htmlList = `
    <ul>
      ${nextTwoEvents.map(event => `<a href="${event.link ?? ""}"><li><strong>${formatDate(event.date)}</strong>: ${event.description}</li></a>`).join('')}
    </ul>
  `;

  // Plain-text list mirrors the HTML list for the text version
  const textEventList = nextTwoEvents.map(event => `- ${formatDate(event.date)}: ${event.description}`).join('\n');

  const weeklyAreas = events && events.length
    ? events.map(area => {
        const areaLines = area.events
          .filter(event => event.organizer.displayName.toLowerCase().trim() === area.area.toLowerCase().trim())
          .map(event => `  - ${event.summary} (${formatEventDate(event.start.dateTime)} to ${formatEventDate(event.end.dateTime)})`)
          .join('\n');
        return `${area.area}:\n${areaLines}`;
      }).join('\n\n')
    : 'No events scheduled this time. Stay tuned!';

  // ---- Plain-text version (required alongside HTML to avoid spam filters) ----
  const text = `Hey there, Plumbum writer!

Hope you're writing, resting, and thriving. We've got a whole summer of creativity coming up — and you're invited!

${nextTwoEvents.length > 0 ? `UPCOMING EVENTS\n${textEventList}\n\n` : ''}THIS WEEK'S CREATIVE EVENTS
${weeklyAreas}

JOIN OUR INSTAGRAM CHANNEL
https://www.instagram.com/channel/AbaI9yaoN4KfPze_/?igsh=MTJrbzQyaDliaDdscw==

POST YOUR OWN WEIRDNESS
Become a Plumbum user and share your own work: ${process.env.DOMAIN}/apply/newsletter

WANT MORE EVENTS?
Explore the Plumbum Calendar: https://plumbum.app/events

---
Don't want these emails? Update your preferences: ${unsubscribeUrl}
Plumbum: Where Writers Gather, Procrastinate, and Sometimes Actually Write.
`;

  const html = `<!DOCTYPE html>
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
        <p>Hope you're writing, resting, and thriving. We've got a whole summer of creativity coming up — and you're invited!</p>

        ${nextTwoEvents.length > 0 ? `<h2>Upcoming Events</h2>
        <p>Join us for generative writing sessions, constructive feedback, and fresh inspiration:</p>
        ${htmlList}` : ``}

        <h2>This Week's Creative Events</h2>
        ${events && events.length ? events.map(area =>
          `<h3>${area.area}</h3>
          <ul>
            ${area.events.map(event =>
              event.organizer.displayName.toLowerCase().trim() === area.area.toLowerCase().trim() ?
              `<li class="event"><a href="${linkifyFirstUrl(event.description) || '#'}">${event.summary} - ${formatEventDate(event.start.dateTime)} to ${formatEventDate(event.end.dateTime)}</a></li>`
              : ''
            ).join('')}
          </ul>`
        ).join('') : `<div class="event"><p>No events scheduled this time. Stay tuned!</p></div>`}

        <h2>Join Our Instagram Channel</h2>
        <p>Writing sprints, prompts, meme exchanges. <a href="https://www.instagram.com/channel/AbaI9yaoN4KfPze_/?igsh=MTJrbzQyaDliaDdscw==">Join here</a>.</p>

        <h2>Post Your Own Weirdness</h2>
        <p>Got something creative brewing? Become a Plumbum user and share your own work on the platform. <a href="${process.env.DOMAIN}/apply/newsletter">Apply here</a>.</p>

        <h2>Want More Events?</h2>
        <p>We also highlight writing-adjacent events across NYC — from readings to puppet shows. Explore the <a href="https://plumbum.app/events">Plumbum Calendar</a>.</p>

        <div class="footer">
          <p>Don't want these emails? <a href="${unsubscribeUrl}">Update your preferences here</a>.</p>
          <p>Plumbum: Where Writers Gather, Procrastinate, and Sometimes Actually Write.</p>
        </div>
      </div>
    </body>
    </html>
    `;

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: user.email,
    subject: 'Plumbum Writers Community - Upcoming Events',
    text,
    html,
    // Pass these through to your resend.emails.send() call as top-level `headers`.
    // Resend supports a `headers` field on the send payload — merge this in there.
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:unsubscribe@${(process.env.DOMAIN || '').replace(/^https?:\/\//, '')}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  };
};

module.exports = eventNewsletterTemplate;

// Render events
function parseEventDate(dateString, year) {
  // Remove day of week abbreviations (e.g., "Mon. ", "Tue. ")
  let cleanedDateString = dateString.replace(/(Mon\.|Tue\.|Wed\.|Thu\.|Fri\.|Sat\.|Sun\.|Thurs\.)/g, '');
  // Remove ordinal suffixes (e.g., "9th" -> "9")
  cleanedDateString = cleanedDateString.replace(/(\d+)(st|nd|rd|th)/g, '$1').trim();
  // Append the year for accurate parsing
  const date = new Date(`${cleanedDateString}, ${year}`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatEventDate(isoString) {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    const options = {
      timeZone: 'America/New_York',
      weekday: "short",
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

// Fixed: no longer returns '' silently swallowed into an empty href;
// callers now fall back to '#' when this returns falsy.
function linkifyFirstUrl(text) {
  if (!text) return '';
  const strippedText = text.replace(/<[^>]*>/g, '');
  const urlRegex = /(https?:\/\/[^\s]+)/i;
  const match = strippedText.match(urlRegex);
  if (!match) return '';
  return match[0];
}