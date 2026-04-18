

// module.exports = function applyTemplate(user,body,newsletter=false){
//     const {
//         email,
//         igHandle,
//         fullName,
//         whyApply,
//         howFindOut,
//         communityNeeds,
//         workshopPreference,
//         feedbackFrequency,
//         comfortLevel,
//         platformFeatures,
//         genres
//     }=body
// const params = new URLSearchParams({
//     applicantId:user.id,
//     action:"approve",
//     email,
//     newsletter
//   });

//   let parms = `/auth/review?`+params.toString()
//   let path = process.env.BASEPATH+parms
//     return {
//         from: `Plumbum <${process.env.pbEmail}>`,
//         to: process.env.PBEMAIL, // Email to yourself
//         subject: 'New Plumbum Application',
//           html: `
//             <!DOCTYPE html>
//             <html lang="en">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//             <head>
//               <meta charset="UTF-8">
//               <meta name="viewport" content="width=device-width, initial-scale=1.0">
//               <title>Application Review</title>
//               <style>
//                 body {
//                   font-family: Arial, sans-serif;
//                   background-color: #f9f9f9;
//                   color: #333;
//                   padding: 20px;
//                 }
//                 .container {
//                   background: #fff;
//                   padding: 20px;
//                   border-radius: 8px;
//                   box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//                 }
//                 .header {
//                   font-size: 1.5em;
//                   margin-bottom: 20px;
//                 }
//                 .info {
//                   margin-bottom: 20px;
//                 }
//                 .info p {
//                   margin: 5px 0;
//                 }
//                 .form {
//                   margin-top: 20px;
//                 }
//                 button {
//                   background: #4CAF50;
//                   color: white;
//                   border: none;
//                   padding: 10px 20px;
//                   font-size: 1em;
//                   border-radius: 5px;
//                   cursor: pointer;
//                   transition: background 0.3s;
//                 }
//                 button:hover {
//                   background: #45a049;
//                 }
//               </style>
//             </head>
//             <body>
//               <div class="container">
//                 <div class="header">Review Plumbum Applicant</div>
//                 <div class="info">
//                 <p><strong>Name:</strong> ${fullName}</p>
//                 <p><strong>Email:</strong> ${email}</p>
//                 <p><strong>Instagram Handle:</strong> ${igHandle}</p>
//                 <p><strong>Why did they apply:</strong> ${whyApply}</p>
                
//                 <p><strong>How did they find out:</strong> ${howFindOut}</p>
//                 <p><strong>Community Need:</strong> ${communityNeeds}</p>
//                 <p><strong>Comfort Level:</strong> ${comfortLevel}</p>
//                 <p><strong>platform features:</strong> ${platformFeatures}</p>
//                 <p><strong>Workshop Preference:</strong>${workshopPreference}</p>
//                 <p><strong>Feedback Frequency:</strong>${feedbackFrequency}</p>
//                 <p><strong>Genres:</strong></p>
//                 <ul>
//                 ${genres&&genres.length?genres.map(genre=>{
//                 return(`<li><p>${genre}</p></li>`)}):null}
//                 </ul>
//                 </div>
//                 <div class="form">
//                 <a href="${path}" 
//                 style="display: inline-block; background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
//                 Approve Application
//               </a>
//                 </div>
//               </div>
//             </body>
//             </html>
//           `
//       };}
// module.exports = function applyTemplate(user, body, newsletter = false) {
//   const {
//     email,
//     igHandle,
//     fullName,
//     whyApply,
//     howFindOut,
//     communityNeeds,
//     writingOutcome,
//     events,
//     selectedEvents,
//     otherEvent,
//     eventPain,
//   } = body;

//   const finalEvents =
//     events?.length
//       ? events
//       : selectedEvents?.length
//         ? selectedEvents
//         : [];

//   const params = new URLSearchParams({
//     applicantId: user.id,
//     action: "approve",
//     email,
//     newsletter,
//   });

//   const path =
//     process.env.BASEPATH +
//     "auth/review?" +
//     params.toString();

//   return {
//     from: `Plumbum <${process.env.pbEmail}>`,
//     to: process.env.PBEMAIL,
//     subject: "New Plumbum Application",

//     html: `
// <!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8" />
// <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
// <title>Application Review</title>

// <style>
//   body {
//     font-family: Arial, sans-serif;
//     background-color: #f4f4f4;
//     color: #222;
//     padding: 24px;
//   }

//   .container {
//     max-width: 680px;
//     margin: auto;
//     background: #ffffff;
//     padding: 24px;
//     border-radius: 12px;
//     box-shadow: 0 6px 18px rgba(0,0,0,0.08);
//   }

//   .header {
//     font-size: 20px;
//     font-weight: bold;
//     margin-bottom: 20px;
//     color: #1f2937;
//   }

//   .section {
//     margin-bottom: 18px;
//     padding-bottom: 12px;
//     border-bottom: 1px solid #eee;
//   }

//   .label {
//     font-weight: bold;
//     color: #374151;
//     margin-bottom: 6px;
//   }

//   .value {
//     color: #111827;
//     white-space: pre-wrap;
//   }

//   ul {
//     margin: 6px 0 0 18px;
//   }

//   .button {
//     display: inline-block;
//     background: #4CAF50;
//     color: white;
//     padding: 10px 16px;
//     text-decoration: none;
//     border-radius: 8px;
//     margin-top: 16px;
//   }

//   .button:hover {
//     background: #45a049;
//   }

