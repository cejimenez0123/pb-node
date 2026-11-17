
const express = require("express");

const imageUpload = require("../utils/imageUpload");

const {
  uploadPhoto,
  getPhoto,
  deletePhoto,
} = require("../utils/photoController");

const router = express.Router();

module.exports = function (authMiddleware) {

  router.post(
    "/",
    authMiddleware,
    imageUpload.single("file"),
    uploadPhoto
  );

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
