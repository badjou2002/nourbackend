const Order = require('../models/Order');
const Product = require('../models/Product');
const PDFDocument = require('pdfkit');
const asyncHandler = require('../utils/asyncHandler');
const { computeShipping, listGovernorates, getShippingSettings } = require('../utils/tunisiaGovernorates');

const createOrder = asyncHandler(async (req, res) => {
  const { items, customerDetails, shippingAddress, paymentMethod = 'cod', coupon, notes } = req.body;

  if (!items || !Array.isArray(items) || !items.length) {
    res.status(400);
    throw new Error('Le panier est vide');
  }
  if (!customerDetails || !customerDetails.fullName || !customerDetails.phone) {
    res.status(400);
    throw new Error('Nom et téléphone obligatoires');
  }
  if (!shippingAddress || !shippingAddress.governorate || !shippingAddress.address) {
    res.status(400);
    throw new Error('Adresse de livraison incomplète');
  }

  let subtotal = 0;
  const hydratedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId || item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Produit introuvable : ${item.title || item.productId}`);
    }
    if (product.availability === 'out_of_stock' || product.stock <= 0) {
      res.status(400);
      throw new Error(`"${product.title}" n'est plus en stock`);
    }

    const quantity = Number(item.quantity) || 1;
    let unitPrice = product.price;

    if (item.variantId && product.variants.length) {
      const variant = product.variants.id(item.variantId);
      if (variant) unitPrice = variant.price;
    }
    if (product.compareAtPrice && item.option === 'compareAt') unitPrice = product.compareAtPrice;

    subtotal += unitPrice * quantity;
    hydratedItems.push({
      product: product._id,
      title: product.title,
      imageUrl: product.imagesCloudinary[0]?.url,
      variant: item.variant ? { name: item.variant.name, attributes: item.variant.attributes } : undefined,
      quantity,
      price: unitPrice,
    });
  }

  let discount = 0;
  if (coupon && coupon.percent) {
    discount = Math.round(subtotal * (Number(coupon.percent) / 100) * 100) / 100;
  } else if (coupon && coupon.amount) {
    discount = Math.min(Number(coupon.amount), subtotal);
  }

  const settings = await getShippingSettings();
  const shippingCost = computeShipping(settings, shippingAddress.governorate, subtotal - discount);
  const totalPrice = Math.max(0, subtotal - discount + shippingCost);

  const order = await Order.create({
    user: req.user ? req.user._id : undefined,
    customerDetails,
    items: hydratedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    shippingCost,
    totalPrice: Math.round(totalPrice * 100) / 100,
    coupon: coupon && (coupon.percent || coupon.amount) ? { code: coupon.code, percent: coupon.percent, amount: coupon.amount } : undefined,
    paymentMethod,
    shippingAddress,
    notes,
  });

  res.status(201).json({ success: true, data: order });
});

const getOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = status ? { status } : {};
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));
  res.json({
    success: true,
    data: orders,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: orders });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('items.product', 'title slug');
  if (!order) {
    res.status(404);
    throw new Error('Commande introuvable');
  }
  res.json({ success: true, data: order });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Commande introuvable');
  }
  const allowedTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  };
  if (status && status !== order.status && !allowedTransitions[order.status].includes(status)) {
    res.status(400);
    throw new Error(`Transition de statut impossible : ${order.status} -> ${status}`);
  }
  if (status !== undefined) order.status = status;
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  await order.save();
  res.json({ success: true, data: order });
});

