module.exports = function newsletterTemplate({email,comments,collections,followers}){
    console.log("ppop",{email,comments,collections,followers})
    return {
         from: process.env.pbEmail, // Sender address
         to: email, // Recipient's email
         subject: `Plumbum Newsletter Update`,
         html:`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Plumbum Newsletter</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Montserrat:wght@400;700&family=Open+Sans:wght@400;700&display=swap');
        body {
            font-family: 'Open Sans', sans-serif;
            background-color: #f8f8f8;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
        }
        .header {
            text-align: center;
            font-family: 'Lora', serif;
            color: #065f46;
        }
        .section {
            margin: 20px 0;
            padding: 15px;
            border-left: 4px solid #065f46;
            background: #f1f8f5;
            border-radius: 5px;
        }
        .title {
            font-family: 'Montserrat', sans-serif;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: 20px;
        }
        .btn {
            display: inline-block;
            background: #065f46;
            color: white;
            text-decoration: none;
            padding: 10px 15px;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="header">Plumbum Weekly Digest</h1>
        
        <div class="section">
            <div class="title">New Comments on Your Work</div>
            <p>Someone just left feedback on your piece! Dive in and see what they had to say.</p>
            <a href="#" class="btn">View Comments</a>
        </div>
        
        <div class="section">
            <div class="title">New Followers</div>
            <p>You've gained new readers since your last update! Check out who's following your work.</p>
            <a href="#" class="btn">See New Followers</a>
        </div>
        
        <div class="section">
            <div class="title">Collection Updates</div>
            <p>Here’s what’s new in the collections you follow.</p>
            <a href="#" class="btn">Explore Updates</a>
        </div>
        
        <div class="footer">
            <p>Want to customize your email preferences? <a href="#">Manage Your Settings</a></p>
            <p><a href="#">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>`}}
