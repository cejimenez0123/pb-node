
module.exports = function applyTemplate(user, body, newsletter = false) {
  const {
    email,
    igHandle,
    fullName,
    whyApply,
    howFindOut,
    communityNeeds,
    writingOutcome,
    events,
    selectedEvents,
    otherEvent,
    eventPain,
  } = body;

  // normalize events (IMPORTANT FIX)
  const baseEvents = Array.isArray(events) ? events : [];
  const selected = Array.isArray(selectedEvents) ? selectedEvents : [];

  const finalEvents = [
    ...new Set([
      ...baseEvents,
      ...selected,
      ...(otherEvent ? [otherEvent] : []),
    ]),
  ];

  const params = new URLSearchParams({
    applicantId: user.id,
    action: "approve",
    email,
    newsletter,
  });

  const path =
    process.env.BASEPATH +
    "auth/review?" +
    params.toString();

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: process.env.PBEMAIL,
    subject: "New Plumbum Application",

    html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Application Review</title>

<style>
  body {
    font-family: Arial, sans-serif;
    background-color: #f4f4f4;
    color: #222;
    padding: 24px;
  }

  .container {
    max-width: 680px;
    margin: auto;
    background: #ffffff;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.08);
  }

  .header {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 20px;
    color: #1f2937;
  }

  .section {
    margin-bottom: 18px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
  }

  .label {
    font-weight: bold;
    color: #374151;
    margin-bottom: 6px;
  }

  .value {
    color: #111827;
    white-space: pre-wrap;
  }

  ul {
    margin: 6px 0 0 18px;
  }

  .button {
    display: inline-block;
    background: #4CAF50;
    color: white;
    padding: 10px 16px;
    text-decoration: none;
    border-radius: 8px;
    margin-top: 16px;
  }

  .button:hover {
    background: #45a049;
  }

  .muted {
    color: #6b7280;
    font-size: 12px;
  }
</style>
</head>

<body>
  <div class="container">

    <div class="header">New Plumbum Application</div>

    <div class="section">
      <div class="label">Identity</div>
      <div class="value">
        Name: ${fullName || "N/A"}<br/>
        Email: ${email || "N/A"}<br/>
        Instagram: ${igHandle || "N/A"}
      </div>
    </div>

    <div class="section">
      <div class="label">Why they applied</div>
      <div class="value">${whyApply || "N/A"}</div>
    </div>

    <div class="section">
      <div class="label">What they’re looking for in community</div>
      <div class="value">${communityNeeds || "N/A"}</div>
    </div>

    <div class="section">
      <div class="label">What they hope to change in their writing life</div>
      <div class="value">${writingOutcome || "N/A"}</div>
    </div>

    <div class="section">
      <div class="label">Events they engage with</div>
      <div class="value">
        ${
          finalEvents.length
            ? `<ul>${finalEvents.map(e => `<li>${e}</li>`).join("")}</ul>`
            : "N/A"
        }
      </div>
    </div>

    <div class="section">
      <div class="label">What makes them stay or leave events</div>
      <div class="value">${eventPain || "N/A"}</div>
    </div>

    <div class="section">
      <div class="label">How they found Plumbum</div>
      <div class="value">${howFindOut || "N/A"}</div>
    </div>

    <a class="button" href="${path}">
      Approve Application
    </a>

    <div class="muted" style="margin-top:12px;">
      Plumbum Application Review System
    </div>

  </div>
</body>
</html>
    `,
  };
};