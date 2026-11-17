
const express = require("express");

const imageUpload = require("../utils/imageUpload");

const {
  uploadPhoto,
  getPhoto,
  deletePhoto,
} = require("../utils/photoController");
const getImageMimeType = require("../utils/getImageMimeType");
const prisma = require("../db");

const router = express.Router();

module.exports = function (authMiddleware) {

  router.post(
    "/",
    authMiddleware,
    imageUpload.single("file"),
async (req, res) => {
  try {
    const { file } = req;

    if (!file) {
      return res.status(400).json({
        message: "No image provided.",
      });
    }

    const mimeType = getImageMimeType(file.buffer);

    if (!mimeType || mimeType !== file.mimetype) {
      return res.status(400).json({
        message: "Invalid image file.",
      });
    }

    const profileId = req.body.profileId;

    if (!profileId) {
      return res.status(400).json({
        message: "Profile ID is required.",
      });
    }

    // IMPORTANT:
    // Verify that the authenticated user is authorized
    // to upload to this profile before saving.
    // Replace this check with your existing authorization logic.

    const photo = await prisma.photo.create({
      data: {
        profileId,
        data: file.buffer,
      filename: req.body.filename || file.originalname,
        mimeType,
        size: file.size,
        purpose: req.body.purpose || "general",
      },

      select: {
        id: true,
        profileId: true,
        mimeType: true,
        size: true,
        purpose: true,
        createdAt: true,
      },
    });

    const url = `/photos/${photo.id}`;

    return res.status(201).json({
      message: "Image uploaded successfully.",
      photo: {
        ...photo,
        url,
      },
    });

  } catch (error) {
    console.error("Photo upload error:", error);

    return res.status(500).json({
      message: "Unable to upload image.",
    });
  }
})
  router.get(
    "/:id",
    authMiddleware,
    getPhoto
  );

  router.delete(
    "/:id",
    authMiddleware,
    deletePhoto
  );

  return router;
};
