const cron = require('node-cron');
const sendEventNewsletterEmail = require('../newsletter/sendEventNewsletterEmail');
const fetchEvents = require('../newsletter/fetchEvents');
const notificationTemplate = require("../html/notificationTemplate");
const prisma = require("../db");
const sleep = require("../utils/sleep");
const sendEmail = require("../newsletter/sendEmail");
const fetchAlerts = require("../newsletter/fetchAlerts");



// ============================================================
// DAILY NOTIFICATION EMAIL
// ============================================================

const dailyJob = cron.schedule(
  "0 9 * * *",
  async () => {
    // await dailyTask();
  },
  {
    timezone: "America/New_York"
  }
);


const dailyTask = async () => {
  const users = await prisma.user.findMany({
    include: {
      profiles: true
    }
  });

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const profile = user.profiles[0];

    if (profile) {
      if (shouldSendEmail(user.lastEmailed, user.emailFrequency)) {
        const notify = await fetchAlerts(profile);

        const {
          comments,
          roles,
          following,
          followers,
          collections,
          events
        } = notify;

        const template = notificationTemplate(
          { email: user.email },
          notify
        );

        await sleep(1000);

        if (
          comments.length > 0 ||
          roles.length > 0 ||
          following.length > 0 ||
          followers.length > 0 ||
          collections.length > 0 ||
          events.length > 0
        ) {
          await sendEmail(template);

          await prisma.user.update({
            where: {
              id: user.id
            },
            data: {
              lastEmailed: new Date()
            }
          });
        }
      } else {
        console.log(
          `Not enough time has passed since the last email for ${user.email}.`
        );
      }
    }
  }
};


// ============================================================
// PLUMBUM MIXER ANNOUNCEMENT
//
// Event:
// Friday, October 9, 2026
// 7:00 PM – 10:00 PM
//
// Resend limit:
// 100 emails/day
//
// Schedule:
// Oct 8  @ 11:00 AM → first 100
// Oct 9  @ 9:00 AM  → next 100
// Oct 10 @ 9:00 AM  → remaining 4
//
// NOTE:
// If Resend's 100/day limit is a hard account limit, the final
// 4 cannot be sent before the event without another sending
// allowance/provider.
// ============================================================

const MIXER_DAILY_LIMIT = 100;


// ------------------------------------------------------------
// CHOOSE THE USERS HERE
//
// IMPORTANT:
// Keep these IDs in the order you want the emails sent.
//
// The first 100 will be sent in batch 1.
// The next 100 will be sent in batch 2.
// The remaining users will be sent in batch 3.
//
// TODO: ADD YOUR USER IDS HERE.
// ------------------------------------------------------------

const MIXER_USER_IDS = [
  // "USER_ID_HERE",
  // "USER_ID_HERE",
  // "USER_ID_HERE",
];


// ------------------------------------------------------------
// Mixer batch dates
// ------------------------------------------------------------

const MIXER_BATCHES = {
  "2026-10-08": 0,
  "2026-10-09": 1,
  "2026-10-10": 2
};


// ------------------------------------------------------------
// Mixer cron
//
// Runs every morning, but sendMixerBatch() only actually sends
// on the three dates above.
//
// Oct 8 is intentionally 11 AM so the first batch can still
// go out today.
//
// Oct 9 and Oct 10 run at 9 AM.
// ------------------------------------------------------------




// ------------------------------------------------------------
// Send mixer batch
// ------------------------------------------------------------


// ============================================================
// WEEKLY NEWSLETTER
//
// Monday + Tuesday at 9 AM ET.
//
// Monday:
// Normal weekly newsletter batch.
//
// Tuesday:
// Catch-up batch for users still due.
//
// This keeps the weekly newsletter away from the Friday
// mixer announcement.
// ============================================================

const WEEKLY_DAILY_BUDGET = 90;
const WEEKLY_FREQUENCY_DAYS = 7;


const weeklyJob = cron.schedule(
  "0 9 * * 1,2",
  async () => {
    try {
      await weeklyEmail();
    } catch (err) {
      console.error(
        "WEEKLY JOB ERROR: " + err.message
      );
    }
  },
  {
    timezone: "America/New_York"
  }
);


const weeklyEmail = async () => {
  const days = WEEKLY_FREQUENCY_DAYS;


  // ----------------------------------------------------------
  // Find opted-in users, oldest weekly email first.
  // ----------------------------------------------------------

  const candidates = await prisma.user.findMany({
    where: {
      emailFrequency: {
        not: 0
      }
    },
    orderBy: [
      {
        lastWeeklyEmailed: {
          sort: "asc",
          nulls: "first"
        }
      },
      {
        id: "asc"
      }
    ]
  });


  // ----------------------------------------------------------
  // Only send to users who are actually due.
  // ----------------------------------------------------------

  const dueUsers = candidates.filter(user =>
    shouldSendEmail(
      user.lastWeeklyEmailed,
      days
    )
  );


  // ----------------------------------------------------------
  // Respect daily newsletter budget.
  // ----------------------------------------------------------

  const batchUsers = dueUsers.slice(
    0,
    WEEKLY_DAILY_BUDGET
  );


  if (batchUsers.length === 0) {
    console.log(
      "Weekly newsletter: no users due, skipping run."
    );
    return;
  }


  // ----------------------------------------------------------
  // Fetch events once for the entire batch.
  // ----------------------------------------------------------

  const events = await fetchEvents();


  // ----------------------------------------------------------
  // Send sequentially.
  // ----------------------------------------------------------

  for (let i = 0; i < batchUsers.length; i++) {
    const user = batchUsers[i];

    await sleep(1000);

    try {
      const res = await sendEventNewsletterEmail(
        user,
        events,
        days
      );


      if (!res?.data?.error) {
        console.log(
          `${i + 1}/${batchUsers.length} Success: ${user.email}`
        );

        await prisma.user.update({
          where: {
            id: user.id
          },
          data: {
            lastWeeklyEmailed: new Date()
          }
        });

      } else {
        console.log(
          `${i + 1}/${batchUsers.length} Error: ${user.email}`
        );
      }

    } catch (err) {
      console.log(
        `ERROR SEND WEEKLY EMAIL TO ${user.email}: ${err.message}`
      );
    }
  }


  const remaining =
    dueUsers.length - batchUsers.length;


  if (remaining > 0) {
    console.log(
      `Weekly newsletter: ${remaining} due users left for the next run.`
    );
  }
};


// ============================================================
// EMAIL FREQUENCY CHECK
// ============================================================

function shouldSendEmail(
  lastEmailTime,
  frequencyDays
) {
  if (!lastEmailTime) {
    return true;
  }

  const currentTime = Date.now();

  const previousTime =
    new Date(lastEmailTime).getTime();

  const elapsedMs =
    currentTime - previousTime;

  const elapsedDays =
    elapsedMs /
    (1000 * 60 * 60 * 24);

  return elapsedDays >= frequencyDays;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  weeklyJob,
  dailyJob,
  // mixerJob
};