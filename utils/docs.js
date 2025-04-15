let { calendar } = require("@googleapis/calendar");
async function fetchPublicEvents(calendarId) {
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(now.getDate() + 7);
  try {
    const res = await calendar({ version: "v3" }).events.list({
      calendarId: calendarId, // Public Calendar ID
      key: process.env.GOOGLE_API_KEY,
      timeMin: now.toISOString(),
      timeMax: sevenDaysLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = res.data.items;
    if (events.length) {
      return events
    } else {
      console.log("No upcoming events found.");
    }
  } catch (error) {
    console.error("Error fetching events:", error.response?.data || error.message);
  }
}
module.exports = fetchPublicEvents