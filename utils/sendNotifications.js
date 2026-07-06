
const prisma = require('../db');
const admin = require('../google/firebaseAdmin');

async function sendNotification(profileId, title, body, data = {}) {
  const tokens = await prisma.deviceToken.findMany({
    where: { profileId },
    select: { token: true },
  });

  if (!tokens.length) return;

  const stringifiedData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  const message = {
    notification: { title:title+": ", body },
    data: stringifiedData,
    tokens: tokens.map(t => t.token),
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  response.responses.forEach((r, i) => {
    if (!r.success) {
      console.log(`Token ${i} failed:`, r.error?.code, r.error?.message);
    }
  });

  console.log('Sent notifications:', response.successCount);
}

module.exports = sendNotification;