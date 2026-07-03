// utils/emailTemplates/reportNotificationTemplate.js

module.exports = function reportNotificationTemplate({ reportedProfile, reports, pendingCount }) {
  const reviewLink = `${process.env.DOMAIN}/admin/reports/review`;

  const reasonsList = reports
    .map((r) => `<li style="margin-bottom:6px;">${r.contentType} — ${r.reason}</li>`)
    .join("");

  const reasonsText = reports.map((r) => `- ${r.contentType}: ${r.reason}`).join("\n");

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: process.env.MODERATION_EMAIL,
    replyTo: process.env.pbEmail,
    subject: `Content report: @${reportedProfile.username}${pendingCount > 1 ? ` (${pendingCount} pending)` : ""}`,
    text: `A user has been reported on Plumbum.

Reported user: @${reportedProfile.username}
This report:
${reasonsText}

${pendingCount > 1 ? `There are ${pendingCount} reports pending review in total.\n\n` : ""}View all pending reports here: ${reviewLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #5A5A5A; font-size: 18px;">Content report on Plumbum</h2>
        <p style="font-size: 15px; color: #5A5A5A;">
          <strong>@${reportedProfile.username}</strong> was just reported:
        </p>
        <ul style="font-size: 14px; color: #5A5A5A; text-align: left; padding-left: 20px;">
          ${reasonsList}
        </ul>
        ${
          pendingCount > 1
            ? `<p style="font-size: 14px; color: #5A5A5A;">${pendingCount} reports are pending review in total.</p>`
            : ""
        }
        <a href="${reviewLink}" style="display: inline-block; background-color: #5A5A5A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 15px; margin-top: 10px;">
          View Pending Reports
        </a>
        <footer style="font-size: 12px; color: #9E9E9E; margin-top: 24px;">
          &copy; ${new Date().getFullYear()} Plumbum. All rights reserved.
        </footer>
      </div>
    `,
  };
};