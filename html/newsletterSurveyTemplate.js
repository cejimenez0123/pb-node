



module.exports = function newsletterSurveyTemplate({params}){
   let{ fullName,
    igHandle,
email,
    frequency,
    thirdPlace,
    eventInterests,
    newsletterContent,
    writingRole,
    otherInputs

}=params
    

    otherInputs[" writingRole"]
return {
    from: process.env.pbEmail, // Sender address
    to: process.env.pbEmail, // Recipient's email
    subject: `New Subscription`,
    html:
`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Subscriber Alert</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { background: #ffffff; padding: 20px; border-radius: 5px; max-width: 600px; margin: auto; }
        .header { color: #2c7a7b; text-align: center; }
        .details { background: #e2e8f0; padding: 10px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h2 class="header">New Newsletter Subscription</h2>
        <p>You have a new subscriber with the following details:</p>
        <div class="details">
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Instagram Handle:</strong> ${igHandle}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Preferred Frequency:</strong> ${frequency}</p>
        <p><strong>Third Place:</strong> ${thirdPlace}</p>
        <p><strong>Event Interests:</strong> ${[otherInputs["eventInterests"],...eventInterests].join(', ')}</p>
        <p><strong>Newsletter Content Preferences:</strong> ${[otherInputs["newsletterContent"],...newsletterContent].join(', ')}</p>
        <p><strong>Writing Role:</strong> ${[    otherInputs["writingRole"],...writingRole].join(', ')}</p>
      </div>
    </div>
</body>
</html>`}}
