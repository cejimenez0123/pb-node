const mockEvents = require("../mockEvents")
  const calendar = jest.mock('@google/calendar', (args) => {
    if (args.version === "v3") {
        return {
            calendar:jest.fn(() => ({
                events: {
                  list: jest.fn().mockResolvedValue({ data: { items: mockEvents } }),
                },
              }))
       
          };
        }
        throw new Error("Invalid version");
  })

  

module.exports = {calendar}


 