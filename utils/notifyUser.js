

const prisma = require("../db");
const apn = require("apn");
const Paths = require("./Paths");

const provider = new apn.Provider({
  token: {
    key: "./AuthKey_ZH9A97395R.p8",
    keyId: process.env.APPLE_KEY_ID,
    teamId: process.env.APPLE_TEAM_ID,
  },
  production: true,
});

async function notifyUser({
  profileId,
  type,
  title,
  body,
  entityId,
  actorId,
  route = Paths.notifications,
}) {
 
  const recent = await prisma.notification.findFirst({
    where: {
      profileId,
      type,
      entityId,
      createdAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000),
      },
    },
  });

  let notification;

  if (recent) {
    notification = await prisma.notification.update({
      where: { id: recent.id },
      data: {
        count: { increment: 1 },
        actorIds: actorId ? { push: actorId } : undefined,
      },
    });
  } else {
    notification = await prisma.notification.create({
      data: {
        profileId,
        type,
        message: body,
        entityId,
        actorIds: actorId ? [actorId] : [],
        route,
        highlightId: entityId,
      },
    });
  }

  const tokens = await prisma.deviceToken.findMany({
    where: { profileId },
    select: { token: true },
  });

  if (!tokens.length) return;

  const unreadCount = await prisma.notification.count({
    where: { profileId, readAt: null },
  });

  await sendPush({
    tokens: tokens.map((t) => t.token),
    title,
    body,
    data: {
      type,
      notificationId: notification.id,
      route,
      highlightId: notification.id,
    },
    badge: unreadCount,
  });
}

async function clearBadge(profileId) {
  const tokens = await prisma.deviceToken.findMany({
    where: { profileId },
    select: { token: true },
  });

  if (!tokens.length) return;

  await sendPush({
    tokens: tokens.map((t) => t.token),
    title: null,
    body: null,
    data: {},
    badge: 0,
  });
}

async function markNotificationsRead(profileId) {
  await prisma.profile.update({
    where: { id: profileId },
    data: { lastNotified: new Date() },
  });

  await clearBadge(profileId);
}

async function sendPush({ tokens, title, body, data = {}, badge }) {
  for (const token of tokens) {
    const notification = new apn.Notification();

    if (title || body) {
      notification.alert = { title, body };
      notification.sound = "default";
      notification.pushType = "alert";
      notification.priority = 10;
    } else {
      notification.contentAvailable = 1;
      notification.pushType = "background";
      notification.priority = 5;
    }

    notification.badge = badge;
    notification.topic = "com.plumbum.app";
    notification.payload = { ...data };

    const result = await provider.send(notification, token);

    if (result.failed.length) {
      console.error(
        "APNs failed:",
        result.failed[0].response ?? result.failed[0].error
      );

      await prisma.deviceToken.delete({ where: { token } }).catch(() => {});
    }
  }
}

module.exports = notifyUser;
module.exports.clearBadge = clearBadge;
module.exports.markNotificationsRead = markNotificationsRead;
module.exports.sendPush = sendPush;
