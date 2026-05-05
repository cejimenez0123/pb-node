
async function deleteAndSync({ prismaDelete, indexName, objectID, client }) {
  // 1. Delete from Prisma first — it's the source of truth
  const deleted = await prismaDelete();
  
  // 2. Only remove from Algolia if Prisma succeeded
  await client.deleteObject({ indexName, objectID });
  
  return deleted;
}
module.exports = deleteAndSync