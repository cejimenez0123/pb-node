const sendEmail = require('./sendEmail');
const fetchPublicEvents = require('../../../newsletter/fetchPublicEvents');
const eventNewsletterTemplate = require('../../../html/eventNewsletterTemplate');

jest.mock('./sendEmail');
jest.mock('./fetchPublicEvents');
jest.mock('../../html/eventNewsletterTemplate');

const sendEventNewsletterEmail = jest.fn(async (user) => {
  if (!user) {
    console.log('No User Found');
    return "No User Found";
  }

  try {
   
    fetchPublicEvents.mockResolvedValueOnce([
      { id: "1", summary: "Mock Event 1", start: { dateTime: "2025-03-28T10:00:00Z" } }
    ]); // Downtown
    fetchPublicEvents.mockResolvedValueOnce([
      { id: "2", summary: "Mock Event 2", start: { dateTime: "2025-03-29T12:00:00Z" } }
    ]); // Uptown
    fetchPublicEvents.mockResolvedValueOnce([]); // Queens (no events)
    fetchPublicEvents.mockResolvedValueOnce([]); // Virtual (no events)

    // Mock template generation
    eventNewsletterTemplate.mockReturnValue('<p>Mock Email Content</p>');

    // Mock sendEmail to simulate email sending
    sendEmail.mockResolvedValue({ messageId: 'mock-message-id' });

    const [downtownEvents, uptownEvents, queensEvents, virtualEvents] = await Promise.all([
      fetchPublicEvents("qu"),
      fetchPublicEvents("up"),
      fetchPublicEvents("vir"),
      fetchPublicEvents("down")
    ]);

    const events = [
      { area: "Downtown", events: downtownEvents },
      { area: "Uptown", events: uptownEvents },
      { area: "Queens", events: queensEvents },
      { area: "Virtual", events: virtualEvents }
    ];

    // Generate the email template
    const template = eventNewsletterTemplate({ events, email: user.email });

    // Send the email
    await sendEmail(template);

    console.log("Mock email sent successfully");
    return 200;
  } catch (error) {
    console.error("Error sending email:", error);
    return error.message;
  }
});

module.exports = sendEventNewsletterEmail;
