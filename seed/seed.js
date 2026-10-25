require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const WelcomePageCMS = require('../models/WelcomePageCMS');

const toSlug = (value) =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const CATEGORIES = [
  { name: 'Mugs', order: 1 },
  { name: 'Bloc-notes', order: 2 },
  { name: 'Planners', order: 3 },
  { name: 'Marque-pages', order: 4 },
  { name: 'Duos', order: 5 },
  { name: 'Accessoires', order: 6 },
];

const PRODUCTS = [
  {
    title: 'Planner Annuel Lavande A5',
    price: 29,
    compareAtPrice: 36,
    categorySlug: 'planners',
    format: 'A5',
    binding: 'Reliure spirale',
    color: 'Lavande',
    featured: true,
    stock: 25,
    isPromo: true,
  },
  {
    title: 'Bloc-notes Doodle A6',
    price: 12.5,
    categorySlug: 'bloc-notes',
    format: 'A6',
    binding: 'Reliure agrafée',
    color: 'Blush',
    featured: true,
    stock: 40,
  },
  {
    title: 'Mug NOUR "Café créatif"',
    price: 18,
    compareAtPrice: 22,
    categorySlug: 'mugs',
    format: 'A5',
    binding: '',
    color: 'Blanc',
    featured: true,
    stock: 30,
    isPromo: true,
  },
  {
    title: 'Set Marque-pages Papier Recyclé',
    price: 6,
    categorySlug: 'marque-pages',
    format: 'Autre',
    binding: '',
    color: 'Sage',
    featured: false,
    stock: 60,
  },
  {
    title: 'Duo Planner + Stylos Gel',
    price: 39,
    categorySlug: 'duos',
    format: 'A5',
    binding: 'Reliure spirale',
    color: 'Teal',
    featured: false,
    stock: 15,
  },
  {
    title: 'Range-stylos Bureau Terracotta',
    price: 14,
    categorySlug: 'accessoires',
    format: 'Autre',
    binding: '',
    color: 'Terracotta',
    featured: false,
    stock: 20,
  },
];

async function seed() {
  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nour.tn';
  const adminPassword = process.env.ADMIN_PASSWORD || 'nour123456';
  const hashed = await bcrypt.hash(adminPassword, 10);
  await User.findOneAndUpdate(
    { email: adminEmail },
    { email: adminEmail, password: hashed, name: 'Admin NOUR', role: 'admin', phone: '+21600000000' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`Admin prêt : ${adminEmail} / ${adminPassword}`);

  const categoryMap = {};
  for (const c of CATEGORIES) {
    const slug = toSlug(c.name);
    const cat = await Category.findOneAndUpdate(
      { slug },
      {
        name: c.name,
        slug,
        imageCloudinaryUrl: `https://picsum.photos/seed/${slug}/600/600`,
        imagePublicId: `seed-${slug}`,
        description: `Collection ${c.name} NOUR`,
        displayOrder: c.order,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categoryMap[slug] = cat;
  }
  console.log(`${CATEGORIES.length} catégories prêtes`);

  for (const p of PRODUCTS) {
    const category = categoryMap[p.categorySlug];
    if (!category) continue;
    const slug = toSlug(p.title);
    await Product.findOneAndUpdate(
      { slug },
      {
        title: p.title,
        slug,
        description: `Le « ${p.title} » est une pièce de la collection NOUR, pensée avec douceur pour accompagner votre quotidien.`,
        shortDescription: `${p.format} · ${p.binding || 'Finition douce'} · ${p.color}`,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        category: category._id,
        imagesCloudinary: [
          { url: `https://picsum.photos/seed/${slug}/1200/1200`, public_id: `seed-${slug}`, alt: p.title },
        ],
        stock: p.stock,
        lowStockThreshold: 5,
        availability: p.stock > 0 ? 'in_stock' : 'out_of_stock',
        attributes: {
          format: p.format,
          binding: p.binding || 'Finition douce',
          paper: 'Papier 120g',
          weight: '120 g/m²',
          dimensions: '21 x 14.8 cm',
          colors: [p.color],
        },
        variants: [
          { name: p.color, price: p.price, stock: p.stock, attributes: { format: p.format, color: p.color } },
        ],
        isFeatured: p.featured,
        isPromo: p.isPromo === true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`${PRODUCTS.length} produits d'exemple prêts`);

  await WelcomePageCMS.findOneAndUpdate(
    {},
    {
      heroBanners: [
        {
          imageUrl: 'https://picsum.photos/seed/nour-hero-1/1600/900',
          imagePublicId: 'seed-nour-hero-1',
          title: 'Créez, organisez, rêvez.',
          subtitle: 'Planners, bloc-notes et accessoires dessinés avec douceur pour rendre chaque journée plus belle.',
          ctaText: 'Découvrir',
          ctaLink: '/catalogue',
          active: true,
          displayOrder: 0,
        },
        {
          imageUrl: 'https://picsum.photos/seed/nour-hero-2/1600/900',
          imagePublicId: 'seed-nour-hero-2',
          title: 'Des essentiels doux pour votre bureau',
          subtitle: 'Des matières recyclées, des couleurs pastel et des formats pensés pour vous.',
          ctaText: 'Explorer',
          ctaLink: '/catalogue',
          active: true,
          displayOrder: 1,
        },
      ],
      welcomeParagraph: {
        title: 'La douceur, le fil rouge de NOUR',
        highlight: 'Une papeterie pensée pour vous.',
        content:
          'NOUR est née d’une envie simple : transformer l’organisation du quotidien en un moment de plaisir. Chaque carnet, chaque mug, chaque accessoire est choisi avec soin pour apporter de la couleur, de la joie et de la créativité dans votre vie.',
      },
      promoMessage: {
        text: 'Jusqu’à -20% sur une sélection douce',
        active: true,
        link: '/catalogue?promo=true',
      },
      featuredProducts: [],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('Welcome Page CMS prête');

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
