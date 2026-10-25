const router = require('express').Router();
const {
  listCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');

router.get('/', listCategories);
router.get('/:slug', getCategoryBySlug);
router.post('/', protect, admin, uploadSingleImage, createCategory);
router.put('/reorder', protect, admin, reorderCategories);
router.put('/:id', protect, admin, uploadSingleImage, updateCategory);
router.delete('/:id', protect, admin, deleteCategory);

module.exports = router;
