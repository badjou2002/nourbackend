const router = require('express').Router();
const {
  getWelcomePage,
  updateWelcomePage,
  addHeroBanner,
  updateHeroBanner,
  removeHeroBanner,
  getFeaturedProducts,
} = require('../controllers/welcomePageController');
const { protect, admin } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');

router.get('/', getWelcomePage);
router.get('/featured', getFeaturedProducts);
router.put('/', protect, admin, updateWelcomePage);
router.post('/banners', protect, admin, uploadSingleImage, addHeroBanner);
router.put('/banners/:id', protect, admin, uploadSingleImage, updateHeroBanner);
router.delete('/banners/:id', protect, admin, removeHeroBanner);

module.exports = router;
