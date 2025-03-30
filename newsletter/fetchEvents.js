let { calendar } = require("@googleapis/calendar");

async function fetchPublicEvents(calendarId,days=7) {
    const now = new Date();
    const daysLater = new Date();
    daysLater.setDate(now.getDate() + days);
  
    try {
      const res = await calendar({version:"v3"}).events.list({
        calendarId,
        key: process.env.GOOGLE_API_KEY,
        timeMin: now.toISOString(),
        timeMax: daysLater.toISOString(),
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
async function fetchEvents(days=7) {
    try {
  const [downtownEvents, uptownEvents, queensEvents, virtualEvents] = await Promise.all([
    fetchPublicEvents(process.env.DOWNTOWN_CAL_ID,days),
      fetchPublicEvents(process.env.UPTOWN_CAL_ID,days),
      fetchPublicEvents(process.env.QUEENS_CAL_ID,days),
      fetchPublicEvents(process.env.VIRTUAL_CAL_ID,days)
  ]);
  

  const events = [
    { area: "Downtown", events: downtownEvents },
    { area: "Uptown", events: uptownEvents },
    { area: "Queens", events: queensEvents },
    { area: "Virtual", events: virtualEvents }
  ];
return events
} catch (error) {
  
    console.error(  new Error('Failed to fetch events'), error.response?.data || error.message);
    return [];
  }
}

module.exports = fetchEvents