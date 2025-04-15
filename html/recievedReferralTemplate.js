module.exports = function receiveRefferalTemplate(email,name){

    return {
            from:  `Plumbum <${process.env.pbEmail}>`,
            to:email ,// Email to yourself
            subject: 'You’ve Been Invited to Join Plumbum!',
              html: `
                
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Plumbum Referral</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          background-color: #2E2E2E;
          color: #D4D4D4;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .container {
          text-align: center;
          background-color: #1D1D1D;
          border-radius: 10px;
          padding: 40px 30px;
          width: 80%;
          max-width: 600px;
          box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
        }
        h1 {
          font-size: 3em;
          color: #A9C5D3;
          margin-bottom: 20px;
          letter-spacing: 2px;
        }
        p {
          font-size: 1.2em;
          margin: 20px 0;
          color: #D4D4D4;
        }
        a {
          font-size: 1.4em;
          color: #B1A7D5;
          text-decoration: none;
          padding: 10px 20px;
          border: 2px solid #B1A7D5;
          border-radius: 5px;
          transition: background-color 0.3s, color 0.3s;
        }
        a:hover {
          background-color: #B1A7D5;
          color: #1D1D1D;
        }
        .footer {
          margin-top: 30px;
          font-size: 0.9em;
          color: #A9C5D3;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Plumbum</h1>
        <p>Hello ${name},</p>
        <p>You've been invited to join Plumbum, a place where creativity and community come together. We believe your voice can make a difference in this artistic space.</p>
        <p>To get started, simply click the link below and sign up:</p>

        <a href="${process.env.DOMAIN}/signup?token=${token}" target="_blank">Join Plumbum</a>
        <p class="footer">If you did not request this invitation, feel free to ignore this email.</p>
     
      </div>
    </body>
    </html>`}}