//   .muted {
//     color: #6b7280;
//     font-size: 12px;
//   }
// </style>
// </head>

// <body>
//   <div class="container">

//     <div class="header">New Plumbum Application</div>

//     <!-- IDENTITY -->
//     <div class="section">
//       <div class="label">Identity</div>
//       <div class="value">
//         Name: ${fullName || "N/A"}<br/>
//         Email: ${email || "N/A"}<br/>
//         Instagram: ${igHandle || "N/A"}
//       </div>
//     </div>

//     <!-- WHY APPLY -->
//     <div class="section">
//       <div class="label">Why they applied</div>
//       <div class="value">${whyApply || "N/A"}</div>
//     </div>

//     <!-- COMMUNITY NEEDS -->
//     <div class="section">
//       <div class="label">What they’re looking for in community</div>
//       <div class="value">${communityNeeds || "N/A"}</div>
//     </div>

//     <!-- WRITING OUTCOME -->
//     <div class="section">
//       <div class="label">What they hope to change in their writing life</div>
//       <div class="value">${writingOutcome || "N/A"}</div>
//     </div>

//     <!-- EVENTS -->
//     <div class="section">
//       <div class="label">Events they engage with</div>
//       <div class="value">
//         ${
//           finalEvents.length
//             ? `<ul>${finalEvents.map(e => `<li>${e}</li>`).join("")}</ul>`
//             : "N/A"
//         }
//       </div>
//     </div>

//     <!-- EVENT PAIN -->
//     <div class="section">
//       <div class="label">What makes them stay or leave events</div>
//       <div class="value">${eventPain || "N/A"}</div>
//     </div>

//     <!-- DISCOVERY -->
//     <div class="section">
//       <div class="label">How they found Plumbum</div>
//       <div class="value">${howFindOut || "N/A"}</div>
//     </div>

//     <a class="button" href="${path}">
//       Approve Application
//     </a>

//     <div class="muted" style="margin-top:12px;">
//       Plumbum Application Review System
//     </div>

//   </div>
// </body>
// </html>
//     `,
//   };
// };
module.exports = function applyTemplate(user, body, newsletter = false) {
  const {
    email,
    igHandle,
    fullName,
    whyApply,
    howFindOut,
    communityNeeds,
    writingOutcome,
    events,
    selectedEvents,
    otherEvent,
    eventPain,
  } = body;

  // normalize events (IMPORTANT FIX)
  const baseEvents = Array.isArray(events) ? events : [];
  const selected = Array.isArray(selectedEvents) ? selectedEvents : [];

  const finalEvents = [
    ...new Set([
      ...baseEvents,
      ...selected,
      ...(otherEvent ? [otherEvent] : []),
    ]),
  ];

  const params = new URLSearchParams({
    applicantId: user.id,
    action: "approve",
    email,
    newsletter,
  });

  const path =
    process.env.BASEPATH +
    "auth/review?" +
    params.toString();

  return {
    from: `Plumbum <${process.env.pbEmail}>`,
    to: process.env.PBEMAIL,
    subject: "New Plumbum Application",

    html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Application Review</title>

<style>
  body {
    font-family: Arial, sans-serif;
    background-color: #f4f4f4;
    color: #222;
    padding: 24px;
  }

  .container {
    max-width: 680px;
    margin: auto;
    background: #ffffff;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.08);
  }

  .header {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 20px;
    color: #1f2937;
  }

  .section {
    margin-bottom: 18px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
  }

  .label {
    font-weight: bold;
    color: #374151;
    margin-bottom: 6px;
  }

  .value {
    color: #111827;
    white-space: pre-wrap;
  }

  ul {
    margin: 6px 0 0 18px;
  }

  .button {
    display: inline-block;
    background: #4CAF50;
    color: white;
    padding: 10px 16px;
    text-decoration: none;
    border-radius: 8px;
    margin-top: 16px;
  }

  .button:hover {
    background: #45a049;
  }

  .muted {
    color: #6b7280;
    font-size: 12px;
  }
</style>
</head>

<body>
  <div class="container">

    <div class="header">New Plumbum Application</div>

    <div class="section">
      <div class="label">Identity</div>
      <div class="value">
        Name: ${fullName || "N/A"}<br/>
        Email: ${email || "N/A"}<br/>
        Instagram: ${igHandle || "N/A"}
      </div>
    </div>

    <div class="section">
      <div class="label">Why they applied</div>
      <div class="value">${whyApply || "N/A"}</div>
    </div>

    <div class="section">
      <div class="label">What they’re looking for in community</div>
      <div class="value">${communityNeeds || "N/A"}</div>
    </div>

    <div class="section">
      <div class="label">What they hope to change in their writing life</div>
      <div class="value">${writingOutcome || "N/A"}</div>
    </div>

    <div class="section">
      <div class="label">Events they engage with</div>
      <div class="value">
        ${
          finalEvents.length
            ? `<ul>${finalEvents.map(e => `<li>${e}</li>`).join("")}</ul>`
            : "N/A"
        }
      </div>
    </div>

    <div class="section">
      <div class="label">What makes them stay or leave events</div>
      <div class="value">${eventPain || "N/A"}</div>
    </div>

    <div class="section">
      <div class="label">How they found Plumbum</div>
      <div class="value">${howFindOut || "N/A"}</div>
    </div>

    <a class="button" href="${path}">
      Approve Application
    </a>

    <div class="muted" style="margin-top:12px;">
      Plumbum Application Review System
    </div>

  </div>
</body>
</html>
    `,
  };
};