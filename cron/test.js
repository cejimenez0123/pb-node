const prisma = require("../db");
const sendEmail = require("../newsletter/sendEmail");
const mixerAnnouncementTemplate = require("../html/mixerannouncement");

const testMixerEmail = async () => {
  const TEST_USER_ID = "christianjimenez0123@gmail.com"

  const user = await prisma.user.findUnique({
    where: { email: TEST_USER_ID },
  });

  if (!user) {
    console.error("Test user not found:", TEST_USER_ID);
    return;
  }

  const template = mixerAnnouncementTemplate(user);

  const res = await sendEmail(template);

  if (res?.data?.error) {
    console.error("Test mixer email failed:", res.data.error);
    return;
  }

  console.log(`Test mixer email sent to ${user.email}`);
};
testMixerEmail().catch((err) => {
  console.error("Error sending test mixer email:", err);
});