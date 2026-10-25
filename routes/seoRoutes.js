const router = require('express').Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (character) => {
    const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
    return entities[character];
  });

router.get('/robots.txt', (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin/',
      'Disallow: /checkout',
      'Disallow: /compte',
      `Sitemap: ${baseUrl}/sitemap.xml`,
      '',
    ].join('\n')
  );
});

router.get(
  '/sitemap.xml',
  asyncHandler(async (req, res) => {
    const [products, categories] = await Promise.all([
      Product.find({}, 'slug updatedAt').sort({ updatedAt: -1 }).lean(),
      Category.find({ isActive: true }, 'slug updatedAt').sort({ updatedAt: -1 }).lean(),
    ]);
    const baseUrl = getBaseUrl(req);
    const urls = [
      { path: '/', lastmod: null },
      { path: '/catalogue', lastmod: null },
      ...categories.map((category) => ({
        path: `/catalogue?category=${encodeURIComponent(category.slug)}`,
        lastmod: category.updatedAt,
      })),
      ...products.map((product) => ({
        path: `/produit/${encodeURIComponent(product.slug)}`,
        lastmod: product.updatedAt,
      })),
    ];
    const entries = urls
      .map(
        ({ path, lastmod }) =>
          `  <url><loc>${escapeXml(new URL(path, baseUrl).href)}</loc>${
            lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''
          }</url>`
      )
      .join('\n');

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`
    );
  })
);

module.exports = router;
