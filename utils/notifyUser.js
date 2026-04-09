const prisma = require("../db");

async function notifyUser({
  userId,
  type,
  title,
  body,
  entityId,
  actorId,
  route = '/notifications'
}) {
  // 1. Cooldown check (prevent spam)
  const recent = await prisma.notification.findFirst({
    where: {
      userId,
      type,
      entityId,
      createdAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000)
      }
    }
  });

  let notification;

  if (recent) {
    // 2. Merge instead of spamming
    notification = await prisma.notification.update({
      where: { id: recent.id },
      data: {
        count: { increment: 1 },
        actorIds: { push: actorId }
      }
    });
  } else {
    // 3. Create new notification
    notification = await createNotification({
      userId,
      type,
      message: body,
      entityId,
      actorId,
      route,
      highlightId: entityId
    });
  }

  // 4. Get tokens
  const tokens = await prisma.deviceToken.findMany({
    where: { userId },
    select: { token: true }
  });

  const tokenList = tokens.map(t => t.token);

  // 5. Badge count (iOS)
  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      readAt: null
    }
  });

  // 6. Send push
  await sendPush(tokenList, {
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


async function createNotification({
  userId,
  type,
  message,
  entityId,
  actorId,
  route,
  highlightId
}) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      message,
      entityId,
      actorIds: actorId ? [actorId] : [],
      route,
      highlightId
    }
  });
}}
module.exports = notifyUser
