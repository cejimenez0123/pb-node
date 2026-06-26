const prisma = require("../db");

// helper near your other event functions
let _officialProfileId = null;
async function getOfficialProfileId() {
  if (_officialProfileId) return _officialProfileId;
  const profile = await prisma.profile.findFirst({
    where: { username: { equals: "plumbumofficial", mode: "insensitive" } },
    select: { id: true },
  });
  if (!profile) throw new Error("plumbumofficial profile not found — create it before syncing events");
  _officialProfileId = profile.id;
  return _officialProfileId;
}
module.exports = getOfficialProfileId