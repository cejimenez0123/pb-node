
const Paths = require("../utils/Paths")
module.exports = function notifcationTemplate(user,{profile,comments,roles,following,followers,collections,events}){
    return {
        from: `Plumbum <${process.env.pbEmail}>`,
         to:user.email,  // Recipient's email
         subject: `What's new @ Plumbum`,
         html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Account Updates</title>
    <style>
      body {
        font-family: 'Open Sans', sans-serif;
        background-color: #E6F2E6;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
      }
      h1 {
        font-family: 'Lora', serif;
        font-size: 28px;
        color: #2F4F2F;
        margin-bottom: 20px;
      }
      h2 {
        font-family: 'Montserrat', sans-serif;
        font-size: 22px;
        color: #3D6B47;
        margin-top: 30px;
      }
      p {
        font-size: 16px;
        color: #4A604A;
        line-height: 1.6;
      }
      a {
        color: #3D6B47;
        font-weight: 600;
        text-decoration: underline;
      }
      a.button {
        display: inline-block;
        margin-top: 15px;
        padding: 12px 20px;
        background-color: #3D6B47;
        color: #fff;
        text-decoration: none;
        font-family: 'Montserrat', sans-serif;
        font-weight: 600;
        border-radius: 5px;
      }
      .event {
        background-color: #F0F7F0;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 10px;
      }
      .footer {
        margin-top: 40px;
        font-size: 12px;
        color: #3D6B47;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Hello ${profile.username},</h1>
      <p>Here’s what’s new on your account:</p>

            ${comments.slice(0,2).map(comment=>{
                console.log(comment)
                return(
                `<div class="event">
                       <p><strong>${comment.profile.username}</strong> commented on your story 
                       <a href="https://plumbum.app/story/${comment.storyId}">${comment.story.title}</a>:</p>
                       <p>"${comment.content}"</p>
                         <p style="font-size: 12px; color: #777;">${comment.created}</p> 
                        </div>
                        `)}).join(" ")}
                     
    
  
           ${followers.slice(0,2).map(follower=>{
            return( `      <div class="event">
            <p><strong>${follower.follower.username}</strong> started following you.</p>
              <p style="font-size: 12px; color: #777;">${follower.created}</p>
             </div>
              `)
           })}
         
           ${collections.filter(collection=>collection.storyIdList.length>0).slice(0,2).map(collection=>{
            return( `<div class="event">
        <p> <a href="https://plumbum.app/collection/${collection.id}">${collection.title}</a> was updated.</p>
        <p>${collection.storyIdList[0].story.data}</p>
                 <p style="font-size: 12px; color: #777;">${collection.updated}</p>
                </div>`)
           }
        )
    }
        </>}

      <a href="https://plumbum.app" class="button">Go to your dashboard</a>

      <div class="footer">
        <p>You’re receiving this email because you signed up for updates from Plumbum.</p>
        <p><a href="https://plumbum.app/subscribe">Unsubscribe</a></p>
      </div>
    </div>
  </body>
</html>
`}
}


