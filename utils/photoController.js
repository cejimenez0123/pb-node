
// import prisma from "../config/prisma.js";
const prisma = require("../db")
// Verify the actual binary file signature.
const getImageMimeType = (buffer) => {
  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG signature
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
      ])
    )
  ) {
    return "image/png";
  }

  return null;
};

// POST /api/photos
 const uploadPhoto = async (req, res) => {
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
        filename: file.originalname,
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

    const url = `/api/photos/${photo.id}`;

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
};


// GET /api/photos/:id
 const getPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id },
      select: {
        data: true,
        mimeType: true,
      },
    });

    if (!photo) {
      return res.status(404).json({
        message: "Image not found.",
      });
    }

    res.set({
      "Content-Type": photo.mimeType,
      "Content-Length": String(photo.data.length),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });

    return res.send(Buffer.from(photo.data));

  } catch (error) {
    console.error("Photo retrieval error:", error);

    return res.status(500).json({
      message: "Unable to retrieve image.",
    });
  }
};


// DELETE /api/photos/:id
 const deletePhoto = async (req, res) => {
  try {
    const { id } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id },
      select: {
        id: true,
        profileId: true,
      },
    });

    if (!photo) {
      return res.status(404).json({
        message: "Image not found.",
      });
    }

    // Verify ownership/authorization here too.

    await prisma.photo.delete({
      where: { id },
    });

    return res.json({
      message: "Image deleted successfully.",
    });

  } catch (error) {
    console.error("Photo deletion error:", error);

    return res.status(500).json({
      message: "Unable to delete image.",
    });
  }
};

module.exports ={deletePhoto,uploadPhoto,getPhoto}