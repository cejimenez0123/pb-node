const { google } = require("googleapis");
const { OAuth2 } = google.auth;

// Initialize OAuth2 client
const oauth2Client = new OAuth2(
  process.env.client_id,
  process.env.CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
);
