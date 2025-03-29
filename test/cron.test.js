const sendEventNewsletterEmail = require('../newsletter/sendEventNewsletterEmail'); // Function to send the email
const fetchPublicEvents = require('../newsletter/fetchPublicEvents'); // Function to fetch events from the calendar
const eventNewsletterTemplate = require('../html/eventNewsletterTemplate'); // Template to generate the email
const sendEmail = require('../newsletter/sendEmail'); // Function to send the actual email

// Mock the modules
jest.mock('../newsletter/sendEmail');
jest.mock('../newsletter/fetchPublicEvents');
jest.mock('../html/eventNewsletterTemplate');

describe('Cron Job for Sending Event Newsletter Emails', () => {
  // Set up the mock user for testing
  const user = { id: '123', email: 'testuser@example.com' };

  beforeEach(() => {
    // Clear any previous mock calls before each test
    jest.clearAllMocks();
  });
  it('should send an email with event details when events are fetched', async () => {

    // Mock the user data to include email and id (user is expected to have id and email)

    // Mock the events data that will be passed into the newsletter template
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
    fetchPublicEvents.mockResolvedValueOnce(mockEvents);

    // Mock the event newsletter template
    eventNewsletterTemplate.mockReturnValue({
        from: process.env.pbEmail,
        to: user.email,
        subject: 'Plumbum Writers Community - Upcoming Events🎉',
        html: '<html><body><h1>Test Email</h1></body></html>', // Simplified HTML for testing
    });

    // Mock sendEmail to simulate successful sending of the email
    sendEmail.mockResolvedValue({ messageId: 'mock-message-id' });

    // Call the function that simulates the cron job
    const result = await sendEventNewsletterEmail(user);

    // Assert that fetchPublicEvents was called
    expect(fetchPublicEvents).toHaveBeenCalledTimes(4);
   let template = eventNewsletterTemplate({events:mockEvents,user})
    // Assert that the eventNewsletterTemplate was called with the correct structure
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

    // Assert that the sendEmail function was called with the correct arguments
    expect(sendEmail).toHaveBeenCalledWith(template);
    expect(result).toBe(200)
});
    // Assert that the cron job completed successfully
 

//   it('should send an email with event details when events are fetched', async () => {
//     // Mock the response for fetching events
//     const mockEvents = [
//       { id: '1', summary: 'Mock Event 1', start: { dateTime: '2025-03-28T10:00:00Z' }, htmlLink: 'http://example.com/event1' },
//       { id: '2', summary: 'Mock Event 2', start: { dateTime: '2025-03-29T12:00:00Z' }, htmlLink: 'http://example.com/event2' },
//     ];

//     // Mock fetchPublicEvents to return events for specific areas
//     fetchPublicEvents.mockResolvedValueOnce(mockEvents); // Downtown
//     fetchPublicEvents.mockResolvedValueOnce(mockEvents); // Uptown
//     fetchPublicEvents.mockResolvedValueOnce([]); // Queens (no events)
//     fetchPublicEvents.mockResolvedValueOnce([]); // Virtual (no events)

//     // Mock the event newsletter template
//     eventNewsletterTemplate.mockReturnValue({
//       from: process.env.pbEmail,
//       to: user.email,
//       subject: 'Plumbum Writers Community - Upcoming Events🎉',
//       html: '<html><body><h1>Test Email</h1></body></html>', // Simplified HTML for testing
//     });

//     // Mock sendEmail to simulate successful sending of the email
//     sendEmail.mockResolvedValue({ messageId: 'mock-message-id' });

//     // Call the function that simulates the cron job
//     const result = await sendEventNewsletterEmail(user);

//     // Assert that fetchPublicEvents was called the correct number of times
//     expect(fetchPublicEvents).toHaveBeenCalledTimes(4); // 4 times for the different areas

//     // Assert that the email template was generated correctly
//     expect(eventNewsletterTemplate).toHaveBeenCalledWith(
//       expect.objectContaining({
//         events: expect.arrayContaining([expect.objectContaining({ area: 'Downtown' })]),
//         user: expect.any(Object),
//       })
//     );

//     // Assert that the sendEmail function was called with the correct arguments
//     expect(sendEmail).toHaveBeenCalledWith({
//       from: process.env.pbEmail,
//       to: user.email,
//       subject: 'Plumbum Writers Community - Upcoming Events🎉',
//       html: '<html><body><h1>Test Email</h1></body></html>',
//     });

//     // Assert that the cron job completed successfully
//     expect(result).toBe(200);
//   });

  it('should return error when no user is provided', async () => {
    // Test case for missing user

    const result = await sendEventNewsletterEmail(null);

    expect(result).toBe('No User Found');
  });

  it('should return error when fetching events fails', async () => {
    // Simulate an error in fetching events
    fetchPublicEvents.mockRejectedValue(new Error('Failed to fetch events'));

    const result = await sendEventNewsletterEmail(user);

    expect(result).toBe('Failed to fetch events');
  });

  it('should handle no events scenario', async () => {
    // Simulate no events for all areas
    fetchPublicEvents.mockResolvedValueOnce([]); // Downtown
    fetchPublicEvents.mockResolvedValueOnce([]); // Uptown
    fetchPublicEvents.mockResolvedValueOnce([]); // Queens
    fetchPublicEvents.mockResolvedValueOnce([]); // Virtual

    // Mock the event newsletter template
    eventNewsletterTemplate.mockReturnValue({
      from: process.env.pbEmail,
      to: user.email,
      subject: 'Plumbum Writers Community - Upcoming Events🎉',
      html: '<html><body><h1>No Events</h1></body></html>', // Simplified HTML for testing
    });

    // Call the function that simulates the cron job
    const result = await sendEventNewsletterEmail(user);

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

//  describe('Cron Job Tests', () => {
//     let prisma;
//     let sendMailMock;
  
//     beforeAll(() => {
//         prisma = new PrismaClient();
//         sendMailMock = jest.fn().mockResolvedValue('Email sent');
    
//         nodemailer.createTransport.mockReturnValue({
//           sendMail: sendMailMock,
//         });
//     });
  
//     beforeEach(() => {
//       jest.clearAllMocks();
//     });
  

//     it('should fetch events, get users, and send emails', async () => {
//         // Act
//         expect(calendar({ version: 'v3' })).toHaveBeenCalledWith({ version: 'v3' });
//         expect(calendar().events.list).toHaveBeenCalledTimes(1);
//         const calendarId = 'test-calendar-id';
//         const events = await fetchPublicEvents(calendarId);
//         const users = await prisma.user.findMany();
    
//         // Send emails
//         for (const user of users) {
//             let template = eventTemplate({events,user})
//             template.from =  'test@example.com'
//            sendMailMock()
//           await sendMailMock(template);
//         }
    
//         // Assert
//         expect(calendar).toHaveBeenCalledWith({ version: 'v3' });
//         expect(calendar().events.list).toHaveBeenCalledWith(expect.objectContaining({ calendarId }));
//         expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
//         expect(sendMailMock).toHaveBeenCalledTimes(users.length);
    
//         users.forEach((user, index) => {
//           expect(sendMailMock).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({
//             to: user.email,
//             subject: 'Upcoming Events',
//             html: expect.stringContaining(mockEvents[0].summary),
//           }));
//         });
//       });
  
//     it('should fetch users and send emails for the weekly job', async () => {
//       const mockUsers = [
//         { id: 3, email: 'weekly1@example.com' },
//         { id: 4, email: 'weekly2@example.com' }
//       ];
//       prisma.user.findMany.mockResolvedValue(mockUsers);
  
//       await sendEventNewsletterEmail(mockUsers)
  
//       expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
//       expect(sendMailMock).toHaveBeenCalledTimes(2);
//       expect(sendMailMock).toHaveBeenCalledWith(
//         expect.objectContaining({ to: 'weekly1@example.com' })
//       );
//       expect(sendMailMock).toHaveBeenCalledWith(
//         expect.objectContaining({ to: 'weekly2@example.com' })
//       );
//     });
  
//     it('should handle no users found gracefully', async () => {
//       prisma.user.findMany.mockResolvedValue([]); // No users found
  
//       await expect(sendEventNewsletterEmail()).rejects.toThrow('No user found');
  
//       expect(sendMailMock).not.toHaveBeenCalled();
//     });
  
//     it('should trigger cron jobs and call email functions', async () => {
//       jest.spyOn(sendThreeDayEmails, 'default').mockResolvedValue();
//       jest.spyOn(sendWeeklyEmail, 'default').mockResolvedValue();
//     const mockUsers = [
//         { id: 3, email: 'weekly1@example.com' },
//         { id: 4, email: 'weekly2@example.com' }
//       ];
//       await threeDayJob(_,{users:mockUsers}).task();
//       await weeklyJob(_,{users:mockUsers}).task();
  
//     //   expect(sendThreeDayEmails.default).toHaveBeenCalled();
//     //   expect(sendWeeklyEmail.default).toHaveBeenCalled();
//     });
  
//     // afterAll(async () => {
//     //   await prisma.$disconnect();
//     // });
//   });


