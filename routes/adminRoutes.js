const router = require('express').Router();
const { getStats } = require('../controllers/statsController');
const { getShippingSettingsAdmin, updateShippingSettingsAdmin } = require('../controllers/settingController');
const { protect, admin } = require('../middleware/auth');

router.get('/stats', protect, admin, getStats);
router.get('/shipping-rates', protect, admin, getShippingSettingsAdmin);
router.put('/shipping-rates', protect, admin, updateShippingSettingsAdmin);

module.exports = router;
