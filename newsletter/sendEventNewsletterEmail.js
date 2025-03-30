const sendEmail = require("./sendEmail");
const eventNewsletterTemplate = require("../html/eventNewsletterTemplate");

module.exports = async function sendEventNewsletterEmail(user,events,days) {
  if (!user) {
    return "No User Found";
  }
  if(!events){
    return "Failed to fetch events"
  }

  try {
    const template = eventNewsletterTemplate({ events, email: user.email,days});
    await sendEmail(template);
    return 200;
  } catch (error) {
    console.log("Error sending email:", error.message);
    return error.message;
  }
};
