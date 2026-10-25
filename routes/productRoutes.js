const router = require('express').Router();
const {
  getProductBySlug,
  getSimilarProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  listAdminProducts,
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/auth');
const { uploadMultipleImages } = require('../middleware/upload');
const { searchProducts } = require('../controllers/filterController');

router.get('/', searchProducts);
router.get('/admin', listAdminProducts);
router.get('/similar/:slug', getSimilarProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProductById);
router.post('/', protect, admin, uploadMultipleImages, createProduct);
router.put('/:id', protect, admin, uploadMultipleImages, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);
router.patch('/:id/stock', protect, admin, updateStock);

module.exports = router;
