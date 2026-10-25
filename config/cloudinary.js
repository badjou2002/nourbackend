const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const getPublicId = (urlOrId) => {
  if (!urlOrId) return null;
  const parts = String(urlOrId).split('/');
  return parts[parts.length - 1].split('.')[0];
};

module.exports = cloudinary;
module.exports.getPublicId = getPublicId;
