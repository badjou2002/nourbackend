const mongoose = require('mongoose');

const governorateRateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shipping: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'shipping' },
    governorates: { type: [governorateRateSchema], default: [] },
    freeShippingThreshold: { type: Number, default: 150, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
