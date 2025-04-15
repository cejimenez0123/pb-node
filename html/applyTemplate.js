

module.exports = function applyTemplate(user,body){
    const {
        email,
        igHandle,
        fullName,
        whyApply,
        howFindOut,
        communityNeeds,
        workshopPreference,
        feedbackFrequency,
        comfortLevel,
        platformFeatures,
        genres
    }=body
const params = new URLSearchParams({
    applicantId:user.id,
    action:"approve",
    email,
  });
  let parms = `/auth/review?`+params.toString()
  let path = process.env.BASEPATH+parms
    return {
        from: `Plumbum <${process.env.pbEmail}>`,
        to: process.env.PBEMAIL, // Email to yourself
        subject: 'New Plumbum Application',
          html: `
            <!DOCTYPE html>
            <html lang="en">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Application Review</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  background-color: #f9f9f9;
                  color: #333;
                  padding: 20px;
                }
                .container {
                  background: #fff;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .header {
                  font-size: 1.5em;
                  margin-bottom: 20px;
                }
                .info {
                  margin-bottom: 20px;
                }
                .info p {
                  margin: 5px 0;
                }
                .form {
                  margin-top: 20px;
                }
                button {
                  background: #4CAF50;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  font-size: 1em;
                  border-radius: 5px;
                  cursor: pointer;
                  transition: background 0.3s;
                }
                button:hover {
                  background: #45a049;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">Review Plumbum Applicant</div>
                <div class="info">
                <p><strong>Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Instagram Handle:</strong> ${igHandle}</p>
                <p><strong>Why did they apply:</strong> ${whyApply}</p>
                
                <p><strong>How did they find out:</strong> ${howFindOut}</p>
                <p><strong>Community Need:</strong> ${communityNeeds}</p>
                <p><strong>Comfort Level:</strong> ${comfortLevel}</p>
                <p><strong>platform features:</strong> ${platformFeatures}</p>
                <p><strong>Workshop Preference:</strong>${workshopPreference}</p>
                <p><strong>Feedback Frequency:</strong>${feedbackFrequency}</p>
                <p><strong>Genres:</strong></p>
                <ul>
                ${genres.map(genre=>{
                return(`<li><p>${genre}</p></li>`)})}
                </ul>
                </div>
                <div class="form">
                <a href="${path}" 
                style="display: inline-block; background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Approve Application
              </a>
                </div>
              </div>
            </body>
            </html>
          `
      };}