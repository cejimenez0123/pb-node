
const prisma = require("../db");
const getImageMimeType = require("./getImageMimeType");

const PHOTO_PURPOSES = new Set([
  "general",
  "story",
  "profile",
]);

const getAuthenticatedProfile = (req) => {
  return req.user?.profiles?.[0] || null;
};

const getPhotoIdFromUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  const match = url.match(/\/photos\/([a-f\d]{24})(?:\/)?$/i);
  return match?.[1] || null;
};

const getPhotoUrl = (id) => `/api/photos/${id}`;

/**
 * Upload a photo.
 *
 * Profile pictures are handled separately by uploadProfilePicture.
 * General and Story photos are stored without creating a Story.
 */
const uploadPhoto = async (req, res) => {
  try {
    const profile = getAuthenticatedProfile(req);

    if (!profile?.id) {
      return res.status(401).json({
        message: "Authenticated profile not found.",
      });
    }

    const file = req.file;

    if (!file?.buffer) {
      return res.status(400).json({
        message: "No image provided.",
      });
    }

    const purpose = req.body?.purpose || "general";

    if (!PHOTO_PURPOSES.has(purpose) || purpose === "profile") {
      return res.status(400).json({
        message: "Invalid photo purpose.",
      });
    }

    const mimeType = getImageMimeType(file.buffer);

    if (!mimeType || mimeType !== file.mimetype) {
      return res.status(400).json({
        message: "Invalid image file.",
      });
    }

    const photo = await prisma.photo.create({
      data: {
        profileId: profile.id,
        data: file.buffer,
        filename: file.originalname,
        mimeType,
        size: file.size,
        purpose,
      },
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

    return res.status(201).json({
      message: "Image uploaded successfully.",
      photo: {
        ...photo,
        url: getPhotoUrl(photo.id),
      },
    });
  } catch (error) {
    console.error("Photo upload error:", error);

    return res.status(500).json({
      message: "Unable to upload image.",
    });
  }
};

/**
 * Upload and set the authenticated user's profile picture.
 *
 * The Profile stores:
 * - profilePic: relative URL
 * - profilePictureId: Photo ObjectId
 */
const uploadProfilePicture = async (req, res) => {
  let newPhotoId = null;

  try {
    const profile = getAuthenticatedProfile(req);

    if (!profile?.id) {
      return res.status(401).json({
        message: "Authenticated profile not found.",
      });
    }

    const file = req.file;

    if (!file?.buffer) {
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

    const previousProfile = await prisma.profile.findUnique({
      where: { id: profile.id },
      select: {
        id: true,
        profilePictureId: true,
      },
    });

    if (!previousProfile) {
      return res.status(404).json({
        message: "Profile not found.",
      });
    }

    const photo = await prisma.photo.create({
      data: {
        profileId: profile.id,
        data: file.buffer,
        filename: file.originalname,
        mimeType,
        size: file.size,
        purpose: "profile",
      },
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

    newPhotoId = photo.id;

    const profilePic = getPhotoUrl(photo.id);

    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        profilePic,
        profilePictureId: photo.id,
      },
    });

    // Delete the previous profile photo only after the new
    // image and profile update have succeeded.
    const previousPhotoId = previousProfile.profilePictureId;

    if (
      previousPhotoId &&
      previousPhotoId !== photo.id
    ) {
      try {
        await prisma.photo.deleteMany({
          where: {
            id: previousPhotoId,
            profileId: profile.id,
            purpose: "profile",
          },
        });
      } catch (cleanupError) {
        console.error(
          "Previous profile photo cleanup failed:",
          cleanupError
        );
      }
    }

    return res.status(201).json({
      message: "Profile picture updated successfully.",
      profile: updatedProfile,
      photo: {
        ...photo,
        url: profilePic,
      },
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);

    // If the profile update failed after the new Photo was
    // created, clean up the unused image.
    if (newPhotoId) {
      try {
        await prisma.photo.delete({
          where: { id: newPhotoId },
        });
      } catch (cleanupError) {
        console.error(
          "New profile photo cleanup failed:",
          cleanupError
        );
      }
    }

    return res.status(500).json({
      message: "Unable to update profile picture.",
    });
  }
};

/**
 * Retrieve a photo.
 *
 * Profile pictures are directly accessible through an ordinary
 * img src URL. Other photos require an authenticated owner.
 *
 * Private Story authorization will be expanded to use the
 * application's Story/collection permissions.
 */


const getPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const profileId = req.user?.profiles?.[0]?.id;

    const photo = await prisma.photo.findUnique({
      where: { id },
    });

    if (!photo) {
      return res.status(404).json({
        message: "Photo not found.",
      });
    }

    // Profile pictures are available through their relative URL
    // so ordinary <img src="..."> rendering works.
    if (photo.purpose === "profile") {
      res.set({
        "Content-Type": photo.mimeType,
        "Content-Length": String(photo.size),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      });

      return res.send(Buffer.from(photo.data));
    }

    // All non-profile photos require authentication.
    if (!profileId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    // The uploading profile always retains access.
    let authorized = photo.profileId === profileId;

    if (
      !authorized &&
      photo.purpose === "story" &&
      photo.storyId
    ) {
      // The Story author has access.
      const story = await prisma.story.findUnique({
        where: { id: photo.storyId },
        select: {
          authorId: true,
        },
      });

      if (story?.authorId === profileId) {
        authorized = true;
      }

      // Other authorized profiles must have an approved role.
      if (!authorized) {
        const role = await prisma.roleToStory.findFirst({
          where: {
            profileId,
            storyId: photo.storyId,
            approved: true,
          },
          select: {
            id: true,
          },
        });

        authorized = Boolean(role);
      }
    }

    if (!authorized) {
      return res.status(403).json({
        message: "You do not have permission to access this photo.",
      });
    }

    res.set({
      "Content-Type": photo.mimeType,
      "Content-Length": String(photo.size),
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
    });

    return res.send(Buffer.from(photo.data));
  } catch (error) {
    console.error("[getPhoto]", error);

    return res.status(500).json({
      message: "Unable to retrieve photo.",
    });
  }
};

// const getPhoto = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({
//         message: "Photo ID is required.",
//       });
//     }

//     const photo = await prisma.photo.findUnique({
//       where: { id },
//       select: {
//         id: true,
//         profileId: true,
//         data: true,
//         mimeType: true,
//         purpose: true,
//       },
//     });

//     if (!photo) {
//       return res.status(404).json({
//         message: "Image not found.",
//       });
//     }

//     const isProfilePicture = photo.purpose === "profile";
//     const authenticatedProfile = getAuthenticatedProfile(req);

//     if (
//       !isProfilePicture &&
//       authenticatedProfile?.id !== photo.profileId
//     ) {
//       return res.status(403).json({
//         message: "You are not authorized to view this image.",
//       });
//     }

//     res.set({
//       "Content-Type": photo.mimeType,
//       "Content-Length": String(photo.data.length),
//       "Cache-Control": isProfilePicture
//         ? "public, max-age=3600"
//         : "private, max-age=3600",
//       "X-Content-Type-Options": "nosniff",
//     });

//     return res.status(200).send(Buffer.from(photo.data));
//   } catch (error) {
//     console.error("Get photo error:", error);

//     return res.status(500).json({
//       message: "Unable to retrieve image.",
//     });
//   }
// };

/**
 * Delete a photo owned by the authenticated profile.
 *
 * A profile picture deletion also clears the two Profile fields.
 */
const deletePhoto = async (req, res) => {
  try {
    const profile = getAuthenticatedProfile(req);

    if (!profile?.id) {
      return res.status(401).json({
        message: "Authenticated profile not found.",
      });
    }

    const { id } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id },
      select: {
        id: true,
        profileId: true,
        purpose: true,
      },
    });

    if (!photo) {
      return res.status(404).json({
        message: "Image not found.",
      });
    }

    if (photo.profileId !== profile.id) {
      return res.status(403).json({
        message: "You are not authorized to delete this image.",
      });
    }

    if (photo.purpose === "profile") {
      await prisma.profile.updateMany({
        where: {
          id: profile.id,
          profilePictureId: photo.id,
        },
        data: {
          profilePic: null,
          profilePictureId: null,
        },
      });
    }

    await prisma.photo.delete({
      where: { id: photo.id },
    });

    return res.status(200).json({
      message: "Image deleted successfully.",
      photoId: photo.id,
    });
  } catch (error) {
    console.error("Delete photo error:", error);

    return res.status(500).json({
      message: "Unable to delete image.",
    });
  }
};
const associatePhotoWithStory = async (req, res) => {
  const profileId = req.user?.profiles?.[0]?.id;
  const { id: photoId, storyId } = req.params;

  let associationCreated = false;

  try {
    if (!profileId) {
      return res.status(401).json({
        message: "Authenticated profile not found.",
      });
    }

    const [photo, story] = await Promise.all([
      prisma.photo.findUnique({
        where: { id: photoId },
      }),
      prisma.story.findUnique({
        where: { id: storyId },
      }),
    ]);

    if (!photo) {
      return res.status(404).json({
        message: "Photo not found.",
      });
    }

    if (!story) {
      return res.status(404).json({
        message: "Story not found.",
      });
    }

    // A user can only associate a Photo they uploaded.
    if (
      photo.profileId !== profileId ||
      photo.purpose !== "story"
    ) {
      return res.status(403).json({
        message: "You cannot associate this photo with the Story.",
      });
    }

    // The Story author can edit their Story directly.
    let canWrite = story.authorId === profileId;

    // Other profiles need an approved writer/editor role.
    if (!canWrite) {
      const role = await prisma.roleToStory.findFirst({
        where: {
          profileId,
          storyId,
          approved: true,
          role: {
            in: ["writer", "editor"],
          },
        },
        select: {
          id: true,
        },
      });

      canWrite = Boolean(role);
    }

    if (!canWrite) {
      return res.status(403).json({
        message: "You do not have permission to edit this Story.",
      });
    }

    // Do not allow a Photo already attached to another Story
    // to be reassigned.
    if (photo.storyId && photo.storyId !== storyId) {
      return res.status(409).json({
        message: "This photo is already associated with another Story.",
      });
    }

    // Make the association idempotent.
    if (photo.storyId !== storyId) {
      const result = await prisma.photo.updateMany({
        where: {
          id: photoId,
          profileId,
          purpose: "story",
          storyId: null,
        },
        data: {
          storyId,
        },
      });

      if (result.count !== 1) {
        return res.status(409).json({
          message: "The photo could not be associated with this Story.",
        });
      }

      associationCreated = true;
    }

    const updatedStory = await prisma.story.update({
      where: { id: storyId },
      data: {
        data: `/api/photos/${photoId}`,
      },
    });

    return res.json({
      photo: {
        ...photo,
        storyId,
      },
      story: updatedStory,
    });
  } catch (error) {
    // Roll back the association if updating the Story failed.
    if (associationCreated) {
      try {
        await prisma.photo.updateMany({
          where: {
            id: photoId,
            profileId,
            storyId,
          },
          data: {
            storyId: null,
          },
        });
      } catch (cleanupError) {
        console.error(
          "[associatePhotoWithStory] Cleanup failed:",
          cleanupError
        );
      }
    }

    console.error("[associatePhotoWithStory]", error);

    return res.status(500).json({
      message: "Unable to associate photo with Story.",
    });
  }
};
module.exports = {
  associatePhotoWithStory,
  uploadPhoto,
  uploadProfilePicture,
  getPhoto,
  deletePhoto,
};
