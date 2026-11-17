
const prisma = require("../")

const createPhoto = async ({
  profileId,
  data,
  filename,
  mimeType,
  purpose = "general",
  originalUrl = null,
  originalPath = null,
}) => {
  return prisma.photo.create({
    data: {
      profileId,
      data,
      filename,
      mimeType,
      size: data.length,
      purpose,
      originalUrl,
      originalPath,
    },
    select: {
      id: true,
      profileId: true,
      filename: true,
      mimeType: true,
      size: true,
      purpose: true,
      createdAt: true,
      originalUrl: true,
    },
  });
};

const getPhotoById = async (id) => {
  return prisma.photo.findUnique({
    where: { id },
  });
};

const getPhotoMetadata = async (id) => {
  return prisma.photo.findUnique({
    where: { id },
    select: {
      id: true,
      profileId: true,
      filename: true,
      mimeType: true,
      size: true,
      purpose: true,
      createdAt: true,
    },
  });
};

const getPhotosByProfileId = async (profileId) => {
  return prisma.photo.findMany({
    where: { profileId },
    select: {
      id: true,
      profileId: true,
      filename: true,
      mimeType: true,
      size: true,
      purpose: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getPhotoByOriginalUrl = async (originalUrl) => {
  if (!originalUrl) return null;

  return prisma.photo.findUnique({
    where: { originalUrl },
  });
};

const deletePhoto = async (id) => {
  return prisma.photo.delete({
    where: { id },
  });
};

module.exports = {
  createPhoto,
  getPhotoById,
  getPhotoMetadata,
  getPhotosByProfileId,
  getPhotoByOriginalUrl,
  deletePhoto,
};
