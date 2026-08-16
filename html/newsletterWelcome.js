const jwt = require("jsonwebtoken");
const footer = require("./footer");

function baseStyles() {
  return `
    margin:0; padding:0; font-family: 'Open Sans', Arial, sans-serif; background-color:#E6F2E6;
  `;
}





function h1(text) {
  return `<h1 style="margin:0 0 16px 0; font-family:'Lora', serif; font-size:26px; color:#2F4F2F;">${text}</h1>`;
}

function h2(text) {
  return `<h2 style="margin:24px 0 12px 0; font-family:'Montserrat', Arial, sans-serif; font-size:20px; color:#3D6B47;">${text}</h2>`;
}

function p(text) {
  return `<p style="margin:0 0 14px 0; font-size:16px; color:#4A604A; line-height:1.6;">${text}</p>`;
}

function cta(href, label) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 8px 0;">
      <tr>
        <td align="left" bgcolor="#3D6B47" style="border-radius:5px;">
          <a href="${href}"
            style="display:inline-block; padding:12px 18px; color:#ffffff; text-decoration:none; font-weight:600; font-family:'Montserrat', Arial, sans-serif;">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}



/**
 * 1) Application Confirmation Email
 * Sent right after a user applies.
 */
module.exports = function applicationConfirmationTemplate(user = {}, opts = {}) {
  const name = user?.profile?.username || user?.name || "Plumbum Writer";
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  const manageUrl = `${process.env.DOMAIN}/subscribe?token=${encodeURIComponent(token)}`;
  const unsubscribeUrl = `${process.env.BASEPATH}/auth/unsubscribe?token=${encodeURIComponent(token)}`;
  const dashboardUrl = `${process.env.DOMAIN}`;
  const slackInvite = "https://join.slack.com/t/plumbumwriters/shared_invite/zt-2zvkzyi02-dRlhqb0wvHAaU~~dUgh7hQ";
  const calendarUrl = `${process.env.DOMAIN}/events`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="${baseStyles()}">

  ${cardTableOpen()}
    ${h1(`Thanks for Applying, ${name}!`)}
    ${p(`We’re excited you applied to Plumbum. We reviews applications with care to keep the community thoughtful and supportive.`)}
    ${p(`While we’re processing your application, you can jump into our Slack to meet other writers, swap feedback, and catch live prompts and sprints.`)}
    ${cta(slackInvite, "Join the Slack Community")}
    ${h2("What to Expect Next")}
    <ul style="margin:0 0 14px 18px; color:#4A604A; font-size:16px; line-height:1.6; padding:0;">
      <li style="margin-bottom:8px;">Application review.</li>
      <li style="margin-bottom:8px;">Community invites and writing sprints in Slack.</li>
      <li style="margin-bottom:8px;">Early access to events, mixers, and workshops.</li>
    </ul>
    ${cta(calendarUrl, "See Upcoming Events")}
    ${p(`If you made a typo or want to add notes, just reply to this email—we actually read these.`)}
    ${p(`With care,`)}
    ${p(`<strong>Plumbum Team</strong>`)}
  ${cardTableClose()}

  ${footer({ manageUrl, unsubscribeUrl })}

</body>
</html>
  `;

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: user.email,
    subject: "We got your application — Plumbum 💌",
    html
  };
}

/**
 * 2) Newsletter Welcome Email
 * Sent when a user joins/subscribes to the newsletter.
 */
function newsletterWelcomeTemplate(user = {}) {
  const name = user?.profile?.username || user?.name || "Plumbum Writer";
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  const manageUrl = `${process.env.DOMAIN}/subscribe?token=${encodeURIComponent(token)}`;
  const unsubscribeUrl = `${process.env.BASEPATH}/auth/unsubscribe?token=${encodeURIComponent(token)}`;
  const calendarUrl = `${process.env.DOMAIN}/events`;
  const applyUrl = `${process.env.DOMAIN}/apply/newsletter`;
  const homeUrl = `${process.env.DOMAIN}`;
  const slackInvite = "https://join.slack.com/t/plumbumwriters/shared_invite/zt-2zvkzyi02-dRlhqb0wvHAaU~~dUgh7hQ";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="${baseStyles()}">

  ${cardTableOpen()}
    ${h1(`Hey ${name}, you're in!`)}
    ${p(`Welcome to the Plumbum newsletter — your weekly nudge to write, share, and connect. We’ll send hand-picked events, prompts, and opportunities (with the occasional weird puppet show that’s secretly genius).`)}
    ${h2("Quick Start")}
    <ul style="margin:0 0 14px 18px; color:#4A604A; font-size:16px; line-height:1.6; padding:0;">
      <li style="margin-bottom:8px;">Browse what’s coming up on the calendar.</li>
      <li style="margin-bottom:8px;">Join our Slack to swap feedback & sprint together.</li>
      <li style="margin-bottom:8px;">Want to post your own events or work? Apply for a user account.</li>
    </ul>
    ${cta(calendarUrl, "See the Calendar")}
    ${cta(slackInvite, "Join the Slack")}
    ${cta(applyUrl, "Apply for a User Account")}
    ${p(`Prefer fewer emails? You can tune frequency anytime.`)}
    ${p(`<a href="${manageUrl}" style="color:#065f46; text-decoration:underline; font-weight:600;">Manage Preferences</a>`)}
    ${p(`Glad you’re here,`)}
    ${p(`<strong>Plumbum Team</strong>`)}
  ${cardTableClose()}

  ${footer({ manageUrl, unsubscribeUrl })}

</body>
</html>
  `;

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: user.email,
    subject: "Welcome to Plumbum — let’s write ✍️",
    html
  };
}

module.exports = {
  newsletterWelcomeTemplate
};
