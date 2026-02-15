module.exports = function feedbackTemplate({ name, email, subject, purpose, message }) {
  return {
     from: `Plumbum <feedback@plumbum.app>`, // your official feedback email
  replyTo: `${name} <${email}>`,  // the user submitting the feedback
  to: process.env.personalEmail, // your personal email to receive feedback
    subject: `${purpose}: ${subject}`,
    html: `
      <div style="
        font-family: 'Helvetica', Arial, sans-serif;
        background-color: #f7fdf7;
        padding: 40px;
        border-radius: 12px;
        max-width: 600px;
        margin: auto;
        color: #065f46;
      ">
        <h2 style="
          text-align: center;
          font-family: 'Lora', serif;
          font-size: 24px;
          margin-bottom: 20px;
          color: #047857;
        ">New Feedback Received</h2>

        <p style="
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 20px;
        ">
          ${message}
        </p>

        <p style="font-size: 14px; color: #065f46;">
          <strong>From:</strong> ${name} (${email})
        </p>

        <div style="
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #065f46;
        ">
          Plumbum &mdash; Your Writing, Your Community
        </div>
      </div>
    
    `,
  };
};
