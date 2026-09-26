

// const jwt = require('jsonwebtoken');

// module.exports = function approvalTemplate(user){
//     const token = jwt.sign({ applicantId:user.id }, process.env.JWT_SECRET);
//     const signupLink = process.env.DOMAIN+`/signup?token=${token}`;
//     return {
//         from: `Plumbum <${process.env.pbEmail}>`, // Sender address
//         to: user.email, // Recipient's email
//         subject: 'Congratulations! Your Application Has Been Approved 🎉',
//         html: `
//           <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
//             <h1 style="color: #5A5A5A;">Welcome to Plumbum, ${user.preferredName}!</h1>
//             <p style="font-size: 16px; color: #5A5A5A;">
//               We’re thrilled to let you know that your application has been approved. 
//               You’re now part of a vibrant community of creators, thinkers, and writers.
//             </p>
//             <p style="font-size: 16px; color: #5A5A5A;">
//               Click the button below to log in and start exploring:
//             </p>
//             <a href="${signupLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
//             Complete Sign-Up
//           </a>
//             <p style="font-size: 14px; color: #5A5A5A; margin-top: 20px;">
//               If you have any questions, feel free to reach out to us at plumbumapp@gmail.com
//             </p>
//             <footer style="font-size: 12px; color: #9E9E9E; margin-top: 20px;">
//               &copy; ${new Date().getFullYear()} Plumbum. All rights reserved.
//             </footer>
//           </div>
//         `,
//       };
// }
const jwt = require("jsonwebtoken");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = function approvalTemplate(user) {
const token = jwt.sign(
  {
    applicantId: user.id,
    email: user.email,
  },
  process.env.JWT_SECRET
);

  const signupLink =
    `${process.env.DOMAIN}/signup?token=${token}`;

  const name =
    escapeHtml(user.preferredName) ||
    "there";

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: user.email,

    subject:
      "Your Plumbum application has been approved",

    /*
     * Plain-text version.
     *
     * This is useful for accessibility and can also help
     * with deliverability compared with HTML-only email.
     */
    text: `
Hi ${user.preferredName || "there"},

Your application to Plumbum has been approved.

You can complete your sign-up here:

${signupLink}

Once you've signed up, you'll be able to create your profile and start using Plumbum.

If you have questions, reply to this email or contact us at ${process.env.pbEmail}.

— Plumbum
${new Date().getFullYear()}
`.trim(),

    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta
      charset="UTF-8"
    />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>Your Plumbum application has been approved</title>
  </head>

  <body
    style="
      margin:0;
      padding:0;
      background:#f5f1df;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color:#173b32;
    "
  >

    <div
      style="
        width:100%;
        padding:40px 16px;
        box-sizing:border-box;
      "
    >

      <div
        style="
          max-width:600px;
          margin:0 auto;
          background:#fffdf7;
          border:1px solid #dce8d9;
          border-radius:20px;
          overflow:hidden;
        "
      >

        <!-- Header -->
        <div
          style="
            padding:28px 32px;
            border-bottom:1px solid #dce8d9;
          "
        >
          <div
            style="
              color:#21866b;
              font-size:18px;
              line-height:1;
              font-weight:700;
              letter-spacing:-0.3px;
            "
          >
            Plumbum
          </div>
        </div>

        <!-- Main content -->
        <div
          style="
            padding:36px 32px 32px 32px;
          "
        >

          <p
            style="
              margin:0 0 12px 0;
              color:#21866b;
              font-size:12px;
              line-height:1.4;
              font-weight:700;
              letter-spacing:1.2px;
              text-transform:uppercase;
            "
          >
            Application approved
          </p>

          <h1
            style="
              margin:0 0 20px 0;
              color:#173b32;
              font-size:30px;
              line-height:1.2;
              font-weight:700;
              letter-spacing:-0.5px;
            "
          >
            Welcome, ${name}.
          </h1>

          <p
            style="
              margin:0 0 18px 0;
              color:#36574f;
              font-size:16px;
              line-height:1.65;
            "
          >
            Your application to Plumbum has been approved.
          </p>

          <p
            style="
              margin:0 0 28px 0;
              color:#36574f;
              font-size:16px;
              line-height:1.65;
            "
          >
            The next step is to complete your sign-up.
            Once you're in, you can create your profile,
            share your writing, and find your way into the
            community.
          </p>

          <!-- Button -->
          <div
            style="
              margin:0 0 28px 0;
            "
          >
            <a
              href="${signupLink}"
              style="
                display:inline-block;
                padding:13px 22px;
                background:#21866b;
                color:#ffffff;
                text-decoration:none;
                border-radius:10px;
                font-size:15px;
                line-height:1.4;
                font-weight:700;
              "
            >
              Complete your sign-up
            </a>
          </div>

          <!-- Fallback link -->
          <div
            style="
              padding:18px 20px;
              background:#f3f7ef;
              border:1px solid #dce8d9;
              border-radius:14px;
            "
          >
            <p
              style="
                margin:0 0 8px 0;
                color:#173b32;
                font-size:12px;
                line-height:1.4;
                font-weight:700;
                letter-spacing:0.8px;
                text-transform:uppercase;
              "
            >
              Having trouble with the button?
            </p>

            <p
              style="
                margin:0;
                color:#36574f;
                font-size:13px;
                line-height:1.6;
                word-break:break-word;
              "
            >
              ${signupLink}
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div
          style="
            padding:24px 32px;
            border-top:1px solid #dce8d9;
          "
        >
          <p
            style="
              margin:0 0 8px 0;
              color:#36574f;
              font-size:13px;
              line-height:1.6;
            "
          >
            Questions? Reply to this email or contact
            ${escapeHtml(process.env.pbEmail)}.
          </p>

          <p
            style="
              margin:0;
              color:#7b928b;
              font-size:12px;
              line-height:1.5;
            "
          >
            &copy; ${new Date().getFullYear()} Plumbum.
          </p>
        </div>

      </div>

    </div>

  </body>
</html>
`,
  };
};