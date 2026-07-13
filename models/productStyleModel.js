const mongoose = require('mongoose');

const productStyleSchema = new mongoose.Schema(
  {
    style_number: { type: String, required: true, unique: true, trim: true, index: true },
    images: { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('ProductStyle', productStyleSchema);
