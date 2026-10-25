const Category = require('../models/Category');
const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');

const listCategories = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const filter = includeInactive ? {} : { isActive: true };
  const categories = await Category.find(filter)
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();
  const withCounts = await Promise.all(
    categories.map(async (cat) => {
      const productCount = await Product.countDocuments({ category: cat._id, availability: { $ne: 'out_of_stock' } });
      return { ...cat, productCount };
    })
  );
  res.json({ success: true, data: withCounts });
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) {
    res.status(404);
    throw new Error('Catégorie introuvable');
  }
  res.json({ success: true, data: category });
});

const createCategory = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Image de catégorie obligatoire');
  }
  const category = await Category.create({
    name: req.body.name,
    slug: Category.toSlug(req.body.name),
    imageCloudinaryUrl: req.file.path,
    imagePublicId: req.file.filename,
    description: req.body.description || '',
    displayOrder: Number(req.body.displayOrder) || 0,
    isActive: req.body.isActive !== 'false',
  });
  res.status(201).json({ success: true, data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error('Catégorie introuvable');
  }
  if (req.file) {
    if (category.imagePublicId) await cloudinary.uploader.destroy(category.imagePublicId).catch(() => {});
    category.imageCloudinaryUrl = req.file.path;
    category.imagePublicId = req.file.filename;
  }
  if (req.body.name !== undefined) {
    category.name = req.body.name;
    category.slug = Category.toSlug(req.body.name);
  }
  if (req.body.description !== undefined) category.description = req.body.description;
  if (req.body.displayOrder !== undefined) category.displayOrder = Number(req.body.displayOrder);
  if (req.body.isActive !== undefined) category.isActive = req.body.isActive === 'true' || req.body.isActive === true;
  await category.save();
  res.json({ success: true, data: category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error('Catégorie introuvable');
  }
  const products = await Product.countDocuments({ category: category._id });
  if (products > 0) {
    res.status(400);
    throw new Error(`Impossible de supprimer : ${products} produit(s) sont rattachés à cette catégorie`);
  }
  if (category.imagePublicId) await cloudinary.uploader.destroy(category.imagePublicId).catch(() => {});
  await category.deleteOne();
  res.json({ success: true, message: 'Catégorie supprimée' });
});

const reorderCategories = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    res.status(400);
    throw new Error('Liste d’identifiants requise');
  }
  await Promise.all(
    ids.map((id, index) => Category.findByIdAndUpdate(id, { displayOrder: index }))
  );
  res.json({ success: true, message: 'Ordre mis à jour' });
});

module.exports = { listCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory, reorderCategories };
