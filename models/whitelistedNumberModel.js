const mongoose = require('mongoose');

// Numbers allowed to receive a cancel-order OTP — managed from the frontend
// Admin page. `phone` is stored already normalized (see utils/normalizePhone)
// so lookups during OTP request don't need to worry about formatting.
const whitelistedNumberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const WhitelistedNumber = mongoose.model('WhitelistedNumber', whitelistedNumberSchema);

module.exports = { WhitelistedNumber };
