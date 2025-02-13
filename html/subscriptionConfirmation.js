



module.exports = function subscriptionConfirmationTemplate({token,email}){
let params = new URLSearchParams({token:token})
    return {
         from: process.env.pbEmail, // Sender address
         to: email, // Recipient's email
         subject: `Plumbum Newsletter Confirmation`,
         html:`<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { background: #ffffff; padding: 20px; border-radius: 5px; max-width: 600px; margin: auto; }
        .header { color: #2c7a7b; text-align: center; }
        .button { background: #2c7a7b; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <h2 class="header">Thank You for Subscribing!</h2>
        <p>You've successfully subscribed to the Plumbum newsletter. Stay tuned for updates and literary insights.</p>
        <p>If you wish to manage your subscription, click the button below.</p>
        <div style="text-align: center; margin: 20px 0;">
        <a href="${process.env.DOMAIN}/subscribe?${params.toString()}" classname="button">Manage Subscription</a>
      </div>

      <p style="color: #374151; font-size: 14px; text-align: center;">
        Need a break? No hard feelings.  
        <a href="${process.env.BASEPATH}/auth/unsubscribe?${params.toString()}" style="color: #065f46; text-decoration: underline;">Unsubscribe here</a>.
      </p>
      
    </div>
</body>
</html>`}}