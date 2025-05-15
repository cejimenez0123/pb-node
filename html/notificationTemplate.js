const Paths = require("../utils/Paths");
const jwt = require("jsonwebtoken");

function isStoryLinkOnly(html) {
  if (!html) return false;
  const hasLink = /<a\s+href=["'][^"']+["'][^>]*>/i.test(html);
  return hasLink;
}

function stripHtmlTags(html) {
  return html.replace(/<[^>]*>/g, ' ');
}

function limitWords(text, maxWords = 250) {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

module.exports = function notificationTemplate(user, { profile, comments = [], roles = [], following = [], followers = [], collections = [], events = [] }) {
  const hasUpdates = comments.length || roles.length || following.length || followers.length || collections.length || events.length;
  if (!hasUpdates) return null;

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  const params = new URLSearchParams({ token });

  const filteredEvents = events.map(({ area, events: areaEvents }) => {
    let max = 0;
    if (area === "Downtown") max = 2;
    else if (["Virtual", "Uptown", "Queens"].includes(area)) max = 1;
    return { area, events: areaEvents.slice(0, max) };
  });

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: user.email,
    subject: `What's new @ Plumbum`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Plumbum Updates</title>
</head>
<body style="font-family: 'Open Sans', sans-serif; background-color: #E6F2E6; margin: 0; padding: 0;">
  <table align="center" width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; padding: 40px; border-radius: 8px;">
    <tr><td>
      <h1 style="font-family: 'Lora', serif; font-size: 28px; color: #2F4F2F;">Hello ${profile?.username || "Plumbum Writer"},</h1>
      <p style="font-size: 16px; color: #4A604A;">Here’s what’s new on your account:</p>

      ${collections.length > 0 ? `
      <div>
        <h2>Your Collections</h2>
        ${collections
          .filter(c => c.storyIdList?.length > 0 && c.storyIdList[0]?.story?.data)
          .slice(0, 2)
          .map(collection => {
            const storyHtml = collection.storyIdList[0]?.story?.data || "";
            return `
              <div class="event" style="background-color: #F0F7F0; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                <p>
                  <a href="https://plumbum.app/collection/${collection.id}" style="font-weight: bold;">
                    ${collection.title || "Untitled Collection"}
                  </a> was updated.
                </p>
                <div style="margin-top: 10px;">
                  ${storyHtml}
                </div>
                <p class="timestamp" style="font-size: 12px; color: #777;">
                  ${new Date(collection.updated).toLocaleString()}
                </p>
              </div>
            `;
          }).join("")}
      </div>
    ` : ""}
    

      ${filteredEvents.map(({ area, events: areaEvents }) => {
        if (!areaEvents.length) return '';
        return `
        <h2 style="font-family: 'Montserrat', sans-serif; color: #3D6B47;">${area} Events</h2>
        ${areaEvents.map(event => {
          const start = new Date(event.start.dateTime || event.start.date).toLocaleString("en-US", {
            dateStyle: "medium", timeStyle: "short", timeZone: event.start.timeZone || "America/New_York"
          });
          const end = new Date(event.end.dateTime || event.end.date).toLocaleString("en-US", {
            dateStyle: "medium", timeStyle: "short", timeZone: event.end.timeZone || "America/New_York"
          });
          const description = limitWords(stripHtmlTags(event.description || '')).replace(/\n/g, '<br>');
          return `
          <table width="100%" style="background: #F0F7F0; margin-bottom: 20px; border-radius: 8px; padding: 16px;">
            <tr><td>
              <p><strong>${event.summary || "Untitled Event"}</strong></p>
              <p>${description}</p>
              <p><strong>When:</strong> ${start} – ${end}</p>
              <p><strong>Where:</strong> ${event.location || "Location TBD"}</p>
              <p><a href="${event.htmlLink}" target="_blank" style="color: #3D6B47; font-weight: 600; text-decoration: underline;">View Event Details</a></p>
            </td></tr>
          </table>`;
        }).join('')}`;
      }).join('')}

      ${comments.length > 0 ? `
        <h2 style="font-family: 'Montserrat', sans-serif; color: #3D6B47;">New Comments</h2>
        ${comments.slice(0, 2).map(comment => `
        <table width="100%" style="background: #F0F7F0; margin-bottom: 20px; border-radius: 8px; padding: 16px;">
          <tr><td>
            <p><strong>${comment.profile?.username || "Someone"}</strong> commented on your story
              <a href="https://plumbum.app/page/${comment.story?.id || ""}" style="color: #3D6B47; font-weight: 600; text-decoration: underline;">${comment.story?.title || "Untitled"}</a>:</p>
            <p>"${comment.content || ""}"</p>
            <p style="font-size: 12px; color: #777;">${new Date(comment.created).toLocaleString()}</p>
          </td></tr>
        </table>`).join('')}` : ""}

      ${followers.length > 0 ? `
        <h2 style="font-family: 'Montserrat', sans-serif; color: #3D6B47;">New Followers</h2>
        ${followers.slice(0, 2).map(follower => `
        <table width="100%" style="background: #F0F7F0; margin-bottom: 20px; border-radius: 8px; padding: 16px;">
          <tr><td>
            <p><strong>${follower.follower?.username || "Someone"}</strong> started following you.</p>
            <p style="font-size: 12px; color: #777;">${new Date(follower.created).toLocaleString()}</p>
          </td></tr>
        </table>`).join('')}` : ""}

      <p><a href="https://plumbum.app" style="display: inline-block; padding: 12px 20px; background-color: #3D6B47; color: #ffffff; border-radius: 5px; text-decoration: none; font-weight: bold;">Go to your dashboard</a></p>

      <div style="margin-top: 40px; font-size: 12px; color: #3D6B47; text-align: center;">
        <p>You’re receiving this email because you signed up for updates from Plumbum.</p>
        <p><a href="${process.env.DOMAIN}/subscribe?${params.toString()}" style="color: #065f46; text-decoration: underline;">Manage Subscription</a></p>
        <p style="color: #374151; font-size: 14px;">
          Need a break? <a href="${process.env.BASEPATH}/auth/unsubscribe?${params.toString()}" style="color: #065f46; text-decoration: underline;">Unsubscribe here</a>.
        </p>
      </div>

    </td></tr>
  </table>
</body>
</html>`
  };
};