const getInvoicePdf = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Commande introuvable');
  }

  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  const filename = `facture-${order.orderNumber}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  doc.fontSize(22).fillColor('#9B82C9').text('NOUR', { align: 'left' });
  doc.fontSize(10).fillColor('#2D2D2D').text('Papeterie créative & douce', { align: 'left' });
  doc.moveTo(48, 90).lineTo(552, 90).strokeColor('#EBB5C2').lineWidth(2).stroke();

  doc.fontSize(16).fillColor('#2D2D2D').text(`FACTURE ${order.orderNumber}`, { align: 'right' });
  doc.fontSize(10).fillColor('#555555').text(`Date : ${order.createdAt.toLocaleDateString('fr-FR')}`, { align: 'right' });

  doc.moveDown(2);
  doc.fontSize(12).fillColor('#7C63AE').text('Client');
  doc.fontSize(10).fillColor('#2D2D2D').text(order.customerDetails.fullName);
  doc.text(`${order.shippingAddress.address}, ${order.shippingAddress.city || ''} ${order.shippingAddress.governorate}`);
  doc.text(`Tél : ${order.customerDetails.phone}`);

  doc.moveDown(2);
  const startY = doc.y;
  doc.fontSize(12).fillColor('#7C63AE').text('Articles', { width: 500 });
  doc.moveDown(0.5);

  doc.fontSize(9).fillColor('#888888');
  doc.text('Produit', 48, doc.y);
  doc.text('Qté', 380, doc.y);
  doc.text('Prix', 440, doc.y);
  doc.text('Total', 500, doc.y);
  doc.moveDown(0.3);
  doc.moveTo(48, doc.y).lineTo(552, doc.y).strokeColor('#E0E0E0').stroke();
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor('#2D2D2D');
  for (const item of order.items) {
    const variantLabel = item.variant?.name ? ` (${item.variant.name})` : '';
    doc.text(`${item.title}${variantLabel}`, 48, doc.y, { width: 320 });
    doc.text(String(item.quantity), 380, doc.y);
    doc.text(`${item.price.toFixed(2)} DT`, 440, doc.y);
    doc.text(`${(item.price * item.quantity).toFixed(2)} DT`, 500, doc.y);
    doc.moveDown(0.6);
  }

  doc.moveDown(1);
  doc.moveTo(400, doc.y).lineTo(552, doc.y).strokeColor('#E0E0E0').stroke();
  doc.moveDown(0.6);
  doc.fontSize(10).fillColor('#2D2D2D');
  doc.text(`Sous-total : ${order.subtotal.toFixed(2)} DT`, 400, doc.y, { width: 152, align: 'right' });
  if (order.discount > 0) {
    doc.moveDown(0.4);
    doc.text(`Remise : -${order.discount.toFixed(2)} DT`, 400, doc.y, { width: 152, align: 'right' });
  }
  doc.moveDown(0.4);
  doc.text(`Livraison : ${order.shippingCost.toFixed(2)} DT`, 400, doc.y, { width: 152, align: 'right' });
  doc.moveDown(0.6);
  doc.fontSize(14).fillColor('#1F9BA3').text(`Total : ${order.totalPrice.toFixed(2)} DT`, 400, doc.y, { width: 152, align: 'right' });
  doc.moveDown(1.5);
  doc.fontSize(9).fillColor('#9B82C9').text(`Paiement : ${order.paymentMethod === 'cod' ? 'à la livraison' : order.paymentMethod} | Statut : ${order.status}`, 48, doc.y);

  doc.end();
});

const getShippingRates = asyncHandler(async (req, res) => {
  const settings = await getShippingSettings();
  res.json({
    success: true,
    data: { governorates: listGovernorates(settings), freeShippingThreshold: settings.freeShippingThreshold },
  });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Commande introuvable');
  }
  const isOwner = order.user && String(order.user) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Vous ne pouvez pas annuler cette commande');
  }
  if (!['pending', 'confirmed'].includes(order.status)) {
    res.status(400);
    throw new Error(`Une commande « ${order.status} » ne peut plus être annulée`);
  }
  order.status = 'cancelled';
  await order.save();
  res.json({ success: true, data: order });
});

module.exports = { createOrder, getOrders, getMyOrders, getOrderById, updateOrderStatus, getInvoicePdf, getShippingRates, cancelOrder };
