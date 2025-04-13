const sendEmail = require('./sendEmail');
const fetchEvents= require('../../../newsletter/fetchEvents');
const eventNewsletterTemplate = require('../../../html/eventNewsletterTemplate');

jest.mock('./sendEmail');
jest.mock('./fetchPublicEvents');
jest.mock('../../html/eventNewsletterTemplate');

const sendEventNewsletterEmail = jest.fn(async (user,events) => {
  if (!user) {
    console.log('No User Found');
    return "No User Found";
  }
  if(!events){
      return "Failed to fetch events"
    }
  try {
   
    fetchEvents.mockResolvedValueOnce([[
      { id: "2", summary: "Mock Event 2", start: { dateTime: "2025-03-29T12:00:00Z" } }],[
      { id: "1", summary: "Mock Event 1", start: { dateTime: "2025-03-28T10:00:00Z" } }],
      [],[]

    ]); 
    
    eventNewsletterTemplate.mockReturnValue('<p>Mock Email Content</p>');

    // Mock sendEmail to simulate email sending
    sendEmail.mockResolvedValue({ messageId: 'mock-message-id' });
    const events = await fetchEvents()

    // Generate the email template
    const template = eventNewsletterTemplate(events,user,7);

    // Send the email
    await sendEmail(template);

    return 200;
  } catch (error) {
    console.error("Error sending email:", error);
    return error.message;
  }
});

module.exports = sendEventNewsletterEmail;
