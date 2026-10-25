const asyncHandler = require('../utils/asyncHandler');
const { getShippingSettings, updateShippingSettings } = require('../utils/tunisiaGovernorates');

const getShippingSettingsAdmin = asyncHandler(async (req, res) => {
  const settings = await getShippingSettings();
  res.json({
    success: true,
    data: {
      governorates: settings.governorates.map((g) => ({ name: g.name, shipping: g.shipping })),
      freeShippingThreshold: settings.freeShippingThreshold,
    },
  });
});

const updateShippingSettingsAdmin = asyncHandler(async (req, res) => {
  const { governorates, freeShippingThreshold } = req.body;

  if (governorates !== undefined) {
    if (!Array.isArray(governorates) || !governorates.length) {
      res.status(400);
      throw new Error('La liste des gouvernorats ne peut pas être vide');
    }
    for (const g of governorates) {
      if (!g || typeof g.name !== 'string' || !g.name.trim()) {
        res.status(400);
        throw new Error('Nom de gouvernorat invalide');
      }
      const rate = Number(g.shipping);
      if (!Number.isFinite(rate) || rate < 0) {
        res.status(400);
        throw new Error(`Frais de livraison invalides pour ${g.name}`);
      }
    }
  }

  if (freeShippingThreshold !== undefined) {
    const threshold = Number(freeShippingThreshold);
    if (!Number.isFinite(threshold) || threshold < 0) {
      res.status(400);
      throw new Error('Seuil de livraison gratuite invalide');
    }
  }

  const settings = await updateShippingSettings({ governorates, freeShippingThreshold });
  res.json({
    success: true,
    data: {
      governorates: settings.governorates.map((g) => ({ name: g.name, shipping: g.shipping })),
      freeShippingThreshold: settings.freeShippingThreshold,
    },
  });
});

module.exports = { getShippingSettingsAdmin, updateShippingSettingsAdmin };
