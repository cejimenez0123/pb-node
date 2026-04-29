import prisma from "../db/index.js";
import apn from "apn";
import Paths from "./Paths.js";

const provider = new apn.Provider({
    token: {
        key: './AuthKey_ZH9A97395R.p8',
        keyId: process.env.APPLE_KEY_ID,
        teamId: process.env.APPLE_TEAM_ID
    },
    production: true
});



async function notifyUser({ profileId, type, title, body, entityId, actorId, route = Paths.notifications }) {
  console.log("notifyUser called:", { profileId, type, title });

  const recent = await prisma.notification.findFirst({
    where: {
      profileId, type, entityId,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
    }
  });

  let notification;
  if (recent) {
    notification = await prisma.notification.update({
      where: { id: recent.id },
      data: { count: { increment: 1 }, actorIds: { push: actorId } }
    });
  } else {
    notification = await prisma.notification.create({
      data: {
        profileId, type, message: body, entityId,
        actorIds: actorId ? [actorId] : [],
        route, highlightId: entityId
      }
    });
  }

  const tokens = await prisma.deviceToken.findMany({
    where: { profileId },
    select: { token: true }
  });

  console.log("tokens found:", tokens.length);

  if (!tokens.length) {
    console.log("No tokens found for profileId:", profileId);
    return;
  }

  const unreadCount = await prisma.notification.count({
    where: { profileId, readAt: null }
  });

  console.log("unreadCount:", unreadCount);

  await sendPush({
    tokens: tokens.map(t => t.token),
    title,
    body,
    data: {
      type,
      notificationId: notification.id,
      route,
      highlightId: notification.id
    },
    badge: unreadCount
  });
}

export async function clearBadge(profileId) {
  const tokens = await prisma.deviceToken.findMany({
    where: { profileId },
    select: { token: true }
  });

  if (!tokens.length) return;

  await sendPush({
    tokens: tokens.map(t => t.token),
    title: null,
    body: null,
    data: {},
    badge: 0
  });
}

export async function markNotificationsRead(profileId) {
  prisma.profile.update({where:{id:profileId},data:{
    lastNotified: new Date()
  }})

  await clearBadge(profileId);
}

export async function sendPush({ tokens, title, body, data = {}, badge }) {
  for (const token of tokens) {


    const notification = new apn.Notification();

    // Only set alert if there's a visible message
    if (title || body) {
      notification.alert = { title, body };
      notification.sound = 'default';
      notification.pushType = 'alert';
      notification.priority = 10;
    } else {
      // Silent push just to clear badge
      notification.contentAvailable = 1;
      notification.pushType = 'background';
      notification.priority = 5;
    }

    notification.badge = badge;
    notification.topic = 'com.plumbum.app';
    notification.payload = { ...data };

    console.log("notification payload:", JSON.stringify(notification));

    const result = await provider.send(notification, token);
    console.log("APNs result:", JSON.stringify(result));

    if (result.failed.length) {
      console.log('Failed reason:', result.failed[0].response ?? result.failed[0].error);
      await prisma.deviceToken.delete({ where: { token } }).catch(() => {});
    } else {
      console.log('Sent successfully to:', token.slice(0, 20) + "...");
    }
  }
}

export default notifyUser;