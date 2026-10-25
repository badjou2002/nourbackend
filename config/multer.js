const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const buildPublicId = (originalname) => {
  const base = originalname.split('.')[0].replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
  return `${Date.now()}-${base}`;
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: process.env.CLOUDINARY_FOLDER || 'nour',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
    transformation: [{ width: 1400, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
    public_id: buildPublicId(file.originalname),
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seuls les fichiers image sont acceptés (jpg, png, webp, gif)'), false);
  },
});

module.exports = upload;
