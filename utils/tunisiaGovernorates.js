const Setting = require('../models/Setting');

const DEFAULT_GOVERNORATES = [
  { name: 'Tunis', shipping: 6 },
  { name: 'Ariana', shipping: 6 },
  { name: 'Ben Arous', shipping: 6 },
  { name: 'Manouba', shipping: 6 },
  { name: 'Nabeul', shipping: 7 },
  { name: 'Bizerte', shipping: 7 },
  { name: 'Zaghouan', shipping: 7 },
  { name: 'Sousse', shipping: 7 },
  { name: 'Monastir', shipping: 7 },
  { name: 'Mahdia', shipping: 7 },
  { name: 'Sfax', shipping: 8 },
  { name: 'Kairouan', shipping: 8 },
  { name: 'Kasserine', shipping: 9 },
  { name: 'Sidi Bouzid', shipping: 9 },
  { name: 'Gabes', shipping: 9 },
  { name: 'Medenine', shipping: 10 },
  { name: 'Tataouine', shipping: 10 },
  { name: 'Gafsa', shipping: 9 },
  { name: 'Tozeur', shipping: 10 },
  { name: 'Kebili', shipping: 10 },
  { name: 'Siliana', shipping: 8 },
  { name: 'Beja', shipping: 8 },
  { name: 'Jendouba', shipping: 8 },
  { name: 'El Kef', shipping: 8 },
];

const DEFAULT_FREE_SHIPPING_THRESHOLD = 150;

const getShippingSettings = async () => {
  let settings = await Setting.findOne({ key: 'shipping' });
  if (!settings) {
    settings = await Setting.create({
      key: 'shipping',
      governorates: DEFAULT_GOVERNORATES,
      freeShippingThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
    });
  }
  return settings;
};

const updateShippingSettings = async ({ governorates, freeShippingThreshold }) => {
  const settings = await getShippingSettings();
  if (Array.isArray(governorates)) {
    settings.governorates = governorates.map((g) => ({ name: String(g.name).trim(), shipping: Number(g.shipping) }));
  }
  if (freeShippingThreshold !== undefined) {
    settings.freeShippingThreshold = Number(freeShippingThreshold);
  }
  await settings.save();
  return settings;
};

const listGovernorates = (settings) =>
  (settings?.governorates || []).map((g) => ({ name: g.name, shipping: g.shipping }));

const computeShipping = (settings, governorateName, subtotal) => {
  const threshold = settings ? settings.freeShippingThreshold : DEFAULT_FREE_SHIPPING_THRESHOLD;
  if (subtotal >= threshold) return 0;
  const list = settings ? settings.governorates : DEFAULT_GOVERNORATES;
  const gov = list.find((g) => g.name.toLowerCase() === String(governorateName || '').toLowerCase());
  return gov ? gov.shipping : 12;
};

module.exports = {
  DEFAULT_GOVERNORATES,
  DEFAULT_FREE_SHIPPING_THRESHOLD,
  getShippingSettings,
  updateShippingSettings,
  listGovernorates,
  computeShipping,
};
