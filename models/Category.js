const mongoose = require('mongoose');

const toSlug = (value) =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Nom de catégorie obligatoire'], trim: true, unique: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    imageCloudinaryUrl: { type: String, required: [true, 'Image de catégorie obligatoire'] },
    imagePublicId: { type: String },
    description: { type: String, default: '' },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.pre('validate', function () {
  if (!this.slug && this.name) this.slug = toSlug(this.name);
});

categorySchema.statics.toSlug = toSlug;

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
