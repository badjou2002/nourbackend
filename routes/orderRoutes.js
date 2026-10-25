const router = require('express').Router();
const {
  createOrder,
  getOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getInvoicePdf,
  getShippingRates,
  cancelOrder,
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');

router.get('/shipping-rates', getShippingRates);
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.get('/:id/invoice', protect, admin, getInvoicePdf);
router.get('/', protect, admin, getOrders);
router.patch('/:id/status', protect, admin, updateOrderStatus);
router.patch('/:id/cancel', protect, cancelOrder);

module.exports = router;
