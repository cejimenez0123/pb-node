
const jwt = require("jsonwebtoken");
const escapeHtml = require("../utils/escapeHtml");



module.exports = function profileSetupTemplate(user) {
  const token = jwt.sign(
    {
      type: "approval",
      applicantId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  const signupLink = `${process.env.DOMAIN}/signup?token=${token}`;
  const name = escapeHtml(user.preferredName || "there");

  const text = `
Hi ${user.preferredName || "there"},

Your Plumbum application has already been approved!

The only thing left is to create your profile and finish setting up your account.

Complete your profile here:
${signupLink}

We look forward to having you in the community.

The Plumbum Team
`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #26352d; line-height: 1.6;">
      <h2>You're approved!</h2>

      <p>Hi ${name},</p>

      <p>
        Your Plumbum application has already been approved.
        The only thing left is to create your profile and finish
        setting up your account.
      </p>

      <p style="margin: 28px 0;">
        <a
          href="${signupLink}"
          style="
            display: inline-block;
            background-color: #40906f;
            color: #ffffff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
          "
        >
          Create your profile
        </a>
      </p>

      <p>
        We look forward to having you in the community.
      </p>

      <p>The Plumbum Team</p>
    </div>
  `;

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: user.email,
    subject: "Your Plumbum approval is ready — create your profile",
    text,
    html,
  };
};
