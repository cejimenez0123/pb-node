const cron = require('node-cron');
const prisma = require('../db');
const sendNotification = require('../utils/sendNotifications');
const Paths = require('../utils/Paths');

const SPRINT_SLOTS = {
  morning:   { label: '🌅 Morning Sprint',   cron: '0 7  * * *', time: '7:00 AM'  },
  midday:    { label: '☀️ Midday Sprint',    cron: '0 12 * * *', time: '12:00 PM' },
  afternoon: { label: '🌤 Afternoon Sprint', cron: '0 15 * * *', time: '3:00 PM'  },
  evening:   { label: '🌆 Evening Sprint',   cron: '0 19 * * *', time: '7:00 PM'  },
  night:     { label: '🌙 Night Sprint',     cron: '0 22 * * *', time: '10:00 PM' },
};

const slotCache = {
  key: null,
  prompt: null,
};

function getCurrentSlotKey(slotId) {
  const now = new Date();
  return `${now.toISOString().slice(0, 10)}:${slotId}`;
}

async function getTodaysPrompt(slotId) {
  try {
    const cacheKey = getCurrentSlotKey(slotId);

    if (slotCache.key === cacheKey && slotCache.prompt) {
      return slotCache.prompt;
    }

    const allPrompts = await prisma.story.findMany({
      where: {
        hashtags: {
          some: {
            hashtag: {
              name: { contains: 'prompt', mode: 'insensitive' },
            },
          },
        },
      },
      orderBy: { created: 'asc' },
      select: { id: true, data: true },
    });

    if (!allPrompts.length) return null;

    const EPOCH = new Date('2024-01-01');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysSinceEpoch = Math.floor((today - EPOCH) / 86400000);
    const baseIndex = daysSinceEpoch % allPrompts.length;

    const slotOffsets = {
      morning: 0,
      midday: 1,
      afternoon: 2,
      evening: 3,
      night: 4,
    };

    const offset = slotOffsets[slotId] ?? 0;
    const index = (baseIndex + offset) % allPrompts.length;

    const prompt = allPrompts[index];
    if (!prompt?.data) return null;

    const raw = prompt.data.replace(/<[^>]+>/g, '').trim();
    const teaser = raw.length > 90 ? raw.slice(0, 87) + '…' : raw;

    const result = { id: prompt.id, teaser };
    slotCache.key = cacheKey;
    slotCache.prompt = result;

    return result;
  } catch (err) {
    console.error('[sprint-cron] getTodaysPrompt failed:', err);
    return null;
  }
}
// async function getTodaysPrompt() {
//   try {
//     const allPrompts = await prisma.story.findMany({
//       where: {
//         hashtags: { some: { hashtag: { name: { contains: 'prompt', mode: 'insensitive' } } } },
//       },
//       orderBy: { created: 'asc' }, // stable, consistent order
//       select: { id: true, data: true },
//     });

//     if (!allPrompts.length) return null;

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const EPOCH = new Date('2024-01-01'); // fixed reference so the index is stable over time
//     const daysSinceEpoch = Math.floor((today - EPOCH) / 86400000);
//     const index = daysSinceEpoch % allPrompts.length;

//     const prompt = allPrompts[index];
//     if (!prompt?.data) return null;

//     const raw = prompt.data.replace(/<[^>]+>/g, '').trim();
//     const teaser = raw.length > 90 ? raw.slice(0, 87) + '…' : raw;

//     console.log('[sprint-cron] getTodaysPrompt:', { promptId: prompt.id, index, total: allPrompts.length });
//     return { id: prompt.id, teaser };
//   } catch (err) {
//     console.error('[sprint-cron] getTodaysPrompt failed:', err);
//     return null;
//   }
// }


// async function fireSprintNotification(slotId) {
//   const slot = SPRINT_SLOTS[slotId];

//   const [profiles, prompt] = await Promise.all([
//     prisma.profile.findMany({
//       where: { writingSprintSlots: { has: slotId } },
//       select: { id: true },
//     }),
//     getTodaysPrompt(),
//   ]);

//   if (!profiles.length) {
//     console.log(`[sprint-cron] ${slot.label} — no opted-in users, skipping`);
//     return;
//   }

//   const body  = prompt?.teaser ?? "Open Plumbum for today's writing prompt."; // ← moved inside function
//   const route = prompt.id? Paths.page.createRoute(prompt.id): Paths.notifications;

//   await Promise.all(
//     profiles.map((p) =>
//       sendNotification(p.id, slot.label, body, {
//         route,
//         type: 'writing_sprint',
//         slotId,
//         promptId: prompt?.id ?? '',
//       }).catch((err) =>
//         console.error(`[sprint-cron] failed for profile ${p.id}:`, err)
//       )
//     )
//   );

//   console.log(`[sprint-cron] ${slot.label} → notified ${profiles.length} profile(s)`);
// }
async function fireSprintNotification(slotId) {
  const slot = SPRINT_SLOTS[slotId];

  const [profiles, prompt] = await Promise.all([
    prisma.profile.findMany({
      where: { writingSprintSlots: { has: slotId } },
      select: { id: true },
    }),
    getTodaysPrompt(slotId),
  ]);

  if (!profiles.length) {
    console.log(`[sprint-cron] ${slot.label} — no opted-in users, skipping`);
    return;
  }

  const body = prompt?.teaser ?? "Open Plumbum for today's writing prompt.";
  const route = prompt?.id ? Paths.page.createRoute(prompt.id) : Paths.notifications;

  await Promise.all(
    profiles.map((p) =>
      sendNotification(p.id, slot.label, body, {
        route,
        type: 'writing_sprint',
        slotId,
        promptId: prompt?.id ?? '',
      }).catch((err) =>
        console.error(`[sprint-cron] failed for profile ${p.id}:`, err)
      )
    )
  );

  console.log(`[sprint-cron] ${slot.label} → notified ${profiles.length} profile(s)`);
}
function registerSprintCrons() {
  for (const [slotId, slot] of Object.entries(SPRINT_SLOTS)) {
    cron.schedule(
      slot.cron,
      () => {
        fireSprintNotification(slotId).catch((err) =>
          console.error(`[sprint-cron] ${slotId} error:`, err)
        );
      },
      { timezone: 'America/New_York' }
    );

    console.log(`[sprint-cron] Registered: ${slot.label} at ${slot.time} ET`);
  }
}

module.exports = { registerSprintCrons, SPRINT_SLOTS, fireSprintNotification, getTodaysPrompt };