const mongoose = require('mongoose');

const unmatchedScanSchema = new mongoose.Schema(
  {
    scanned_id: { type: String, required: true, trim: true, unique: true, index: true },
    channel: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('UnmatchedScan', unmatchedScanSchema);
