


const express = require("express");

const imageUpload = require("../utils/imageUpload");
const optionalAuth = require("../middleware/optionalAuth");
const extractPhotoId = (value) => {
  if (typeof value !== "string") return null;

  const match = value.match(
    /\/photos\/([a-f\d]{24})(?:[/?#]|$)/i
  );

  return match ? match[1] : null;
};
const {
  uploadPhoto,
  uploadProfilePicture,
  getPhoto,
  deletePhoto,
  associatePhotoWithStory,
} = require("../utils/photoController");
const prisma = require("../db");
const checkContent = require("../utils/checkContent");
const client = require("../utils/algoliaClient");

const router = express.Router();

module.exports = function (authMiddleware) {
  // Profile picture upload and replacement.
  router.post(
    "/profile-picture",
    authMiddleware,
    imageUpload.single("file"),
    uploadProfilePicture
  );
router.patch(
  "/:id/story/:storyId",
  authMiddleware,
  associatePhotoWithStory
);
  router.post(
    "/",
    authMiddleware,
    imageUpload.single("file"),
    uploadPhoto
  );

  // Profile pictures can be loaded directly by img tags.
  // Other photos require authentication.
router.get("/:id", optionalAuth, getPhoto
);

  router.delete(
    "/:id",
    authMiddleware,
    deletePhoto
  );

  return router;
};
