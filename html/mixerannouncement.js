
// mixerAnnouncement.js
const cardTableOpen = require("./cardTableOpen");
const cardTableClose = require("./cardTableClose");
const footer = require("./footer");

function baseStyles() {
  return `
    margin:0;
    padding:0;
    font-family: Arial, Helvetica, sans-serif;
    background-color:#E6F2E6;
    color:#374151;
  `;
}

function h1(text) {
  return `
    <h1 style="
      margin:0 0 20px 0;
      font-family:Georgia, 'Times New Roman', serif;
      font-size:30px;
      line-height:1.2;
      font-weight:700;
      color:#2F4F2F;
    ">
      ${text}
    </h1>
  `;
}

function h2(text) {
  return `
    <h2 style="
      margin:28px 0 12px 0;
      font-family:Arial, Helvetica, sans-serif;
      font-size:19px;
      line-height:1.3;
      font-weight:700;
      color:#3D6B47;
    ">
      ${text}
    </h2>
  `;
}

function p(text) {
  return `
    <p style="
      margin:0 0 16px 0;
      font-size:16px;
      line-height:1.65;
      color:#4A604A;
    ">
      ${text}
    </p>
  `;
}

function cta(href, label) {
  return `
    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="margin:24px 0 10px 0;"
    >
      <tr>
        <td
          align="center"
          bgcolor="#3D6B47"
          style="border-radius:6px;"
        >
          <a
            href="${href}"
            style="
              display:inline-block;
              padding:14px 22px;
              font-family:Arial, Helvetica, sans-serif;
              font-size:16px;
              font-weight:700;
              line-height:1;
              color:#ffffff;
              text-decoration:none;
            "
          >
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Plumbum 4th Mixer Announcement
 */
module.exports = function mixerAnnouncementTemplate(user = {}) {
  const name =
    user?.profile?.username ||
    user?.name ||
    "Plumbum friend";

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET
  );

  const manageUrl =
    `${process.env.DOMAIN}/subscribe?token=${encodeURIComponent(token)}`;

  const unsubscribeUrl =
    `${process.env.BASEPATH}/auth/unsubscribe?token=${encodeURIComponent(token)}`;

  const eventUrl =
    "https://posh.vip/e/creative-x-tech-mixer";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Plumbum's 4th Mixer</title>
</head>

<body style="${baseStyles()}">

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="width:100%; margin:0; padding:0; background-color:#E6F2E6;"
  >
    <tr>
      <td align="center">

        ${cardTableOpen()}

          ${h1("Plumbum's 4th Mixer")}

          ${p("Hey,")}

          ${p("We're doing it again.")}

          ${p(
            "On October 9th, Plumbum is bringing people together for our 4th semi-annual mixer at the Andrew Freedman Home in the Bronx."
          )}

          ${p(
            "We're looking for <strong>alchemic reactions</strong> — people of different origins and disciplines meeting, getting curious, and opening the door to the next idea, conversation, or project."
          )}

          ${p(
            "Come with friends or come by yourself. We'll say hi when you arrive, and you won't be a stranger for long."
          )}

          ${p(
            "Writers, filmmakers, software engineers, UX/UI pros, entrepreneurs — you don't need any of those labels to be part of it. Just be curious."
          )}

          ${h2("Bringing the impact to art, and the heart to tech.")}

          ${p(
            "Expect a poet, two musicians, DJs, food, vendors, and a room full of people making things. And, of course, the Bronx — not the myth, but why we're legends."
          )}

          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              margin:24px 0 8px 0;
              background:#F1F8F5;
              border-radius:6px;
            "
          >
            <tr>
              <td style="padding:18px 20px;">

                <p style="
                  margin:0 0 8px 0;
                  font-family:Arial, Helvetica, sans-serif;
                  font-size:15px;
                  line-height:1.5;
                  color:#4A604A;
                ">
                  <strong>Where:</strong>
                  Andrew Freedman Home, 1125 Grand Concourse, The Bronx
                </p>

                <p style="
                  margin:0;
                  font-family:Arial, Helvetica, sans-serif;
                  font-size:15px;
                  line-height:1.5;
                  color:#4A604A;
                ">
                  <strong>When:</strong>
                  October 9, 7–10 PM
                </p>

              </td>
            </tr>
          </table>

          ${cta(eventUrl, "Get Your Ticket")}

          ${p(
            "Space is limited. Come spark a conversation."
          )}

          ${p("See you there,")}

          ${p("<strong>Sol Emilio</strong><br />Director, Plumbum")}

          ${p(
            "P.S. Community tickets are available."
          )}

        ${cardTableClose()}

        ${footer({ manageUrl, unsubscribeUrl })}

      </td>
    </tr>
  </table>

</body>
</html>
  `;

  const text = `
Plumbum's 4th Mixer

Hey,

We're doing it again.

On October 9th, Plumbum is hosting our 4th semi-annual mixer, we found at home at the Andrew Freedman Home in the Bronx.

We're looking for alchemic reactions — people of different origins and disciplines meeting, getting curious, and opening the door to the next idea, conversation, or project.

Come with friends or come by yourself. We'll say hi when you arrive, and you won't be a stranger for long.

Writers, filmmakers, software engineers, UX/UI pros, entrepreneurs — you don't need any of those labels to be part of it. Just be curious.

Bringing the impact to art, and the heart to tech.

Expect a poet, two musicians, DJs, food, vendors, and a room full of people making things. And, of course, the Bronx — not the myth, but why we're legends.

Where: Andrew Freedman Home, 1125 Grand Concourse, The Bronx
When: October 9, 7–10 PM

Get your ticket:
${eventUrl}

Space is limited. Come spark a conversation.

See you there,

Sol Emilio
Director, Plumbum

P.S. Community tickets are available.
  `.trim();

  return {
    from: `Plumbum <${process.env.helloPBemail}>`,
    to: user.email,
    subject: "Plumbum's 4th Mixer — October 9",
    html,
    text
  };
};
