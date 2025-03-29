let { calendar } = require("@googleapis/calendar");

async function fetchPublicEvents(calendarId) {
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);
  
    try {
      const res = await calendar.events.list({
        calendarId,
        key: process.env.GOOGLE_API_KEY,
        timeMin: now.toISOString(),
        timeMax: sevenDaysLater.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
  
      const events = res?.data?.items || [];
  
      if (events.length) {
        return events;
      } else {
        console.log("No upcoming events found.");
        return [];
      }
    } catch (error) {
      console.error("Error fetching events:", error.response?.data || error.message);
      return [];
    }
  }
  

module.exports = fetchPublicEvents