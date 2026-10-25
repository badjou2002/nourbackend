const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const getStats = asyncHandler(async (req, res) => {
  const [revenueAgg, ordersByStatus, topProducts, categorySales, dailySales, lowStockProducts, totalCustomers, totalProducts, recentOrders] =
    await Promise.all([
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalPrice' },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: '$totalPrice' },
          },
        },
      ]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            title: { $first: '$items.title' },
            imageUrl: { $first: '$items.imageUrl' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$category.name', 'Non catégorisé'] },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            quantity: { $sum: '$items.quantity' },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $ne: 'cancelled' },
            createdAt: { $gte: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalPrice' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Product.find({ $expr: { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', 5] }] } })
        .populate('category', 'name')
        .sort({ stock: 1 })
        .limit(8),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(6),
    ]);

  const summary = revenueAgg[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };
  const statusMap = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
  ordersByStatus.forEach((s) => {
    if (statusMap[s._id] !== undefined) statusMap[s._id] = s.count;
  });

  res.json({
    success: true,
    data: {
      summary: {
        totalRevenue: Math.round(summary.totalRevenue * 100) / 100,
        totalOrders: summary.totalOrders,
        averageOrderValue: Math.round(summary.averageOrderValue * 100) / 100,
        totalCustomers,
        totalProducts,
      },
      ordersByStatus: statusMap,
      topProducts,
      categorySales,
      dailySales,
      lowStockProducts,
      recentOrders,
    },
  });
});

module.exports = { getStats };
