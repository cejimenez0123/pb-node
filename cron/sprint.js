const cron = require('node-cron');
const prisma = require('../db');
const sendNotification = require('../utils/sendNotifications');

const SPRINT_SLOTS = {
  morning:   { label: '🌅 Morning Sprint',   cron: '0 7  * * *', time: '7:00 AM'  },
  midday:    { label: '☀️ Midday Sprint',    cron: '0 12 * * *', time: '12:00 PM' },
  afternoon: { label: '🌤 Afternoon Sprint', cron: '0 15 * * *', time: '3:00 PM'  },
  evening:   { label: '🌆 Evening Sprint',   cron: '0 19 * * *', time: '7:00 PM'  },
  night:     { label: '🌙 Night Sprint',     cron: '0 22 * * *', time: '10:00 PM' },
};

async function getTodaysPrompt() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prompt = await prisma.story.findFirst({
      where: {
        hashtags: { some: { hashtag: { name: { contains: 'prompt' } } } },
        createdAt: { gte: today },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, data: true },
    });

    if (!prompt?.data) return null; // ← was prompt?.content

    const raw = prompt.data.replace(/<[^>]+>/g, '').trim(); // ← was prompt.content
    const teaser = raw.length > 90 ? raw.slice(0, 87) + '…' : raw;

    return { id: prompt.id, teaser };
  } catch {
    return null;
  }
}

async function fireSprintNotification(slotId) {
  const slot = SPRINT_SLOTS[slotId];

  const [profiles, prompt] = await Promise.all([
    prisma.profile.findMany({
      where: { writingSprintSlots: { has: slotId } },
      select: { id: true },
    }),
    getTodaysPrompt(),
  ]);

  if (!profiles.length) {
    console.log(`[sprint-cron] ${slot.label} — no opted-in users, skipping`);
    return;
  }

  const body  = prompt?.teaser ?? "Open Plumbum for today's writing prompt."; // ← moved inside function
  const route = '/notifications'; // ← moved inside function

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