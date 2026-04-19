import { OAuth2Client } from "google-auth-library";
  const CLIENT_ID = process.env.VITE_OAUTH2_CLIENT_ID;
  const IOS_CLIENT_ID = process.env.VITE_IOS_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);
  
export async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience:CLIENT_ID
  });

  const payload = ticket.getPayload();

  return {
    email: payload.email,
    sub: payload.sub, // Google unique user ID
    name: payload.name,
    picture: payload.picture,
  };
}