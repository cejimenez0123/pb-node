const cron = require('node-cron');
const sendEventNewsletterEmail = require('../newsletter/sendEventNewsletterEmail');
const fetchEvents = require('../newsletter/fetchEvents');
const { PrismaClient } = require('@prisma/client');

// jest.mock('node-cron');  // Mock node-cron to control cron jobs
// jest.mock('../newsletter/sendEventNewsletterEmail');
// jest.mock('../newsletter/fetchEvents');

// jest.mock('@prisma/client', () => {
//   return {
//     PrismaClient: jest.fn().mockImplementation(() => ({
//       user: {
//         findMany: jest.fn(),
//       },
//     })),
//   };
// });
// const prisma = new PrismaClient();
// jest.mock('../cron', () => ({
//     weeklyJob: jest.fn(),
//     threeDayJob: jest.fn(),
//     monthlyJob: jest.fn(),
//   }));

// // Mock implementation for fetchEvents and sendEventNewsletterEmail
// const mockEvents = [{ area: 'Downtown', events: [{ id: '1', summary: 'Mock Event 1' }] }];
// fetchEvents.mockResolvedValue(mockEvents);
// sendEventNewsletterEmail.mockResolvedValue('Email sent successfully');

// prisma.user.findMany.mockResolvedValue([{ id: 1, email: 'testuser@example.com', emailFrequency: 7 }]);

describe('Cron Job for Sending Event Newsletter Emails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should schedule weekly job using node-cron',async () => {
    // Mocking the scheduling of the weekly job
    // cron.schedule.mockImplementation((cronTime, callback) => {
    //           // Immediately invoke the callback function to simulate the cron job running
    //           callback();
    //         });
    const days = 7;
    // const{ weeklyJob} = require('../cron')
    cron.schedule = jest.fn((cronTime, callback) => {
        callback(); // Manually trigger the callback
      });
      
 let weeklyJob = cron.schedule.mockImplementation((cronTime,callback) => {
      ()=>{prisma.user.findMany({ where: { emailFrequency: { equals: days } } }).then(users => {
        let i = 0;
        for (const user of users) {
          fetchEvents(days).then(events => {
            sendEventNewsletterEmail(user, events, days).then(res => {
              i += 1;
              console.log(i, user.email);
            }).catch(err => {
              console.log(err);
            });
          });
        }    callback()

    })

   weeklyJob()
   console.log(weeklyJob.mock)
    const weeklyJobFunction = weeklyJob.mock.calls[0][1];
    weeklyJobFunction();


expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { emailFrequency: { equals: days } } });
expect(fetchEvents).toHaveBeenCalledWith(days);
expect(sendEventNewsletterEmail).toHaveBeenCalledWith(
  expect.objectContaining({ email: 'testuser@example.com' }),
  mockEvents,
  days
);}})})
}
)