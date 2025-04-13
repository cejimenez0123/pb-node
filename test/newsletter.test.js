const sendEventNewsletterEmail = require('../newsletter/sendEventNewsletterEmail'); // Function to send the email
const fetchPublicEvents = require('../newsletter/fetchEvents'); // Function to fetch events from the calendar
const eventNewsletterTemplate = require('../html/eventNewsletterTemplate'); // Template to generate the email
const sendEmail = require('../newsletter/sendEmail'); 
const fetchEvents = require('../newsletter/fetchEvents');
const mockEvents = require('./_mocks_/mockEvents');
jest.mock('../newsletter/sendEmail');
jest.mock('../newsletter/fetchEvents');
jest.mock('../html/eventNewsletterTemplate');

describe('Cron Job for Sending Event Newsletter Emails', () => {
  // Set up the mock user for testing
  const user = { id: '123', email: 'testuser@example.com' };

  beforeEach(() => {
    // Clear any previous mock calls before each test
    jest.clearAllMocks();
  });
  it('should send an email with event details when events are fetched', async () => {
  const mockEvents = [
        {
            area: 'Downtown',
            events: [
                { id: '1', summary: 'Mock Event 1', start: { dateTime: '2025-03-28T10:00:00Z' }, end: { dateTime: '2025-03-28T12:00:00Z' }, htmlLink: 'http://example.com/event1', organizer: { displayName: 'Downtown' } },
                { id: '2', summary: 'Mock Event 2', start: { dateTime: '2025-03-29T12:00:00Z' }, end: { dateTime: '2025-03-29T14:00:00Z' }, htmlLink: 'http://example.com/event2', organizer: { displayName: 'Downtown' } },
            ],
        },
        {
            area: 'Uptown',
            events: [
                { id: '1', summary: 'Mock Event 1', start: { dateTime: '2025-03-28T10:00:00Z' }, end: { dateTime: '2025-03-28T12:00:00Z' }, htmlLink: 'http://example.com/event1', organizer: { displayName: 'Uptown' } },
                { id: '2', summary: 'Mock Event 2', start: { dateTime: '2025-03-29T12:00:00Z' }, end: { dateTime: '2025-03-29T14:00:00Z' }, htmlLink: 'http://example.com/event2', organizer: { displayName: 'Uptown' } },
            ],
        },
        { area: 'Queens', events: [] },
        { area: 'Virtual', events: [] },
    ];

    // Mock the fetchPublicEvents function to return the mock events
    fetchEvents.mockResolvedValueOnce(mockEvents);
    let template = eventNewsletterTemplate(mockEvents,user)
  
  
    sendEmail.mockResolvedValue({ messageId: 'mock-message-id' });

    // Call the function that simulates the cron job
    const result = await sendEventNewsletterEmail(user,mockEvents);

    expect(eventNewsletterTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
            user: expect.objectContaining({
                email: user.email,
            }),
            events: expect.arrayContaining([
                expect.objectContaining({
                    area: 'Downtown',
                    events: expect.arrayContaining([
                        expect.objectContaining({
                            summary: 'Mock Event 1',
                        }),
                    ]),
                }),
            ]),
        })
    );

    // expect(sendEmail).toHaveBeenCalledWith(template);
    expect(result).toBe(200)
});
 
  it('should return error when no user is provided', async () => {
    // Test case for missing user

    const result = await sendEventNewsletterEmail(null,mockEvents);

    expect(result).toBe('No User Found');
  });

  it('should return error when fetching events fails', async () => {
    // Simulate an error in fetching events
    const user = { id: '123', email: 'testuser@example.com' };
    fetchPublicEvents.mockRejectedValue(new Error('Failed to fetch events'));

    const result = await sendEventNewsletterEmail(user,null);

    expect(result).toBe('Failed to fetch events');
  });

  it('should handle no events scenario', async () => {
    // Simulate no events for all areas
    fetchEvents.mockResolvedValueOnce([])


    // Mock the event newsletter template
    eventNewsletterTemplate.mockReturnValue({
      from: process.env.pbEmail,
      to: user.email,
      subject: 'Plumbum Writers Community - Upcoming Events🎉',
      html: '<html><body><h1>No Events</h1></body></html>', // Simplified HTML for testing
    });
    const result = await sendEventNewsletterEmail(user,[]);

    // Assert that sendEmail was called even with no events
    expect(sendEmail).toHaveBeenCalledWith({
      from: process.env.pbEmail,
      to: user.email,
      subject: 'Plumbum Writers Community - Upcoming Events🎉',
      html: '<html><body><h1>No Events</h1></body></html>',
    });

    // Assert the cron job completed successfully even with no events
    expect(result).toBe(200);
  });
});

