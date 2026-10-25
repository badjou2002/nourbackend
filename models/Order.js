const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    imageUrl: String,
    variant: { name: String, attributes: Object },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerDetails: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    coupon: {
      code: String,
      percent: Number,
      amount: Number,
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'card', 'edinar'],
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cod'],
      default: 'cod',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    shippingAddress: {
      governorate: { type: String, required: true, trim: true },
      city: { type: String, trim: true },
      address: { type: String, required: true, trim: true },
      postalCode: String,
    },
    trackingNumber: String,
    notes: String,
  },
  { timestamps: true }
);

orderSchema.pre('save', function () {
  if (!this.orderNumber) {
    const seq = Date.now().toString(36).toUpperCase().slice(-6);
    this.orderNumber = `NOUR-${seq}`;
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
