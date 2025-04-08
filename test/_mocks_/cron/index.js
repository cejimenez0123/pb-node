const cron = require('node-cron');
const sendEventNewsletterEmail = require("../newsletter/sendEventNewsletterEmail")
const fetchEvents = require("../newsletter/fetchEvents")


jest.mock('./sendEmail');
jest.mock('./fetchPublicEvents');
jest.mock('../../html/eventNewsletterTemplate');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const weeklyJob = cron.schedule('0 9 * * 0', async () => {
  const days = 7;
  const users = await prisma.user.findMany({ where: { emailFrequency: { equals: days } } });
let i = 0
  for (const user of users) {
    const events = await fetchEvents(days);
    await sleep(1100);

    try {
      await sendEventNewsletterEmail(user, events, days);
      console.log(i,user.email);
    } catch (err) {
      console.error(err);
    }
  }
});

const threeDayJob = cron.schedule('0 10 */3 * *', async () => {
  console.log('Running 3-day email task');
  const days = 3;
  const users = await prisma.user.findMany({ where: { emailFrequency: { gt:0,
    lte: days } } });
  const events = await fetchEvents(days);

  for (const user of users) {
    try {
      await sendEventNewsletterEmail(user, events);
      console.log(user.email);
    } catch (err) {
      console.error('Failed 3-day email task:', err.message);
    }
  }
});

const monthlyJob = cron.schedule('0 10 * * 0', async () => {
    const days = 27
    const users = await prisma.user.findMany({ where: { emailFrequency: { gte: days } } });

  for (const user of users) {
    const events = await fetchEvents(days);
    await sleep(1100);
    try {
      await sendEventNewsletterEmail(user, events);
      console.log(user.email);
    } catch (err) {
      console.error(err);
    }
  }
});

module.exports = { weeklyJob, threeDayJob, monthlyJob};