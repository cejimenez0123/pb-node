module.exports = function adminNotificationTemplate({ type, reporterUsername, reportedUsername, reason, reasonDetails, contentType, contentId }) {
  const isBlock = type === "block";
  const heading = isBlock ? "New Block Reported" : "New User Report";

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: process.env.PBEMAIL,
    subject: isBlock ? `Plumbum: ${reporterUsername} blocked ${reportedUsername}` : `Plumbum: New report against ${reportedUsername}`,
    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Plumbum Admin Alert</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Open+Sans:wght@400;700&display=swap');
        body { font-family: 'Open Sans', sans-serif; background-color: #f8f8f8; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px; }
        .header { text-align: center; font-family: 'Lora', serif; color: #991b1b; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #991b1b; background: #fef1f1; border-radius: 5px; }
        .row { margin: 6px 0; }
        .label { font-weight: bold; }
        .btn { display: inline-block; background: #991b1b; color: white; text-decoration: none; padding: 10px 15px; border-radius: 5px; font-weight: bold; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="header">${heading}</h1>
        <div class="section">
            <div class="row"><span class="label">Reporter:</span> ${reporterUsername}</div>
            <div class="row"><span class="label">Reported user:</span> ${reportedUsername}</div>
            ${contentType ? `<div class="row"><span class="label">Content type:</span> ${contentType}</div>` : ""}
            ${contentId ? `<div class="row"><span class="label">Content ID:</span> ${contentId}</div>` : ""}
            <div class="row"><span class="label">Reason:</span> ${reason || "N/A"}</div>
            ${reasonDetails ? `<div class="row"><span class="label">Details:</span> ${reasonDetails}</div>` : ""}
            <p><a href="[Admin Reports URL]" class="btn">Review in Admin Panel</a></p>
        </div>
    </div>
</body>
</html>`
  };
};