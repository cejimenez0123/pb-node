
const mockEvents = [
    { id: "1", summary: "Mock Event 1", start: { dateTime: "2025-03-28T10:00:00Z" } },
    { id: "2", summary: "Mock Event 2", start: { dateTime: "2025-03-29T12:00:00Z" } }
  ];
  
  const fetchPublicEvents = jest.fn(async (calendarId) => {
    if (!calendarId) {
      throw new Error("Missing calendar ID");
    }
    return mockEvents;
  });
  
module.exports = fetchPublicEvents;
  