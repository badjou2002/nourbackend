const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    alt: { type: String, default: '' },
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, default: 0 },
    attributes: {
      format: String,
      binding: String,
      color: String,
    },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Titre du produit obligatoire'], trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    imagesCloudinary: { type: [imageSchema], default: [] },
    stock: { type: Number, default: 0, index: true },
    lowStockThreshold: { type: Number, default: 5 },
    availability: {
      type: String,
      enum: ['in_stock', 'preorder', 'out_of_stock'],
      default: 'in_stock',
      index: true,
    },
    attributes: {
      format: { type: String, enum: ['A5', 'A6', 'A4', 'A7', 'Autre'], index: true },
      binding: { type: String, index: true },
      paper: String,
      weight: String,
      dimensions: String,
      colors: { type: [String], default: [], index: true },
    },
    variants: { type: [variantSchema], default: [] },
    isFeatured: { type: Boolean, default: false, index: true },
    isPromo: { type: Boolean, default: false, index: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.pre('validate', function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

productSchema.virtual('discountPercent').get(function () {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round((1 - this.price / this.compareAtPrice) * 100);
  }
  return 0;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
