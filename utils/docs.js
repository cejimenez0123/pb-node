let { calendar } = require("@googleapis/calendar");

// Initialize Calendar API with API key
calendar = calendar({ version: "v3" });

async function fetchPublicEvents() {
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(now.getDate() + 7);

  try {
    const res = await calendar.events.list({
      calendarId: process.env.DOWNTOWN_CAL_ID, // Public Calendar ID
      key: process.env.GOOGLE_API_KEY,
      timeMin: now.toISOString(),
      timeMax: sevenDaysLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = res.data.items;
    if (events.length) {
      console.log("Upcoming events:");
      events.forEach((event) => {
        console.log(`${event.summary} - ${event.start.dateTime || event.start.date}`);
      });
    } else {
      console.log("No upcoming events found.");
    }
  } catch (error) {
    console.error("Error fetching events:", error.response?.data || error.message);
  }
}

fetchPublicEvents();
