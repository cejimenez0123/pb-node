const { decode, verify } = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

// Function to fetch Apple's public keys
async function getApplePublicKey(kid) {
  const res = await fetch('https://appleid.apple.com/auth/keys');
  if (!res.ok) throw new Error('Failed to fetch Apple public keys');
  const { keys } = await res.json();
  const key = keys.find(k => k.kid === kid);
  if (!key) throw new Error('Public key not found');
  // Convert JWK to PEM format string for jwt.verify
  const pubKey = jwkToPem(key);
  return pubKey;
}

// Use a library like 'jwk-to-pem' to convert JWK to PEM


// Main function to verify and decode identity token
module.exports = async function verifyAppleIdentityToken(identityToken) {
  // Decode token header to get kid
  const decodedHeader = decode(identityToken, { complete: true });
  const kid = decodedHeader.header.kid;

  // Get the appropriate Apple public key (PEM format)
  const applePublicKey = await getApplePublicKey(kid);

  // Verify token signature and validate token
  const payload = verify(identityToken, applePublicKey, {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
    audience: process.env.apple_clientId,
  });

  return payload; // Payload contains email, sub (user ID), etc.
}

// 
