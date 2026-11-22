const extractPhotoId = (value) => {
  if (typeof value !== "string") return null;

  const match = value.match(
    /\/photos\/([a-f\d]{24})(?:[/?#]|$)/i
  );

  return match ? match[1] : null;
};
module.exports = extractPhotoId