

const jwt = require('jsonwebtoken');

module.exports = function approvalTemplate(user){
    const token = jwt.sign({ applicantId:user.id }, process.env.JWT_SECRET);
    const signupLink = process.env.DOMAIN+`/signup?token=${token}`;
    return {
        from: `Plumbum <${process.env.pbEmail}>`, // Sender address
        to: user.email, // Recipient's email
        subject: 'Congratulations! Your Application Has Been Approved 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h1 style="color: #5A5A5A;">Welcome to Plumbum, ${user.preferrdName}!</h1>
            <p style="font-size: 16px; color: #5A5A5A;">
              We’re thrilled to let you know that your application has been approved. 
              You’re now part of a vibrant community of creators, thinkers, and writers.
            </p>
            <p style="font-size: 16px; color: #5A5A5A;">
              Click the button below to log in and start exploring:
            </p>
            <a href="${signupLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
            Complete Sign-Up
          </a>
            <p style="font-size: 14px; color: #5A5A5A; margin-top: 20px;">
              If you have any questions, feel free to reach out to us at plumbumapp@gmail.com
            </p>
            <footer style="font-size: 12px; color: #9E9E9E; margin-top: 20px;">
              &copy; ${new Date().getFullYear()} Plumbum. All rights reserved.
            </footer>
          </div>
        `,
      };
}