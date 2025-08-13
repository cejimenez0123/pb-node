// confirmationEmails.js
const jwt = require("jsonwebtoken");

function baseStyles() {
  return `
    margin:0; padding:0; font-family: 'Open Sans', Arial, sans-serif; background-color:#E6F2E6;
  `;
}

function cardTableOpen() {
  return `
    <table align="center" width="600" cellpadding="0" cellspacing="0" role="presentation"
      style="margin:20px auto; background:#ffffff; border-radius:8px;">
      <tr>
        <td style="padding:32px 32px 24px 32px;">
  `;
}

function cardTableClose() {
  return `
        </td>
      </tr>
    </table>
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

function footer({ manageUrl, unsubscribeUrl }) {
  return `
    ${cardTableOpen()}
      <table width="100%" role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="font-size:12px; color:#3D6B47;">
            <p style="margin:0 0 10px 0;">You’re receiving this email from Plumbum.</p>
            <p style="margin:0 0 8px 0;">
              <a href="${manageUrl}" style="color:#065f46; text-decoration:underline;">Manage Preferences</a>
            </p>
            <p style="margin:0; color:#374151; font-size:13px;">
              Need a break? <a href="${unsubscribeUrl}" style="color:#065f46; text-decoration:underline;">Unsubscribe</a>.
            </p>
          </td>
        </tr>
      </table>
    ${cardTableClose()}
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
    ${p(`We’re excited you applied to Plumbum. Our team reviews applications with care to keep the community thoughtful and supportive.`)}
    ${p(`While we’re processing your application, you can jump into our Slack to meet other writers, swap feedback, and catch live prompts and sprints.`)}
    ${cta(slackInvite, "Join the Slack Community")}
    ${h2("What to Expect Next")}
    <ul style="margin:0 0 14px 18px; color:#4A604A; font-size:16px; line-height:1.6; padding:0;">
      <li style="margin-bottom:8px;">Application review (you’ll get an email from us soon).</li>
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
    subject: "We got your application — welcome to Plumbum 💌",
    html
  };
}


