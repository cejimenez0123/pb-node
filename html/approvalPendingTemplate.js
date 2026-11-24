
const approvalPendingTemplate = (user) => ({
 from: `Plumbum <${process.env.pbEmail}>`,
  to: user.email,
  subject: "Your Plumbum application is still under review",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #183306;">
      <h1 style="font-size: 26px; margin-bottom: 20px;">
        Thanks for your patience.
      </h1>

      <p style="font-size: 16px; line-height: 1.7;">
        Thanks for your interest in joining Plumbum.
      </p>

      <p style="font-size: 16px; line-height: 1.7;">
        Your application is still awaiting approval. We're reviewing requests and will reach out as soon as there's an update.
      </p>

      <p style="font-size: 16px; line-height: 1.7;">
        There's nothing else you need to do right now. We'll email you when you're ready to continue setting up your profile.
      </p>

      <p style="font-size: 16px; line-height: 1.7; margin-top: 32px;">
        Thanks for your patience,<br />
        The Plumbum team
      </p>
    </div>
  `,
});

module.exports  = approvalPendingTemplate