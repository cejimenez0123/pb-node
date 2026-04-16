const prisma = require("../db")
async function sendNotification(profileId, title, body) {
  const tokens = await prisma.deviceToken.findMany({
    where: { profileId },
    select: { token: true }
  });
  if (!tokens.length) return;

  const message = {
    notification: { title, body },
    tokens: tokens.map(t => t.token)
  };

  const response = await admin.messaging().sendMulticast(message);
  console.log('Sent notifications:', response.successCount);
}
module.exports = sendNotification