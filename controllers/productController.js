const Product = require('../models/Product');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');

const toSlug = (value) =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug }).populate('category', 'name slug');
  if (!product) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  res.json({ success: true, data: product });
});

const getSimilarProducts = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug }).select('title description shortDescription category');
  if (!product) {
    res.status(404);
    throw new Error('Produit introuvable');
  }

  const getTerms = (value, limit) =>
    [...new Set(
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .match(/[a-z0-9]{4,}/g) || []
    )].slice(0, limit);

  const nameTerms = getTerms(product.title, 8);
  const descriptionTerms = getTerms(`${product.shortDescription} ${product.description}`, 12);
  const textConditions = [...nameTerms, ...descriptionTerms].map((term) => {
    const regex = new RegExp(term, 'i');
    return { $or: [{ title: regex }, { shortDescription: regex }, { description: regex }] };
  });
  const [textCandidates, categoryCandidates] = await Promise.all([
    textConditions.length
      ? Product.find({
          _id: { $ne: product._id },
          $or: textConditions,
        })
          .populate('category', 'name slug')
          .sort({ createdAt: -1 })
          .limit(50)
      : Promise.resolve([]),
    Product.find({
      _id: { $ne: product._id },
      category: product.category,
    })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(50),
  ]);
  const candidates = [
    ...new Map(
      [...textCandidates, ...categoryCandidates].map((candidate) => [String(candidate._id), candidate])
    ).values(),
  ];

  const nameTermSet = new Set(nameTerms);
  const descriptionTermSet = new Set(descriptionTerms);
  const getMatchingTerms = (value, terms) => {
    const candidateTerms = new Set(getTerms(value, 100));
    return [...terms].filter((term) => candidateTerms.has(term)).length;
  };
  const rankedCandidates = candidates
    .map((candidate) => ({
      candidate,
      nameMatches: getMatchingTerms(candidate.title, nameTermSet),
      descriptionMatches: getMatchingTerms(
        `${candidate.shortDescription} ${candidate.description}`,
        descriptionTermSet
      ),
      sameCategory: String(candidate.category?._id) === String(product.category) ? 1 : 0,
    }))
    .sort(
      (a, b) =>
        b.nameMatches - a.nameMatches ||
        b.descriptionMatches - a.descriptionMatches ||
        b.sameCategory - a.sameCategory
    )
    .slice(0, 4)
    .map(({ candidate }) => candidate);

  res.json({ success: true, data: rankedCandidates });
});

const getProductById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  res.json({ success: true, data: product });
});

const createProduct = asyncHandler(async (req, res) => {
  const images = (req.files || []).map((file) => ({
    url: file.path,
    public_id: file.filename,
    alt: req.body.title || '',
  }));

  const parsed = {
    title: req.body.title,
    description: req.body.description,
    shortDescription: req.body.shortDescription || '',
    price: Number(req.body.price),
    compareAtPrice: req.body.compareAtPrice ? Number(req.body.compareAtPrice) : undefined,
    category: req.body.category,
    imagesCloudinary: images,
    stock: Number(req.body.stock) || 0,
    lowStockThreshold: Number(req.body.lowStockThreshold) || 5,
    availability: req.body.availability || 'in_stock',
    attributes: {
      format: req.body.format,
      binding: req.body.binding,
      paper: req.body.paper,
      weight: req.body.weight,
      dimensions: req.body.dimensions,
      colors: req.body.colors ? JSON.parse(req.body.colors) : [],
    },
    variants: req.body.variants ? JSON.parse(req.body.variants) : [],
    isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true,
    isPromo: req.body.isPromo === 'true' || req.body.isPromo === true,
    slug: toSlug(req.body.title),
  };

  const product = await Product.create(parsed);
  res.status(201).json({ success: true, data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Produit introuvable');
  }

  if (req.body.imagesToDelete) {
    const publicIds = String(req.body.imagesToDelete).split(',');
    for (const publicId of publicIds) {
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }
    product.imagesCloudinary = product.imagesCloudinary.filter((img) => !publicIds.includes(img.public_id));
  }

  const fields = ['title', 'description', 'shortDescription', 'compareAtPrice', 'stock', 'lowStockThreshold', 'availability', 'isFeatured', 'isPromo'];
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      if (field === 'isFeatured' || field === 'isPromo') product[field] = req.body[field] === 'true' || req.body[field] === true;
      else if (field === 'price') continue;
      else product[field] = req.body[field];
    }
  }
  if (req.body.price !== undefined) product.price = Number(req.body.price);
  if (req.body.category !== undefined) product.category = req.body.category;
  if (req.body.title !== undefined) product.slug = toSlug(req.body.title);

  if (req.body.format !== undefined || req.body.binding !== undefined || req.body.paper !== undefined || req.body.weight !== undefined || req.body.dimensions !== undefined || req.body.colors !== undefined) {
    product.attributes = {
      format: req.body.format ?? product.attributes.format,
      binding: req.body.binding ?? product.attributes.binding,
      paper: req.body.paper ?? product.attributes.paper,
      weight: req.body.weight ?? product.attributes.weight,
      dimensions: req.body.dimensions ?? product.attributes.dimensions,
      colors: req.body.colors ? JSON.parse(req.body.colors) : product.attributes.colors,
    };
  }
  if (req.body.variants !== undefined) product.variants = JSON.parse(req.body.variants);

  if (req.files && req.files.length) {
    const newImages = req.files.map((file) => ({ url: file.path, public_id: file.filename, alt: product.title }));
    product.imagesCloudinary = [...product.imagesCloudinary, ...newImages];
  }

  await product.save();
  res.json({ success: true, data: product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  for (const image of product.imagesCloudinary) {
    await cloudinary.uploader.destroy(image.public_id).catch(() => {});
  }
  await product.deleteOne();
  res.json({ success: true, message: 'Produit supprimé' });
});

const updateStock = asyncHandler(async (req, res) => {
  const { stock, availability } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  if (stock !== undefined) product.stock = Number(stock);
  if (availability !== undefined) product.availability = availability;
  if (product.stock <= 0) product.availability = 'out_of_stock';
  else if (product.availability === 'out_of_stock') product.availability = 'in_stock';
  await product.save();
  res.json({ success: true, data: product });
});

const listAdminProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, q, category } = req.query;
  const query = {};
  if (q) query.title = { $regex: q, $options: 'i' };
  if (category) query.category = category;
  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  res.json({
    success: true,
    data: products,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});

module.exports = {
  getProductBySlug,
  getSimilarProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  listAdminProducts,
};
