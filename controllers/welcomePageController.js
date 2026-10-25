const WelcomePageCMS = require('../models/WelcomePageCMS');
const Product = require('../models/Product');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');

const getWelcomePage = asyncHandler(async (req, res) => {
  let cms = await WelcomePageCMS.getSingleton();
  if (!cms) {
    cms = await WelcomePageCMS.create({
      heroBanners: [],
      welcomeParagraph: { title: '', highlight: '', content: '' },
      promoMessage: { text: '', active: false },
      featuredProducts: [],
    });
  }
  await cms.populate('featuredProducts');
  const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 }).limit(6);
  res.json({ success: true, data: { ...cms.toObject(), categories } });
});

const updateWelcomePage = asyncHandler(async (req, res) => {
  let cms = await WelcomePageCMS.getSingleton();
  if (!cms) cms = new WelcomePageCMS();

  const { heroBanners, welcomeParagraph, promoMessage, featuredProducts } = req.body;

  if (heroBanners !== undefined) cms.heroBanners = heroBanners;
  if (welcomeParagraph !== undefined) cms.welcomeParagraph = { ...cms.welcomeParagraph, ...welcomeParagraph };
  if (promoMessage !== undefined) cms.promoMessage = { ...cms.promoMessage, ...promoMessage };
  if (featuredProducts !== undefined) cms.featuredProducts = featuredProducts;

  cms.version = (cms.version || 0) + 1;
  const saved = await cms.save();
  res.json({ success: true, data: saved });
});

const addHeroBanner = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Image de bannière obligatoire');
  }
  let cms = await WelcomePageCMS.getSingleton();
  if (!cms) cms = new WelcomePageCMS();

  cms.heroBanners.push({
    imageUrl: req.file.path,
    imagePublicId: req.file.filename,
    title: req.body.title || '',
    subtitle: req.body.subtitle || '',
    ctaText: req.body.ctaText || 'Découvrir',
    ctaLink: req.body.ctaLink || '/catalogue',
    active: req.body.active === 'true' || req.body.active === undefined || req.body.active === true,
    displayOrder: Number(req.body.displayOrder) || cms.heroBanners.length,
  });
  cms.version = (cms.version || 0) + 1;
  await cms.save();
  res.status(201).json({ success: true, data: cms });
});

const updateHeroBanner = asyncHandler(async (req, res) => {
  let cms = await WelcomePageCMS.getSingleton();
  if (!cms) {
    res.status(404);
    throw new Error('Welcome Page non initialisée');
  }
  const banner = cms.heroBanners.id(req.params.id);
  if (!banner) {
    res.status(404);
    throw new Error('Bannière introuvable');
  }

  if (req.file) {
    if (banner.imagePublicId) await cloudinary.uploader.destroy(banner.imagePublicId).catch(() => {});
    banner.imageUrl = req.file.path;
    banner.imagePublicId = req.file.filename;
  }
  const { title, subtitle, ctaText, ctaLink, active, displayOrder } = req.body;
  if (title !== undefined) banner.title = title;
  if (subtitle !== undefined) banner.subtitle = subtitle;
  if (ctaText !== undefined) banner.ctaText = ctaText;
  if (ctaLink !== undefined) banner.ctaLink = ctaLink;
  if (active !== undefined) banner.active = active === 'true' || active === true;
  if (displayOrder !== undefined) banner.displayOrder = Number(displayOrder);

  cms.version = (cms.version || 0) + 1;
  await cms.save();
  res.json({ success: true, data: cms });
});

const removeHeroBanner = asyncHandler(async (req, res) => {
  let cms = await WelcomePageCMS.getSingleton();
  if (!cms) {
    res.status(404);
    throw new Error('Welcome Page non initialisée');
  }
  const banner = cms.heroBanners.id(req.params.id);
  if (!banner) {
    res.status(404);
    throw new Error('Bannière introuvable');
  }
  if (banner.imagePublicId) await cloudinary.uploader.destroy(banner.imagePublicId).catch(() => {});
  banner.deleteOne();
  cms.version = (cms.version || 0) + 1;
  await cms.save();
  res.json({ success: true, data: cms });
});

const getFeaturedProducts = asyncHandler(async (req, res) => {
  const cms = await WelcomePageCMS.getSingleton();
  let products;
  if (cms && cms.featuredProducts.length) {
    const found = await Product.find({ _id: { $in: cms.featuredProducts }, availability: { $ne: 'out_of_stock' } })
      .populate('category', 'name slug');
    const orderMap = new Map(cms.featuredProducts.map((id, index) => [String(id), index]));
    products = found.sort((a, b) => orderMap.get(String(a._id)) - orderMap.get(String(b._id)));
  } else {
    products = await Product.find({ isFeatured: true, availability: { $ne: 'out_of_stock' } })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(8);
  }
  res.json({ success: true, data: products });
});

module.exports = { getWelcomePage, updateWelcomePage, addHeroBanner, updateHeroBanner, removeHeroBanner, getFeaturedProducts };
