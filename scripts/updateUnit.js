const prisma = require("../db")

// async function updateUntitledStories() {
    
// //   try {
// //     const result = await prisma.collection.updateMany({
// //       where: {
// //         title: "",
// //       },
// //       data: {
// //         title: "Untitled",
// //       },
// //     });

// //     console.log(`Updated ${result.count} stories to "Untitled".`);
// //   } catch (error) {
// //     console.error("Error updating story titles:", error);
// //   } finally {
// //     await prisma.$disconnect();
// //   }
// }


async function normalizeUntitledStories() {
  const stories = await prisma.story.findMany({
    select: {
      id: true,
      title: true,
    },
  });

  const untitledStories = stories.filter(
    (story) => !story.title?.trim()
  );

  console.log(
    `Found ${untitledStories.length} stories without titles.`
  );

  for (const story of untitledStories) {
    await prisma.story.update({
      where: { id: story.id },
      data: { title: "Untitled" },
    });
  }

  console.log("Finished normalizing story titles.");
}

normalizeUntitledStories()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });