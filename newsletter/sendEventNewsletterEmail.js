const sendEmail = require("./sendEmail");
const fetchPublicEvents = require("./fetchPublicEvents");
const eventNewsletterTemplate = require("../html/eventNewsletterTemplate");

module.exports = async function sendEventNewsletterEmail(user) {
  if (!user) {
    return "No User Found";
  }

  try {
    // Fetch events
    const [downtownEvents, uptownEvents, queensEvents, virtualEvents] = await Promise.all([
      fetchPublicEvents(process.env.DOWNTOWN_CAL_ID),
      fetchPublicEvents(process.env.UPTOWN_CAL_ID),
      fetchPublicEvents(process.env.QUEENS_CAL_ID),
      fetchPublicEvents(process.env.VIRTUAL_CAL_ID)
    ]);

    const events = [
      { area: "Downtown", events: downtownEvents },
      { area: "Uptown", events: uptownEvents },
      { area: "Queens", events: queensEvents },
      { area: "Virtual", events: virtualEvents }
    ];

    // Create template and send email
    const template = eventNewsletterTemplate({ events, email: user.email });
    await sendEmail(template);

    console.log("Email sent successfully");
    return 200;
  } catch (error) {
    console.log("Error sending email:", error.message);
    return error.message;
  }
};
