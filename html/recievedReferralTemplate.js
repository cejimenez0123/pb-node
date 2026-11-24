const escapeHtml = require("../utils/escapeHtml");


module.exports = function receiveRefferalTemplate(email, name, token) {
  const safeName = escapeHtml(name || "there");
///xxx
  const link =
    `${process.env.DOMAIN}/register?token=${encodeURIComponent(token)}`;

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: email,
    subject: "You've Been Invited to Join Plumbum!",

    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Plumbum Invitation</title>
      </head>

      <body style="
        font-family: Arial, sans-serif;
        background-color: #2E2E2E;
        color: #D4D4D4;
        margin: 0;
        padding: 40px 16px;
      ">
        <div style="
          text-align: center;
          background-color: #1D1D1D;
          border-radius: 10px;
          padding: 40px 30px;
          width: 80%;
          max-width: 600px;
          margin: 0 auto;
          box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
        ">
          <h1 style="
            font-size: 3em;
            color: #A9C5D3;
            margin-bottom: 20px;
            letter-spacing: 2px;
          ">
            Plumbum
          </h1>

          <p>Hello ${safeName},</p>

          <p>
            You've been invited to join Plumbum, a place where
            creativity and community come together. We believe
            your voice can make a difference in this artistic space.
          </p>

          <p>
            To get started, click the link below:
          </p>

          <a
            href="${link}"
            style="
              display: inline-block;
              font-size: 1.2em;
              color: #B1A7D5;
              text-decoration: none;
              padding: 10px 20px;
              border: 2px solid #B1A7D5;
              border-radius: 5px;
            "
          >
            Join Plumbum
          </a>

          <p style="
            margin-top: 30px;
            font-size: 0.9em;
            color: #A9C5D3;
          ">
            If you did not expect this invitation, feel free
            to ignore this email.
          </p>
        </div>
      </body>
      </html>
    `,
  };
};
