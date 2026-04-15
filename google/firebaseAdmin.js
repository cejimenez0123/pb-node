const admin = require('firebase-admin');
const serviceAccount = {
  "type": process.env.GOOGLE_SERVICE_TYPE,
  "project_id": process.env.GOOGLE_SERVICE_PROJECT_ID,
  "private_key_id": process.env.GOOGLE_SERVICE_PRIVATE_KEY_ID,
  "private_key": process.env.GOOGLE_SERVICE_PRIVATE_KEY,
    "client_email":process.env.GOOGLE_SERVICE_CLIENT_EMAIL,
  "client_id": process.env.GOOGLE_SERVICE_CLIENT_ID,
  "auth_uri": process.env.GOOGLE_SERVICES_AUTH_URL,
  "token_uri": process.env.GOOGLE_SERVICES_TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.GOOGLE_SERVICES_AUTH_PROVIDER,
  "client_x509_cert_url": process.env.GOOGLE_SERVICES_CERT_URL,
    "universe_domain":process.env.GOOGLE_SERVICES_UNIVERSE_DOMAIN
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;