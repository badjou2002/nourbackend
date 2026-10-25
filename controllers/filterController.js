const Product = require('../models/Product');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');

const SORT_OPTIONS = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  newest: { createdAt: -1 },
  popular: { numReviews: -1, rating: -1 },
  rating: { rating: -1 },
  relevance: { _id: -1 },
};

const buildQuery = (req) => {
  const { q, category, minPrice, maxPrice, formats, bindings, colors, availability, featured, promo } = req.query;
  const query = {};

  if (q) {
    const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: regex }, { shortDescription: regex }, { description: regex }];
  }

  if (category) {
    query.category = { $in: String(category).split(',') };
  }

  const priceFilter = {};
  if (minPrice !== undefined && minPrice !== '') priceFilter.$gte = Number(minPrice);
  if (maxPrice !== undefined && maxPrice !== '') priceFilter.$lte = Number(maxPrice);
  if (Object.keys(priceFilter).length) query.price = priceFilter;

  if (formats) query['attributes.format'] = { $in: String(formats).split(',') };
  if (bindings) query['attributes.binding'] = { $in: String(bindings).split(',') };
  if (colors) query['attributes.colors'] = { $in: String(colors).split(',') };

  if (availability) {
    if (availability === 'in_stock') query.stock = { $gt: 0 };
    else if (availability === 'preorder') query.availability = 'preorder';
  }

  if (featured === 'true') query.isFeatured = true;
  if (promo === 'true') query.isPromo = true;

  return query;
};

const searchProducts = asyncHandler(async (req, res) => {
  const { sort, page = 1, limit = 12 } = req.query;
  const query = buildQuery(req);

  if (req.query.category) {
    const slugs = String(req.query.category).split(',');
    const categories = await Category.find({ slug: { $in: slugs } }).select('_id');
    query.category = { $in: categories.map((c) => c._id) };
  }

  const sortBy = SORT_OPTIONS[sort] || SORT_OPTIONS.newest;
  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name slug')
    .sort(sortBy)
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({
    success: true,
    data: products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

const getFilterOptions = asyncHandler(async (req, res) => {
  const [categories, aggregates] = await Promise.all([
    Category.find({ isActive: true }).sort({ displayOrder: 1 }).select('name slug imageCloudinaryUrl description').lean(),
    Product.aggregate([
      { $match: { availability: { $ne: 'out_of_stock' } } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          formats: { $addToSet: '$attributes.format' },
          bindings: { $addToSet: '$attributes.binding' },
          colors: { $addToSet: { $ifNull: ['$attributes.colors', []] } },
          productCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const opts = aggregates[0] || {};

  res.json({
    success: true,
    data: {
      categories,
      minPrice: Math.floor(opts.minPrice || 0),
      maxPrice: Math.ceil(opts.maxPrice || 150),
      formats: (opts.formats || []).filter(Boolean).sort(),
      bindings: (opts.bindings || []).filter(Boolean).sort(),
      colors: [...new Set((opts.colors || []).flat())].filter(Boolean),
      productCount: opts.productCount || 0,
    },
  });
});

const autocomplete = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ success: true, data: [] });

  const suggestions = await Product.find(
    { title: { $regex: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, availability: { $ne: 'out_of_stock' } },
    { title: 1, price: 1, slug: 1, 'imagesCloudinary.url': 1, category: 1 }
  )
    .populate('category', 'name slug')
    .limit(8);

  res.json({ success: true, data: suggestions });
});

const getBestSellers = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 8;
  const products = await Product.find({ availability: { $ne: 'out_of_stock' }, numReviews: { $gt: 0 } })
    .populate('category', 'name slug')
    .sort({ numReviews: -1, rating: -1, salesCount: -1 })
    .limit(limit);
  res.json({ success: true, data: products });
});

module.exports = { searchProducts, getFilterOptions, autocomplete, getBestSellers, buildQuery };
