module.exports = function resetPasswordBasicTemplate({token,user}){
    const token = jwt.sign({ id:user.id }, process.env.JWT_SECRET);
    const forgetPasswordLink = process.env.DOMAIN+`/reset-password?token=${token}`
    return {from: `Plumbum <${process.env.pbEmail}>`,// Sender address
    to: user.email, // Recipient's email
    subject: 'Reset Password',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h1 style="color: #5A5A5A;">Welcome to Plumbum!</h1>
        <p style="font-size: 16px; color: #5A5A5A;">
  We're sorry you forgot your password. You can reset with the link below.
        </p>
        <p style="font-size: 16px; color: #5A5A5A;">
          Click the button to reset password:
        </p>
        <a href="${forgetPasswordLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
Reset Pasword
      </a>
        <p style="font-size: 14px; color: #5A5A5A; margin-top: 20px;">
          If you have any questions, feel free to reach out to us at plumbumapp@gmail.com
        </p>
        <footer style="font-size: 12px; color: #9E9E9E; margin-top: 20px;">
          &copy; ${new Date().getFullYear()} Plumbum. All rights reserved.
        </footer>
      </div>
    `,
  };}