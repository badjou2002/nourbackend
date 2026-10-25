const upload = require('../config/multer');

const uploadSingleImage = upload.single('image');

const uploadMultipleImages = upload.array('images', 10);

module.exports = { upload, uploadSingleImage, uploadMultipleImages };
