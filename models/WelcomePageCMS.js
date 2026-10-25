const mongoose = require('mongoose');

const heroBannerSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    ctaText: { type: String, default: 'Découvrir' },
    ctaLink: { type: String, default: '/catalogue' },
    active: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const welcomePageSchema = new mongoose.Schema(
  {
    heroBanners: { type: [heroBannerSchema], default: [] },
    welcomeParagraph: {
      title: { type: String, default: '' },
      highlight: { type: String, default: '' },
      content: { type: String, default: '' },
    },
    promoMessage: {
      text: { type: String, default: '' },
      active: { type: Boolean, default: false },
      link: { type: String, default: '/catalogue' },
    },
    featuredProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

welcomePageSchema.statics.getSingleton = async function () {
  return this.findOne().sort({ version: -1 });
};

const WelcomePageCMS = mongoose.model('WelcomePageCMS', welcomePageSchema);

module.exports = WelcomePageCMS;
