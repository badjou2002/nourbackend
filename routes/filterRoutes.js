const router = require('express').Router();
const { searchProducts, getFilterOptions, autocomplete, getBestSellers } = require('../controllers/filterController');

router.get('/', searchProducts);
router.get('/options', getFilterOptions);
router.get('/autocomplete', autocomplete);
router.get('/best-sellers', getBestSellers);

module.exports = router;
