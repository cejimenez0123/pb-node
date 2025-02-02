module.exports = function newsletterTemplate({email,sTcs,comments,collections,followers}){
    console.log("ppop",{email,sTcs,comments,collections,followers})
 
        return {
            from: process.env.pbEmail, // Sender address
            to: email, // Recipient's email
            subject: `Plumbum Newsletter Update`,
            html: `<!DOCTYPE html>
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
            .comment, .follower, .story {
                padding: 10px;
                margin: 5px 0;
                background: white;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="header">Plumbum Weekly Digest</h1>
            
            <!-- New Comments Section -->
            <div class="section">
                <div class="title">New Comments on Your Work</div>
                ${comments.length === 0 
                    ? "<p>No new comments this time, but keep sharing your work!</p>" 
                    : comments.map(com => 
                        `<div class="comment">
                            <p><strong>${com.profile.username}:</strong> “${com.content}”</p>
                        </div>`).join("")
                }
                <p><a href="[Plumbum Website URL]" class="btn">View Your Comments</a></p>
            </div>
            
            <!-- New Followers Section -->
            <div class="section">
                <div class="title">New Followers</div>
                ${followers.length === 0 
                    ? "<p>No new followers yet, but your audience is growing!</p>" 
                    : followers.map(follower => 
                        `<div class="follower">
                            <p><strong>${follower.username}</strong> started following you.</p>
                        </div>`).join("")
                }
                <p><a href="[Followers URL]" class="btn">See Your Followers</a></p>
            </div>
            
            <!-- Collection Updates Section -->
            <div class="section">
                <div class="title">New Stories in Your Followed Collections</div>
                ${sTcs.length === 0 
                    ? "<p>No new stories in your collections, but stay tuned for more!</p>" 
                    : sTcs.map(sTc => 
                        `<div class="story">
                            <p><strong>${sTc.collection.title}:</strong> A new story titled "<em>${sTc.story.title}</em>" has been added.</p>
                        </div>`).join("")
                }
                <p><a href="[Collections URL]" class="btn">Explore Updates</a></p>
            </div>
    
            <!-- Footer -->
            <div class="footer">
                <p>Want to customize your email preferences? <a href="[Manage Settings URL]">Manage Your Settings</a></p>
                <p><a href="[Unsubscribe URL]">Unsubscribe</a></p>
            </div>
        </div>
    </body>
    </html>`
        };
    };
    
