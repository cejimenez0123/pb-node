require('dotenv').config({ path: '../.env' });
const prisma = require('../db');
const sendNotification = require("../utils/sendNotifications.js");
const { SPRINT_SLOTS, fireSprintNotification, getTodaysPrompt } = require('../cron/sprint.js')

const TEST_EMAILS = ['plumbumapp@gmail.com,christianjimenez0123@gmail.com'];
const SLOT_ID = 'morning';

async function main() {
  const slot = SPRINT_SLOTS[SLOT_ID]; // ← was hardcoded string "morning"

  const [, testProfiles, prompt] = await Promise.all([
    fireSprintNotification(SLOT_ID),
    prisma.profile.findMany({
      where: { user: { email: { in: TEST_EMAILS } } },
      select: { id: true, user: { select: { email: true } } },
    }),
    getTodaysPrompt(),
  ]);

  const body  = prompt?.teaser ?? "Open Plumbum for today's writing prompt.";
  const route = '/profile/alert';

  await Promise.all(
    testProfiles.map((p) =>
      sendNotification(p.id, `[TEST] ${slot.label}`, body, {
        route,
        type: 'writing_sprint',
        slotId: SLOT_ID,
        promptId: prompt?.id ?? '',
      }).then(() => console.log(`Sent to ${p.user.email}`))
        .catch((err) => console.error(`Failed for ${p.user.email}:`, err))
    )
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());