import prisma from "../db/index.js";
import apn from "apn";

const provider = new apn.Provider({
    token: {
        key: './AuthKey_ZH9A97395R.p8',
        keyId: process.env.APPLE_KEY_ID,
        teamId: process.env.APPLE_TEAM_ID
    },
    production: true
});
console.log(process.env.APPLE_KEY_ID)
console.log(process.env.APPLE_TEAM_ID)
async function notifyUser({
    profileId,
    type,
    title,
    body,
    entityId,
    actorId,
    route = '/notifications'
}) {
    // 1. Cooldown check
    const recent = await prisma.notification.findFirst({
        where: {
            profileId,
            type,
            entityId,
            createdAt: {
                gte: new Date(Date.now() - 5 * 60 * 1000)
            }
        }
    });

    let notification;
    if (recent) {
        notification = await prisma.notification.update({
            where: { id: recent.id },
            data: {
                count: { increment: 1 },
                actorIds: { push: actorId }
            }
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
                highlightId: entityId
            }
        });
    }

    // 2. Get device tokens
    const tokens = await prisma.deviceToken.findMany({
        where: { profileId },
        select: { token: true }
    });

    if (!tokens.length) return;

    // 3. Badge count
    const unreadCount = await prisma.notification.count({
        where: { profileId, readAt: null }
    });

    // 4. Send to each token
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

// export async function sendPush({ tokens, title, body, data = {}, badge }) {
//     for (const token of tokens) {
//         const notification = new apn.Notification();

//         notification.contentAvailable = 1;
//         notification.pushType = 'background';
//         notification.priority = 5;
//         notification.topic = 'com.plumbum.app';

//         // Payload — AppDelegate reads these to build local notification
//         notification.payload = {
//             title,
//             body,
//             badge,
//             ...data
//         };

//         const result = await provider.send(notification, token);

//         if (result.failed.length) {
//             console.log('Failed:', result.failed[0].error);
//             // Clean up invalid token
//             await prisma.deviceToken.delete({
//                 where: { token }
//             }).catch(() => {});
//         } else {
//             console.log('Sent successfully to:', token);
//         }
//     }
// }
export async function sendPush({ tokens, title, body, data = {}, badge }) {
    for (const token of tokens) {
        const notification = new apn.Notification();
        
        // Alert push — shows immediately without AppDelegate
        notification.alert = { title, body };
        notification.sound = 'default';
        notification.badge = badge;
        notification.pushType = 'alert';
        notification.priority = 10;
        notification.topic = 'com.plumbum.app';
        notification.payload = { ...data };

        const result = await provider.send(notification, token);
        if (result.failed.length) {
            console.log('Failed:', result.failed[0].error);
            await prisma.deviceToken.delete({
                where: { token }
            }).catch(() => {});
        } else {
            console.log('Sent successfully to:', token);
        }
    }
}
export default notifyUser;