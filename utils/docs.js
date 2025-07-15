// let { calendar } = require("@googleapis/calendar");
// const {docs} = require('@googleapis/docs');
// const oAuth2Client = require("../google")
// const {authenticate} = require('@google-cloud/local-auth');
// const {google} = require('@googleapis');
// google.drive("v2")
// const CREDENTIALS_PATH = '../credentials.json';
// const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// async function saveCredentials(client) {
//   const content = await fs.readFile(CREDENTIALS_PATH);
//   const keys = JSON.parse(content);
//   const key = keys.installed || keys.web;
//   const payload = JSON.stringify({
//     type: 'authorized_user',
//     client_id: key.client_id,
//     client_secret: key.client_secret,
//     refresh_token: client.credentials.refresh_token,
//   });
//   await fs.writeFile(TOKEN_PATH, payload);
// }
// async function authorize() {
//   let client = await loadSavedCredentialsIfExist();
//   if (client) return client;
//   client = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH });
//   if (client.credentials) await saveCredentials(client);
//   return client;
// }
// async function fetchPublicEvents(calendarId) {
//   const now = new Date();
//   const sevenDaysLater = new Date();
//   sevenDaysLater.setDate(now.getDate() + 7);
//   try {
//     const res = await calendar({ version: "v3" }).events.list({
//       calendarId: calendarId, // Public Calendar ID
//       key: process.env.GOOGLE_API_KEY,
//       timeMin: now.toISOString(),
//       timeMax: sevenDaysLater.toISOString(),
//       singleEvents: true,
//       orderBy: 'startTime',
//     });
//     const events = res.data.items;
//     if (events.length) {
//       return events
//     } else {
//       console.log("No upcoming events found.");
//     }
//   } catch (error) {
//     console.error("Error fetching events:", error.response?.data || error.message);
//   }
// }
// module.exports = fetchPublicEvents